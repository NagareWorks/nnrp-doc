# JavaScript/TypeScript Server API

Server API 位于 `@nnrp/native-server`。Browser package 不暴露 server entrypoint。

## `openBackendRuntime`

创建 native backend runtime，但不立即启动 listener。

| 参数      | 类型                                                      | 必填 | 说明                                                                                |
| --------- | --------------------------------------------------------- | ---: | ----------------------------------------------------------------------------------- |
| `options` | [`NnrpBackendRuntimeOptions`](#nnrpbackendruntimeoptions) |   否 | Transport policy、已安装 transport provider、环境/platform 覆盖与可选 FFI binding。 |

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

创建 backend server listener。

| 参数      | 类型                                      | 必填 | 说明                                                             |
| --------- | ----------------------------------------- | ---: | ---------------------------------------------------------------- |
| `options` | [`NnrpListenOptions`](#nnrplistenoptions) |   是 | 本地 endpoint、可选 transport policy 与可选 transport provider。 |

| 返回         |
| ------------ |
| `NnrpServer` |

```ts
const server = runtime.listen({ endpoint: "nnrp://0.0.0.0:4433" });
```

## `NnrpBackendRuntime.connect`

从已有 backend runtime 创建 native client。适用于同一个 backend 进程同时管理 server 与 client
生命周期的场景。

| 参数      | 类型                                        | 必填 | 说明                                                                               |
| --------- | ------------------------------------------- | ---: | ---------------------------------------------------------------------------------- |
| `options` | [`NnrpConnectOptions`](#nnrpconnectoptions) |   是 | Endpoint、可选 transport policy、可选 transport provider 与可选 session defaults。 |

| 返回         |
| ------------ |
| `NnrpClient` |

## `NnrpBackendRuntime.selectTransport`

根据 peer manifest 选择 transport。

| 参数      | 类型                                                              | 必填 | 说明                              |
| --------- | ----------------------------------------------------------------- | ---: | --------------------------------- |
| `options` | [`NnrpTransportSelectionOptions`](#nnrptransportselectionoptions) |   是 | Peer manifest、workload limit、providers、policy 与 probe metrics。 |

| 返回                            |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

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

| 方法                                     | Message           | Metadata                   | 可选 tail          |
| ---------------------------------------- | ----------------- | -------------------------- | ------------------ |
| `declareObject(metadata, body?)`         | `ObjectDeclare`   | `ObjectDescriptorMetadata` | object metadata    |
| `referenceObject(metadata, body?)`       | `ObjectRef`       | `ObjectReferenceMetadata`  | reference metadata |
| `releaseObject(metadata, diagnostic?)`   | `ObjectRelease`   | `ObjectReleaseMetadata`    | diagnostic bytes   |
| `patchObject(metadata, delta)`           | `ObjectPatch`     | `ObjectDeltaMetadata`      | delta bytes        |
| `sendObjectDelta(metadata, delta)`       | `ObjectDelta`     | `ObjectDeltaMetadata`      | delta bytes        |
| `referenceCache(metadata, body?)`        | `CacheReference`  | `CacheReferenceMetadata`   | cache metadata     |
| `reportCacheMiss(metadata, diagnostic?)` | `CacheMiss`       | `CacheMissMetadata`        | diagnostic bytes   |
| `invalidateCache(metadata)`              | `CacheInvalidate` | `CacheInvalidateMetadata`  | 无                 |

最终 `sendResult(result)` 与 partial-result、object-delta frame 保持独立。

## 边界规则

| 包                                                                                                   | 拥有                                                          | 不能拥有                                                          |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| `@nnrp/native-server`                                                                                | Server runtime、listen lifecycle、backend runtime lifecycle。 | TCP/QUIC artifact、browser code 或 client-only top-level helper。 |
| `@nnrp/native-client`                                                                                | Client runtime 与 session lifecycle。                         | Server listener API。                                             |
| `@nnrp/transport-tcp` / `@nnrp/transport-quic` / `@nnrp/transport-ipc` / `@nnrp/transport-websocket` | Transport 行为与打包的 native artifact。                      | Server 或 client role lifecycle。                                 |

## 选项类型

### `NnrpBackendRuntimeOptions`

| 字段              | 类型                                                    | 必填 | 说明                                                                     |
| ----------------- | ------------------------------------------------------- | ---: | ------------------------------------------------------------------------ |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#数据类型)                |   否 | 默认选择策略。                                                           |
| `transports`      | `readonly NnrpTransportProvider[]`                      |   否 | 已安装 native transport provider。见 [Transport Provider](./transport)。 |
| `environment`     | `Record<string, string>`                                |   否 | Artifact 查找或诊断用环境变量覆盖。                                      |
| `platform`        | `string`                                                |   否 | 测试和受控打包校验用 platform 覆盖。                                     |
| `ffi`             | [`NnrpNativeFfiBinding`](./native#nnrpnativeffibinding) |   否 | 受控部署和测试用显式 native binding。                                    |

### `NnrpListenOptions`

| 字段               | 类型                                     | 必填 | 说明                                    |
| ------------------ | ---------------------------------------- | ---: | --------------------------------------- |
| `endpoint`         | `string`                                 |   是 | 本地监听 endpoint。                     |
| `providerEndpoint` | `string \| URL`                          |   否 | 显式载体本地 bind endpoint。            |
| `transportPolicy`  | [`NnrpTransportPolicy`](./core#数据类型) |   否 | Listener 选择策略。                     |
| `transports`       | `readonly NnrpTransportProvider[]`       |   否 | 本 listener 允许的 transport provider。 |

### `NnrpConnectOptions`

| 字段               | 类型                                                | 必填 | 说明                               |
| ------------------ | --------------------------------------------------- | ---: | ---------------------------------- |
| `endpoint`         | `string`                                            |   是 | 远端 endpoint。                    |
| `providerEndpoint` | `string \| URL`                                     |   否 | 显式载体本地 connect endpoint。    |
| `transportPolicy`  | [`NnrpTransportPolicy`](./core#数据类型)            |   否 | Connection 选择策略。              |
| `transports`       | `readonly NnrpTransportProvider[]`                  |   否 | 本连接允许的 transport provider。  |
| `sessionDefaults`  | [`NnrpSessionOptions`](./client#nnrpsessionoptions) |   否 | session 未设置字段时使用的默认值。 |

### `NnrpTransportSelectionOptions`

| 字段                     | 类型                                                               | 必填 | 说明                                      |
| ------------------------ | ------------------------------------------------------------------ | ---: | ----------------------------------------- |
| `peerManifest`           | [`NnrpCapabilityManifest`](./core#数据类型)                        |   是 | Peer capability manifest。                |
| `providers`              | `readonly NnrpTransportProvider[]`                                 |   否 | 需要考虑的本地 providers。                |
| `policy`                 | [`NnrpTransportPolicy`](./core#数据类型)                            |   否 | Selection policy 覆盖。                   |
| `requestedMaxFrameBytes` | `bigint`                                                           |   否 | 对照 provider limits 校验的 workload limit。 |
| `probeMetricsByProviderId` | `Readonly<Record<string, NnrpTransportProbeMetrics>>`                  |   否 | 按 provider id 索引的测试/部署结构化观测。 |
