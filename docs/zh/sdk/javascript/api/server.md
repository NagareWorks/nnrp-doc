# JavaScript/TypeScript Server API

Server API 位于 `@nnrp/native-server`。Browser package 不暴露 server entrypoint。

## `openBackendRuntime`

创建 native backend runtime，但不立即启动 listener。

| 参数      | 类型                                                      | 必填 | 说明                                                             |
| --------- | --------------------------------------------------------- | ---: | ---------------------------------------------------------------- |
| `options` | [`NnrpBackendRuntimeOptions`](#nnrpbackendruntimeoptions) |   否 | Transport policy、已安装 transport provider 与可选 FFI binding。 |

| 返回                          |
| ----------------------------- |
| `Promise<NnrpBackendRuntime>` |

```ts
import { openBackendRuntime } from "@nnrp/native-server";
import { createTcpTransportProvider } from "@nnrp/transport-tcp";

const runtime = await openBackendRuntime({
  transportPolicy: "force-tcp",
  transports: [createTcpTransportProvider()],
});
```

## `NnrpBackendRuntime.listen`

创建一个逻辑 backend server listener。该逻辑 listener 拥有 transport policy 与已安装 Provider
允许的所有 eligible carrier listener。

| 参数      | 类型                                      | 必填 | 说明                                                             |
| --------- | ----------------------------------------- | ---: | ---------------------------------------------------------------- |
| `options` | [`NnrpListenOptions`](#nnrplistenoptions) |   是 | 本地 endpoint、可选 transport policy 与可选 transport provider。 |

| 返回         |
| ------------ |
| `NnrpServer` |

```ts
const server = runtime.listen({
  endpoint: "nnrp://0.0.0.0:4433",
  providerRoutes: {
    ipc: { endpoint: "unix:///run/nnrp.sock" },
    websocket: {
      endpoint: "wss://0.0.0.0:8443/nnrp",
      security: { mode: "server", certificateDer, privateKeyPkcs8Der },
    },
  },
});
```

`force-*` 只打开被强制指定且 eligible 的 carrier listener。`auto` 与 `prefer-*` 打开所有 eligible
carrier listener；preference 仅在多个 session 同时可接受时提供稳定顺序，不会禁用其他
listener。Server 不会伪造 peer probe 数据，实际 carrier 由发起连接的 peer 选择。

Listener set 必须原子打开。如果任一已配置的 eligible listener 打开失败，runtime 必须关闭本次调用
已经打开的 listener，并让首次 `accept()` 失败。无法从 `endpoint` 推导 bind locator 的 carrier 必须在
`providerRoutes` 中提供对应项，不得静默忽略。

`sessionDefaults` 为每个 accepted session 冻结与 transport 无关的协商、缓存、credit、schema、恢复
和应用准入设置。应用 policy 对每个 wire-valid `SESSION_OPEN` 只评估一次，并且可以异步完成：

```ts
const server = runtime.listen({
  endpoint: "nnrp://0.0.0.0:4433",
  sessionDefaults: {
    applicationPolicy: {
      async evaluate(open) {
        if (open.maxInFlightOperations > 32) {
          return {
            accepted: false,
            sessionErrorCode: 17,
            diagnostic: "requested concurrency is too high",
          };
        }
        return { accepted: true, sessionErrorCode: 0 };
      },
    },
  },
});
```

Policy 接收 [`NnrpSessionOpenMetadata`](./core#数据类型)，返回
`Promise<NnrpServerSessionPolicyDecision>`。拒绝只影响该 peer handshake，不会关闭逻辑 listener set。

## `NnrpBackendRuntime.selectTransport`

根据 peer manifest 选择 transport。

| 参数      | 类型                                                              | 必填 | 说明                                                                               |
| --------- | ----------------------------------------------------------------- | ---: | ---------------------------------------------------------------------------------- |
| `options` | [`NnrpTransportSelectionOptions`](#nnrptransportselectionoptions) |   是 | Peer manifest、workload limit、providers、policy、readiness 与 probe observation。 |

| 返回                            |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

## Runtime、Listener 与 Session 生命周期

| 方法                                   | 参数                                                              | 返回值                       | 说明                                                    |
| -------------------------------------- | ----------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------- |
| `NnrpBackendRuntime.close()`           | 无                                                                | `Promise<void>`              | 关闭 accepted session、listener 与显式 FFI seam。       |
| `NnrpServer.accept(options?)`          | [`options?: NnrpServerAcceptOptions`](#nnrpserveracceptoptions)   | `Promise<NnrpServerSession>` | 接受 owned carrier-listener set 的下一个 session。      |
| `NnrpServer.close()`                   | 无                                                                | `Promise<void>`              | 关闭全部 owned carrier listener 与 accepted session。   |
| `NnrpServerSession.nextEvent(options?)` | [`options?: NnrpEventPollOptions`](./client#nnrpeventpolloptions) | `Promise<NnrpServerEvent>` | 读取下一条有序 submit、runtime 或 lifecycle event。 |
| `NnrpServerSession.receiveSubmit(options?)` | [`options?: NnrpEventPollOptions`](./client#nnrpeventpolloptions) | `Promise<NnrpServerOperation>` | 选择下一条 submit，并保留跳过的事件。 |
| `NnrpServerSession.close()`            | 无                                                                | `Promise<void>`              | 只关闭一次 accepted role session。                      |

`NnrpServerSession.activeTransport` 是实际接受 carrier 的 listener 对应的
`NnrpTransportKind`。它必须与协商得到的 active transport 一致，不能从 listener preference 顺序推断。

`NnrpServer.boundProviderEndpoints` 是按 `NnrpTransportKind` 索引的 readonly partial
record，保存每个已打开 listener 的实际 endpoint。Provider listener 的致命失败会让逻辑 server
失败并关闭其余 listener set；被拒绝的 peer handshake 只影响该 accepted carrier。

## Server Event 与 Operation 回复

`NnrpServerSession.nextEvent(options?)` 返回闭合的 `NnrpServerEvent` tagged union。`submit` variant
持有 `NnrpServerOperation`，`runtime` variant 持有非 submit `NnrpRuntimeEvent`，`lifecycle`
variant 持有不带 header 的 `NnrpOperationLifecycleEvent`。`receiveSubmit(options?)` 是选择性接口，
但会为后续 event-pump 读取保留所有跳过的事件。

返回的 operation 持有所有 operation-scoped 回复：

| 方法 | Message | Metadata | 可选 tail |
| --- | --- | --- | --- |
| `sendResult(metadata, body?)` | `ResultPush` | `NnrpResultPushMetadata` | result body |
| `sendResultDrop(metadata, diagnostic?)` | `ResultDropReason` | `ResultDropReasonMetadata` | diagnostic bytes |
| `sendProgress(metadata, body?)` | `Progress` | [`ProgressMetadata`](./runtime#运行时控制-metadata) | progress body |
| `sendPartialResult(metadata, body?)` | `PartialResult` | `PartialResultMetadata` | inline partial result |

四个方法都返回 `Promise<void>`。operation 会校验所属 session 和 `operationId`，并且只允许一个终态方法成功。
`NnrpServerSession` 不暴露任何并行的 operation 回复方法。

## Preview4 Server Session 方法

session 只持有与具体 operation 无关的服务端输出：

| 方法                                          | Message                                       | Metadata                                            | 可选 tail             |
| --------------------------------------------- | --------------------------------------------- | --------------------------------------------------- | --------------------- |
| `sendBackpressure(metadata)`                  | `Backpressure`                                | `PressureMetadata`                                  | 无                    |
| `sendCreditUpdate(metadata)`                  | `CreditUpdate`                                | `PressureMetadata`                                  | 无                    |
| `sendTraceContext(metadata, body?)`           | `TraceContext`                                | `TraceContextMetadata`                              | trace attributes      |
| `sendRecoverableError(metadata, diagnostic?)` | `ErrorRecoverable`                            | `RecoverableErrorMetadata`                          | diagnostic bytes      |
| `sendRetryAfter(metadata, diagnostic?)`       | `RetryAfter`                                  | `RetryAfterMetadata`                                | diagnostic bytes      |
| `sendControl(messageType, metadata, tail?)`   | 任意允许 server 发送且不属于具体 operation 的 Preview4 control frame | 匹配的 runtime metadata 类型 | 声明的 tail |

所有方法返回 `Promise<void>`。Metadata/body 长度不匹配时必须在 frame 到达 carrier Provider 前失败。

## Preview4 Server 对象与缓存方法

| 方法                                              | Message           | Metadata                   | 可选 tail                |
| ------------------------------------------------- | ----------------- | -------------------------- | ------------------------ |
| `declareObject(metadata, body?)`                  | `ObjectDeclare`   | `ObjectDescriptorMetadata` | object metadata          |
| `referenceObject(metadata, body?)`                | `ObjectRef`       | `ObjectReferenceMetadata`  | reference metadata       |
| `releaseObject(metadata, diagnostic?)`            | `ObjectRelease`   | `ObjectReleaseMetadata`    | diagnostic bytes         |
| `patchObject(metadata, delta, metadataBody?)`     | `ObjectPatch`     | `ObjectDeltaMetadata`      | metadata body 后接 delta |
| `sendObjectDelta(metadata, delta, metadataBody?)` | `ObjectDelta`     | `ObjectDeltaMetadata`      | metadata body 后接 delta |
| `referenceCache(metadata, body?)`                 | `CacheReference`  | `CacheReferenceMetadata`   | cache metadata           |
| `reportCacheMiss(metadata, diagnostic?)`          | `CacheMiss`       | `CacheMissMetadata`        | diagnostic bytes         |
| `invalidateCache(metadata)`                       | `CacheInvalidate` | `CacheInvalidateMetadata`  | 无                       |

Object patch 与 delta 方法要求 `metadataBody.byteLength` 等于 `metadata.metadataBytes`，且
`delta.byteLength` 等于 `metadata.deltaBytes`。Wire tail 依次拼接 metadata body 与 delta bytes。
Operation 回复与 object-delta frame 保持独立。

## 边界规则

| 包                                                                                                   | 拥有                                                          | 不能拥有                                                          |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| `@nnrp/native-server`                                                                                | Server runtime、listen lifecycle、backend runtime lifecycle。 | Transport artifact、browser code、client session 或 connect API。 |
| `@nnrp/native-client`                                                                                | Client runtime 与 session lifecycle。                         | Server listener API。                                             |
| `@nnrp/transport-tcp` / `@nnrp/transport-quic` / `@nnrp/transport-ipc` / `@nnrp/transport-websocket` | Transport 行为与打包的 native artifact。                      | Server 或 client role lifecycle。                                 |

## 选项类型

### `NnrpBackendRuntimeOptions`

| 字段              | 类型                                                    | 必填 | 说明                                                                     |
| ----------------- | ------------------------------------------------------- | ---: | ------------------------------------------------------------------------ |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#数据类型)                |   否 | 默认选择策略。                                                           |
| `transports`      | `readonly NnrpNativeTransportProvider[]`                |   否 | 已安装 native transport provider。见 [Transport Provider](./transport)。 |
| `ffi`             | [`NnrpNativeFfiBinding`](./native#nnrpnativeffibinding) |   否 | 受控集成和测试用显式 native binding。                                    |

### `NnrpListenOptions`

| 字段              | 类型                                                    | 必填 | 说明                                                |
| ----------------- | ------------------------------------------------------- | ---: | --------------------------------------------------- |
| `endpoint`        | `string \| URL`                                         |   是 | 逻辑 listener set 共享的本地 NNRP endpoint。        |
| `providerRoutes`  | `NnrpServerProviderRoutes`                              |   否 | 按 carrier 隔离的 bind locator 与 server security。 |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#数据类型)                |   否 | Listener-set eligibility 与稳定 preference policy。 |
| `transports`      | `readonly NnrpNativeTransportProvider[]`                |   否 | 允许进入该逻辑 listener set 的 transport Provider。 |
| `sessionDefaults` | [`NnrpServerSessionOptions`](#nnrpserversessionoptions) |   否 | Accepted session 的协商与准入默认值。               |

### `NnrpServerSessionOptions`

| 字段                     | 类型                                                  | 默认值                     | 说明                                         |
| ------------------------ | ----------------------------------------------------- | -------------------------- | -------------------------------------------- |
| `supportedProfiles`      | `readonly number[]`                                   | `[STANDARD_PROFILE_TOKEN]` | `SESSION_OPEN` 接受的 profile。              |
| `supportedCacheObjects`  | `readonly NnrpCacheObjectKind[]`                      | `[]`                       | Server 声明支持的缓存对象类型。              |
| `maxCacheObjects`        | `bigint`                                              | `0n`                       | 最大缓存对象数；零表示不启用该限制。         |
| `maxCacheObjectBytes`    | `number`                                              | `0`                        | 单个缓存对象最大字节数；零表示不启用该限制。 |
| `schemaRegistry`         | [`NnrpSchemaRegistry`](./core#数据类型)               | 标准 registry              | Server session 接受的 schema。               |
| `resumeTokenBytes`       | `number`                                              | `24`                       | Opaque recovery token 容量。                 |
| `maxInFlightOperations`  | `number`                                              | `4`                        | 每个 session 协商的最大并发 operation 数。   |
| `grantedOperationCredit` | `number`                                              | `2`                        | 初始授予 peer 的 operation credit。          |
| `leaseTtlMs`             | `number`                                              | `30_000`                   | 默认 operation lease 生命周期。              |
| `resumeWindowMs`         | `number`                                              | `120_000`                  | 断连 session 可以恢复的时间窗口。            |
| `applicationPolicy`      | [`NnrpServerSessionPolicy`](#nnrpserversessionpolicy) | 接受有效 session           | 异步应用准入 policy。                        |

### `NnrpServerSessionPolicy`

```ts
interface NnrpServerSessionPolicy {
  evaluate(open: NnrpSessionOpenMetadata): Promise<NnrpServerSessionPolicyDecision>;
}
```

`NnrpServerSessionPolicyDecision` 包含 `accepted: boolean`、`sessionErrorCode: number` 与可选的
`diagnostic: string`。接受时 error code 必须为 `0`；拒绝时使用非零、由应用定义的 session error
code。

### `NnrpServerAcceptOptions`

| 字段        | 类型     | 默认值 | 说明                                            |
| ----------- | -------- | ------ | ----------------------------------------------- |
| `timeoutMs` | `number` | `0`    | 有界 accept 等待；零使用 runtime 的非阻塞模式。 |

Native session handle 与 generation 保持内部，不会通过该 options 暴露。

### `NnrpTransportSelectionOptions`

| 字段                     | 类型                                         | 必填 | 说明                                                  |
| ------------------------ | -------------------------------------------- | ---: | ----------------------------------------------------- |
| `peerManifest`           | [`NnrpCapabilityManifest`](./core#数据类型)  |   是 | Peer capability manifest。                            |
| `providers`              | `readonly NnrpTransportProvider[]`           |   否 | 需要考虑的本地 providers。                            |
| `policy`                 | [`NnrpTransportPolicy`](./core#数据类型)     |   否 | Selection policy 覆盖。                               |
| `requestedMaxFrameBytes` | `bigint`                                     |   否 | 对照 provider limits 校验的 workload limit。          |
| `candidateReadiness`     | `readonly NnrpTransportCandidateReadiness[]` |   是 | 每个 provider candidate 的 route/security evidence。  |
| `probeObservations`      | `readonly NnrpTransportProbeObservation[]`   |   否 | 按 provider identity 匹配的成功/失败 probe evidence。 |
