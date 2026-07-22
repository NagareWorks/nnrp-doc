# JavaScript/TypeScript Server API

Server API 位于 `@nnrp/native-server`。Browser package 不暴露 server entrypoint。

## `openBackendRuntime`

创建 native backend runtime，但不立即启动 listener。

| 参数      | 类型                                                      | 必填 | 说明                                                                                |
| --------- | --------------------------------------------------------- | ---: | ----------------------------------------------------------------------------------- |
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

## `NnrpBackendRuntime.selectTransport`

根据 peer manifest 选择 transport。

| 参数      | 类型                                                              | 必填 | 说明                              |
| --------- | ----------------------------------------------------------------- | ---: | --------------------------------- |
| `options` | [`NnrpTransportSelectionOptions`](#nnrptransportselectionoptions) |   是 | Peer manifest、workload limit、providers、policy 与 probe metrics。 |

| 返回                            |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

## Runtime、Listener 与 Session 生命周期

| 方法                                   | 参数                                                                    | 返回值                       | 说明                                                    |
| -------------------------------------- | ----------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------- |
| `NnrpBackendRuntime.close()`           | 无                                                                      | `Promise<void>`              | 关闭 accepted session、listener 与显式 FFI seam。       |
| `NnrpServer.accept()`                  | 无                                                                      | `Promise<NnrpServerSession>` | 接受一个 carrier-backed NNRP session。                  |
| `NnrpServer.close()`                   | 无                                                                      | `Promise<void>`              | 关闭 listener 及其拥有的 accepted session。             |
| `NnrpServerSession.receive(options?)`  | [`options?: NnrpEventPollOptions`](./client#nnrpeventpolloptions)        | `Promise<NnrpRuntimeEvent>`  | 读取下一条有序 submit、control、object 或 cache event。  |
| `NnrpServerSession.sendResult(result)` | [`result: NnrpResult`](./core#数据类型)                                  | `Promise<void>`              | 为当前 operation 发送唯一终态结果。                     |
| `NnrpServerSession.close()`            | 无                                                                      | `Promise<void>`              | 只关闭一次 accepted role session。                      |

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

| 字段               | 类型                                     | 必填 | 说明                                    |
| ------------------ | ---------------------------------------- | ---: | --------------------------------------- |
| `endpoint`         | `string \| URL`                          |   是 | 本地监听的 NNRP 应用 endpoint。          |
| `providerEndpoint` | `string \| URL`                          |   否 | 显式载体本地 bind endpoint。            |
| `security`         | `NnrpTransportServerSecurity`             |   否 | QUIC 或 `wss://` 证书与私钥配置。       |
| `transportPolicy`  | [`NnrpTransportPolicy`](./core#数据类型) |   否 | Listener 选择策略。                     |
| `transports`       | `readonly NnrpNativeTransportProvider[]` |   否 | 本 listener 允许的 transport provider。 |

### `NnrpTransportSelectionOptions`

| 字段                     | 类型                                                               | 必填 | 说明                                      |
| ------------------------ | ------------------------------------------------------------------ | ---: | ----------------------------------------- |
| `peerManifest`           | [`NnrpCapabilityManifest`](./core#数据类型)                        |   是 | Peer capability manifest。                |
| `providers`              | `readonly NnrpTransportProvider[]`                                 |   否 | 需要考虑的本地 providers。                |
| `policy`                 | [`NnrpTransportPolicy`](./core#数据类型)                            |   否 | Selection policy 覆盖。                   |
| `requestedMaxFrameBytes` | `bigint`                                                           |   否 | 对照 provider limits 校验的 workload limit。 |
| `probeMetricsByProviderId` | `Readonly<Record<string, NnrpTransportProbeMetrics>>`                  |   否 | 按 provider id 索引的测试/部署结构化观测。 |
