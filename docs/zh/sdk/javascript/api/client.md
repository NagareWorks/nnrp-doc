# JavaScript/TypeScript Client API

Client 代码按照同一套生命周期阅读：

1. 打开 runtime。
2. 连接 client endpoint。
3. 打开 session。
4. submit、cancel 或读取 event。

Native 和 browser 的包名不同，但 client session 的方法形态刻意保持一致。

| 宿主         | Role package           | Transport package                        |
| ------------ | ---------------------- | ---------------------------------------- |
| Node.js/Deno | `@nnrp/native-client`  | TCP、QUIC、IPC 与 WebSocket 载体 package |
| Browser/edge | `@nnrp/browser-client` | `@nnrp/transport-websocket`              |

## `openNativeClient`

在 Node.js 或 Deno 中打开 native client。

| 参数      | 类型                                                  | 必填 | 说明                                                                                                            |
| --------- | ----------------------------------------------------- | ---: | --------------------------------------------------------------------------------------------------------------- |
| `options` | [`NnrpNativeClientOptions`](#nnrpnativeclientoptions) |   是 | Endpoint、transport policy、已安装 transport provider、session defaults、环境/platform 覆盖与可选 FFI binding。 |

| 返回                  | 可能抛出                                                       |
| --------------------- | -------------------------------------------------------------- |
| `Promise<NnrpClient>` | `NnrpCapabilityError` 或 `NnrpNativeBindingUnavailableError`。 |

```ts
import { openNativeClient } from "@nnrp/native-client";
import { createTcpTransportProvider } from "@nnrp/transport-tcp";
import { createQuicTransportProvider } from "@nnrp/transport-quic";

const client = await openNativeClient({
  endpoint: "nnrps://runtime.example/session/default",
  transportPolicy: "auto",
  transports: [
    createQuicTransportProvider(),
    createTcpTransportProvider(),
  ],
});
```

## `openBrowserRuntime`

打开 browser runtime。浏览器 client 先打开 runtime 再 connect，因为浏览器有独立的 WASM/module
生命周期。

| 参数      | 类型                                                      | 必填 | 说明                                                                                           |
| --------- | --------------------------------------------------------- | ---: | ---------------------------------------------------------------------------------------------- |
| `options` | [`NnrpBrowserRuntimeOptions`](#nnrpbrowserruntimeoptions) |   否 | Module URL、预编译 module、artifact manifest、transport policy 与 browser transport provider。 |

| 返回                          |
| ----------------------------- |
| `Promise<NnrpBrowserRuntime>` |

```ts
import { openBrowserRuntime } from "@nnrp/browser-client";
import { createWebSocketTransportProvider } from "@nnrp/transport-websocket";

const runtime = await openBrowserRuntime({
  transportProviders: [createWebSocketTransportProvider()],
});
```

## `NnrpBrowserRuntime.connect`

从已打开的 browser runtime 创建 browser client。

| 参数      | 类型                                                      | 必填 | 说明                                                                               |
| --------- | --------------------------------------------------------- | ---: | ---------------------------------------------------------------------------------- |
| `options` | [`NnrpBrowserConnectOptions`](#nnrpbrowserconnectoptions) |   是 | Endpoint、可选 transport policy、可选 transport provider 与可选 session defaults。 |

| 返回                |
| ------------------- |
| `NnrpBrowserClient` |

```ts
const client = runtime.connect({
  endpoint: "nnrps://runtime.example/session/default",
  providerEndpoint: "wss://runtime.example/nnrp",
  transportPolicy: "auto",
});
```

## `NnrpClient.openSession`

打开 client session。Native 与 browser client 暴露同一个 session 概念。

| 参数      | 类型                                                                                                     | 必填 | 说明                                               |
| --------- | -------------------------------------------------------------------------------------------------------- | ---: | -------------------------------------------------- |
| `options` | [`NnrpSessionOptions`](#nnrpsessionoptions) 或 [`NnrpBrowserSessionOptions`](#nnrpbrowsersessionoptions) |   否 | Input profile、cadence、quality tier 与 metadata。 |

| 返回                                              |
| ------------------------------------------------- |
| `NnrpClientSession` 或 `NnrpBrowserClientSession` |

```ts
const session = client.openSession({ inputProfile: "tensor" });
```

## `ClientSession.submit`

提交请求并等待 result。Native client 走 native submit/result hot path；browser client 走 browser
runtime path，但 request 形态共享。

| 参数      | 类型                                   | 必填 | 说明                                                                       |
| --------- | -------------------------------------- | ---: | -------------------------------------------------------------------------- |
| `request` | [`NnrpSubmitRequest`](./core#数据类型) |   是 | Frame id、payload/tensors、profile、cache/schema metadata 与 submit mode。 |

| 返回                  |
| --------------------- |
| `Promise<NnrpResult>` |

```ts
const result = await session.submit({
  frameId: 1,
  payload: new Uint8Array([1, 2, 3]),
  inputProfile: "tensor",
  submitMode: "inline",
});
```

## `ClientSession.submitNoWait`

提交请求并返回 operation id。该方法当前用于 native client session。

| 参数      | 类型                                   | 必填 | 说明             |
| --------- | -------------------------------------- | ---: | ---------------- |
| `request` | [`NnrpSubmitRequest`](./core#数据类型) |   是 | Submit request。 |

| 返回              |
| ----------------- |
| `Promise<bigint>` |

## `ClientSession.cancel`

发送 Preview4 `CANCEL` 帧。`NnrpClientSession` 与 `NnrpBrowserClientSession` 暴露完全相同的方法。

| 参数         | 类型                                                      | 必填 | 说明                                                                      |
| ------------ | --------------------------------------------------------- | ---: | ------------------------------------------------------------------------- |
| `metadata`   | [`ControlRequestMetadata`](./runtime#运行时控制-metadata) |   是 | 已冻结的 operation id、sequence、reason、role、flags 与 diagnostic 长度。 |
| `diagnostic` | `Uint8Array`                                              |   否 | 长度等于 `metadata.diagnosticBytes` 的诊断字节。                          |

| 返回            |
| --------------- |
| `Promise<void>` |

## Preview4 Client 控制方法

Native 与 browser session 使用同一套控制面。每个方法都编码对应的 NNRP message，并通过当前 runtime
的一次粗粒度调用提交。

| 方法                                        | Message                                       | Metadata                     | 可选 tail          |
| ------------------------------------------- | --------------------------------------------- | ---------------------------- | ------------------ |
| `abort(metadata, diagnostic?)`              | `Abort`                                       | `ControlRequestMetadata`     | diagnostic bytes   |
| `updatePriority(metadata)`                  | `PriorityUpdate`                              | `SchedulingMetadata`         | 无                 |
| `updateDeadline(metadata)`                  | `Deadline`                                    | `SchedulingMetadata`         | 无                 |
| `expireAt(metadata)`                        | `ExpireAt`                                    | `SchedulingMetadata`         | 无                 |
| `supersede(metadata, diagnostic?)`          | `Supersede`                                   | `SupersedeMetadata`          | diagnostic bytes   |
| `updateBudget(metadata)`                    | `BudgetUpdate`                                | `BudgetMetadata`             | 无                 |
| `negotiateCapabilities(metadata, body?)`    | `CapabilityNegotiation`                       | `CapabilityMetadata`         | capability entries |
| `degradeProfile(metadata, body?)`           | `DegradeProfile`                              | `CapabilityMetadata`         | capability entries |
| `sendRouteHint(metadata, body?)`            | `RouteHint`                                   | `RouteHintMetadata`          | typed hint body    |
| `sendExecutionHint(metadata, body?)`        | `ExecutionHint`                               | `RouteHintMetadata`          | typed hint body    |
| `sendTraceContext(metadata, body?)`         | `TraceContext`                                | `TraceContextMetadata`       | trace attributes   |
| `sendControl(messageType, metadata, tail?)` | 任意允许 client 发送的 Preview4 control frame | 匹配的 runtime metadata 类型 | 声明的 tail        |

`sendControl` 是 `ErrorRecoverable`、`RetryAfter` 与扩展安全控制路由的 typed escape hatch。
`messageType` 与 metadata 类型不匹配时必须拒绝。

## Preview4 Client 对象与缓存方法

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

对象与缓存方法返回 `Promise<void>`，不会在每次 submit 前隐式执行 cache lookup。

## Preview4 Runtime Event

`nextEvent()` 与 `events()` 为 `NnrpRuntimeEvent` 增加全部 Preview4 runtime-frame
discriminant：`cancel`、`abort`、`priority-update`、`deadline`、`expire-at`、`supersede`、
`budget-update`、`progress`、`partial-result`、`backpressure`、`credit-update`、
`capability-negotiation`、`degrade-profile`、`route-hint`、`execution-hint`、`trace-context`、
`result-drop-reason`、`recoverable-error`、`retry-after`、`object-declare`、`object-ref`、
`object-release`、`object-patch`、`object-delta`、`cache-reference`、`cache-miss` 和
`cache-invalidate`。精确 typed 字段和语义化 tail 名称冻结在
[运行时控制与对象](./runtime#typed-runtime-frame-event)。

同一个 operation 内的事件保持 wire order，不同 operation 的事件可以交错。取消后仍可观察
`result-drop-reason`，但普通结果迭代会抑制该 operation 的迟到 `result` 与 `partial-result` payload。

## Submit 取消

`submit(request, options?)` 与 `submitNoWait(request, options?)` 接受 `NnrpSubmitOptions`：

| 字段            | 类型                  | 必填 | 说明                                                                       |
| --------------- | --------------------- | ---: | -------------------------------------------------------------------------- |
| `signal`        | `NnrpAbortSignalLike` |   否 | 已 abort 的 signal 在 dispatch 前拒绝；dispatch 后 abort 会发送 `CANCEL`。 |
| `timeoutMillis` | `number`              |   否 | 本地等待上限；SDK 在 dispatch 前发送 `DEADLINE`，超时后取消任务。          |

这些 helper 与显式控制方法共用 control sequence allocator，不会创建旁路取消通道。

## `ClientSession.nextEvent`

读取下一条 runtime event。

| 参数      | 类型                                            | 必填 | 说明                 |
| --------- | ----------------------------------------------- | ---: | -------------------- |
| `options` | [`NnrpEventPollOptions`](#nnrpeventpolloptions) |   否 | Event polling 选项。 |

| 返回                        |
| --------------------------- |
| `Promise<NnrpRuntimeEvent>` |

## 运行时差异

| 领域              | Native client                                                        | Browser client                                                                            |
| ----------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 包                | `@nnrp/native-client`                                                | `@nnrp/browser-client`                                                                    |
| Runtime 打开方式  | `openNativeClient(options)` 直接返回已连接 client。                  | `openBrowserRuntime(options)` 返回 runtime，然后 `runtime.connect(options)` 返回 client。 |
| Transport package | TCP、QUIC、IPC 与 WebSocket package 携带 native transport artifact。 | Browser client 使用 WebSocket Provider 与 browser-client WASM。                           |
| Server API        | 不暴露。                                                             | 不暴露。                                                                                  |

## 选项类型

### `NnrpNativeClientOptions`

| 字段               | 类型                                                    | 必填 | 说明                                                                     |
| ------------------ | ------------------------------------------------------- | ---: | ------------------------------------------------------------------------ |
| `endpoint`         | `string`                                                |   是 | 远端 NNRP endpoint。                                                     |
| `providerEndpoint` | `string \| URL`                                         |   否 | 诊断、一致性测试或受控部署使用的显式载体本地 endpoint。                  |
| `transportPolicy`  | [`NnrpTransportPolicy`](./core#数据类型)                |   否 | `auto`、`prefer-*` 或 `force-*` 选择策略。                               |
| `transports`       | `readonly NnrpTransportProvider[]`                      |   否 | 已安装 native transport provider。见 [Transport Provider](./transport)。 |
| `sessionDefaults`  | [`NnrpSessionOptions`](#nnrpsessionoptions)             |   否 | session 未设置字段时使用的默认值。                                       |
| `environment`      | `Record<string, string>`                                |   否 | Artifact 查找或诊断用环境变量覆盖。                                      |
| `platform`         | `string`                                                |   否 | 测试和受控打包校验用 platform 覆盖。                                     |
| `ffi`              | [`NnrpNativeFfiBinding`](./native#nnrpnativeffibinding) |   否 | 受控部署和测试用显式 native binding。                                    |

### `NnrpBrowserRuntimeOptions`

| 字段                 | 类型                                      | 必填 | 说明                                                                                                 |
| -------------------- | ----------------------------------------- | ---: | ---------------------------------------------------------------------------------------------------- |
| `moduleUrl`          | `string \| URL`                           |   否 | 显式 WASM module URL。                                                                               |
| `module`             | `WebAssembly.Module`                      |   否 | 预编译 WASM module。                                                                                 |
| `artifact`           | `NnrpWasmArtifactOptions`                 |   否 | Browser WASM primitive manifest 与可选 base URL。                                                    |
| `transportPolicy`    | [`NnrpTransportPolicy`](./core#数据类型)  |   否 | Browser transport selection policy。                                                                 |
| `transportProviders` | `readonly NnrpBrowserTransportProvider[]` |   否 | Browser transport provider。当前 SDK 接受 WebSocket provider。见 [Transport Provider](./transport)。 |

### `NnrpBrowserConnectOptions`

| 字段                 | 类型                                                      | 必填 | 说明                                         |
| -------------------- | --------------------------------------------------------- | ---: | -------------------------------------------- |
| `endpoint`           | `string`                                                  |   是 | 远端 `nnrp://` 或 `nnrps://` 应用 endpoint。 |
| `providerEndpoint`   | `string \| URL`                                           |   否 | 显式 `ws://` 或 `wss://` 载体本地 endpoint。 |
| `transportPolicy`    | [`NnrpTransportPolicy`](./core#数据类型)                  |   否 | Selection policy。                           |
| `transportProviders` | `readonly NnrpBrowserTransportProvider[]`                 |   否 | 本连接允许的 browser provider。              |
| `sessionDefaults`    | [`NnrpBrowserSessionOptions`](#nnrpbrowsersessionoptions) |   否 | session 未设置字段时使用的默认值。           |

### `NnrpSessionOptions`

| 字段            | 类型                      | 必填 | 说明                                        |
| --------------- | ------------------------- | ---: | ------------------------------------------- |
| `inputProfile`  | `string`                  |   否 | `tensor` 或 `token` 等 input profile 名称。 |
| `targetCadence` | `number`                  |   否 | 请求 cadence。                              |
| `qualityTier`   | `number`                  |   否 | 应用质量层级。                              |
| `metadata`      | `Record<string, unknown>` |   否 | 附加到 session 的应用 metadata。            |

### `NnrpBrowserSessionOptions`

与 [`NnrpSessionOptions`](#nnrpsessionoptions) 相同，但作用域是 browser client。

### `NnrpEventPollOptions`

| 字段        | 类型     | 必填 | 说明                                    |
| ----------- | -------- | ---: | --------------------------------------- |
| `timeoutMs` | `number` |   否 | 最大等待毫秒数。                        |
| `maxEvents` | `number` |   否 | runtime 批量返回 event 时最多读取数量。 |
