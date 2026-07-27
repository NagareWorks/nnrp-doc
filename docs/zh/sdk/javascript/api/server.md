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

## `NnrpBackendRuntime.selectTransport`

根据 peer manifest 选择 transport。

| 参数      | 类型                                                              | 必填 | 说明                                                                |
| --------- | ----------------------------------------------------------------- | ---: | ------------------------------------------------------------------- |
| `options` | [`NnrpTransportSelectionOptions`](#nnrptransportselectionoptions) |   是 | Peer manifest、workload limit、providers、policy、readiness 与 probe observation。 |

| 返回                            |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

## Runtime、Listener 与 Session 生命周期

| 方法                                   | 参数                                                              | 返回值                       | 说明                                                    |
| -------------------------------------- | ----------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------- |
| `NnrpBackendRuntime.close()`           | 无                                                                | `Promise<void>`              | 关闭 accepted session、listener 与显式 FFI seam。       |
| `NnrpServer.accept()`                  | 无                                                                | `Promise<NnrpServerSession>` | 接受 owned carrier-listener set 的下一个 session。      |
| `NnrpServer.close()`                   | 无                                                                | `Promise<void>`              | 关闭全部 owned carrier listener 与 accepted session。   |
| `NnrpServerSession.receive(options?)`  | [`options?: NnrpEventPollOptions`](./client#nnrpeventpolloptions) | `Promise<NnrpRuntimeEvent>`  | 读取下一条有序 submit、control、object 或 cache event。 |
| `NnrpServerSession.sendResult(result)` | [`result: NnrpResult`](./core#数据类型)                           | `Promise<void>`              | 为当前 operation 发送唯一终态结果。                     |
| `NnrpServerSession.close()`            | 无                                                                | `Promise<void>`              | 只关闭一次 accepted role session。                      |

`NnrpServerSession.activeTransport` 是实际接受 carrier 的 listener 对应的 `NnrpTransportKind`。它必须与协商
得到的 active transport 一致，不能从 listener preference 顺序推断。

`NnrpServer.boundProviderEndpoints` 是按 `NnrpTransportKind` 索引的 readonly partial record，保存每个已打开
listener 的实际 endpoint。Provider listener 的致命失败会让逻辑 server 失败并关闭其余 listener set；被
拒绝的 peer handshake 只影响该 accepted carrier。

## Preview4 Server Session 方法

`NnrpServerSession.receive(options?)` 返回与 client session 相同的 typed `NnrpRuntimeEvent`
union，其中包括收到的控制帧、运行时对象帧与缓存帧。Server 使用以下方法发送增量状态：

| 方法                                          | Message                                       | Metadata                                            | 可选 tail             |
| --------------------------------------------- | --------------------------------------------- | --------------------------------------------------- | --------------------- |
| `sendProgress(metadata, body?)`               | `Progress`                                    | [`ProgressMetadata`](./runtime#运行时控制-metadata) | progress body         |
| `sendPartialResult(metadata, body?)`          | `PartialResult`                               | `PartialResultMetadata`                             | inline partial result |
| `sendBackpressure(metadata)`                  | `Backpressure`                                | `PressureMetadata`                                  | 无                    |
| `sendCreditUpdate(metadata)`                  | `CreditUpdate`                                | `PressureMetadata`                                  | 无                    |
| `sendResultDropReason(metadata, diagnostic?)` | `ResultDropReason`                            | `ResultDropReasonMetadata`                          | diagnostic bytes      |
| `sendTraceContext(metadata, body?)`           | `TraceContext`                                | `TraceContextMetadata`                              | trace attributes      |
| `sendRecoverableError(metadata, diagnostic?)` | `ErrorRecoverable`                            | `RecoverableErrorMetadata`                          | diagnostic bytes      |
| `sendRetryAfter(metadata, diagnostic?)`       | `RetryAfter`                                  | `RetryAfterMetadata`                                | diagnostic bytes      |
| `sendControl(messageType, metadata, tail?)`   | 任意允许 server 发送的 Preview4 control frame | 匹配的 runtime metadata 类型                        | 声明的 tail           |

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
最终 `sendResult(result)` 与 partial-result、object-delta frame 保持独立。

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

| 字段                | 类型                                                          | 必填 | 说明                                                  |
| ------------------- | ------------------------------------------------------------- | ---: | ----------------------------------------------------- |
| `endpoint`          | `string \| URL`                                               |   是 | 逻辑 listener set 共享的本地 NNRP endpoint。          |
| `providerRoutes`    | `NnrpServerProviderRoutes`                                     |   否 | 按 carrier 隔离的 bind locator 与 server security。   |
| `transportPolicy`   | [`NnrpTransportPolicy`](./core#数据类型)                      |   否 | Listener-set eligibility 与稳定 preference policy。   |
| `transports`        | `readonly NnrpNativeTransportProvider[]`                      |   否 | 允许进入该逻辑 listener set 的 transport Provider。   |

### `NnrpTransportSelectionOptions`

| 字段                       | 类型                                                  | 必填 | 说明                                         |
| -------------------------- | ----------------------------------------------------- | ---: | -------------------------------------------- |
| `peerManifest`             | [`NnrpCapabilityManifest`](./core#数据类型)           |   是 | Peer capability manifest。                   |
| `providers`                | `readonly NnrpTransportProvider[]`                    |   否 | 需要考虑的本地 providers。                   |
| `policy`                   | [`NnrpTransportPolicy`](./core#数据类型)              |   否 | Selection policy 覆盖。                      |
| `requestedMaxFrameBytes`   | `bigint`                                              |   否 | 对照 provider limits 校验的 workload limit。 |
| `candidateReadiness`       | `readonly NnrpTransportCandidateReadiness[]`          |   是 | 每个 provider candidate 的 route/security evidence。 |
| `probeObservations`        | `readonly NnrpTransportProbeObservation[]`            |   否 | 按 provider identity 匹配的成功/失败 probe evidence。 |
