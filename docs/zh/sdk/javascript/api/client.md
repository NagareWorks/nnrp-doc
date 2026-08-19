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

| 参数      | 类型                                                  | 必填 | 说明                                                                                         |
| --------- | ----------------------------------------------------- | ---: | -------------------------------------------------------------------------------------------- |
| `options` | [`NnrpNativeClientOptions`](#nnrpnativeclientoptions) |   是 | Endpoint、transport policy、已安装 transport provider、session defaults 与可选 FFI binding。 |

| 返回                  | 可能抛出                                                       |
| --------------------- | -------------------------------------------------------------- |
| `Promise<NnrpClient>` | `NnrpCapabilityError` 或 `NnrpNativeBindingUnavailableError`。 |

```ts
import { openNativeClient } from "@nnrp/native-client";
import { createTcpTransportProvider } from "@nnrp/transport-tcp";
import { createQuicTransportProvider } from "@nnrp/transport-quic";

const client = await openNativeClient({
  endpoint: "nnrps://runtime.example/session/default",
  providerRoutes: {
    quic: {
      security: { mode: "client", serverName: "runtime.example", trustedCertificateDer },
    },
    tcp: {
      security: { mode: "client", serverName: "runtime.example", trustedCertificateDer },
    },
  },
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
  providerRoutes: {
    websocket: { endpoint: "wss://runtime.example/nnrp" },
  },
  transportPolicy: "auto",
});
```

## `NnrpClient.openSession`

打开 client session。Native 与 browser client 暴露同一个 session 概念。

| 参数      | 类型                                                                                                     | 必填 | 说明                                                    |
| --------- | -------------------------------------------------------------------------------------------------------- | ---: | ------------------------------------------------------- |
| `options` | [`NnrpSessionOptions`](#nnrpsessionoptions) 或 [`NnrpBrowserSessionOptions`](#nnrpbrowsersessionoptions) |   否 | 与 transport 无关的 `SESSION_OPEN` 意图和本地恢复容量。 |

| 返回                                                                |
| ------------------------------------------------------------------- |
| `Promise<NnrpClientSession>` 或 `Promise<NnrpBrowserClientSession>` |

```ts
const session = await client.openSession({ profileId: 1 });
```

`openSession` 只有在 runtime 完成自动 connection handshake 并收到 `SESSION_OPEN_ACK` 后才完成；
它不会返回延迟握手的 session wrapper。

## `NnrpClient.resumeSession`

在现有逻辑 client connection 上恢复 runtime 签发的 session。Native 与 browser client
暴露相同的异步操作。

| 参数      | 类型                                                                                                     | 必填 | 说明                                          |
| --------- | -------------------------------------------------------------------------------------------------------- | ---: | --------------------------------------------- |
| `ticket`  | [`NnrpSessionRecoveryTicket`](./core#nnrpsessionrecoveryticket)                                          |   是 | Runtime 签发的 opaque canonical NRTK ticket。 |
| `options` | [`NnrpSessionOptions`](#nnrpsessionoptions) 或 [`NnrpBrowserSessionOptions`](#nnrpbrowsersessionoptions) |   否 | 恢复 session open 的可选 override。           |

| 返回                                                                |
| ------------------------------------------------------------------- |
| `Promise<NnrpClientSession>` 或 `Promise<NnrpBrowserClientSession>` |

无效、过期、截断或未知 ticket 必须拒绝，禁止回退为 fresh session。

## Client 生命周期方法

以下方法在 `NnrpClient` 与 `NnrpBrowserClient` 上保持相同形态。

| 方法                                    | 参数                                                                           | 返回值                      | 说明                                               |
| --------------------------------------- | ------------------------------------------------------------------------------ | --------------------------- | -------------------------------------------------- |
| `nextSessionEvent(sessionId, options?)` | `sessionId: number`、[`options?: NnrpEventPollOptions`](#nnrpeventpolloptions) | `Promise<NnrpClientEvent>` | 读取指定协商 session 的下一个 event。               |
| `close()`                               | 无                                                                             | `Promise<void>`             | 关闭所拥有的 session、role connection 与 runtime。 |

## `ClientSession.submit`

提交请求并等待 result。Native client 走 native submit/result hot path；browser client 走 browser
runtime path，但 request 形态共享。

| 参数      | 类型                                   | 必填 | 说明                                                                                               |
| --------- | -------------------------------------- | ---: | -------------------------------------------------------------------------------------------------- |
| `request` | [`NnrpSubmitRequest`](./core#数据类型) |   是 | 非零 operation id、独立 frame id、payload/tensors、profile、cache/schema metadata 与 submit mode。 |

| 返回                  |
| --------------------- |
| `Promise<NnrpResult>` |

```ts
const result = await session.submit({
  operationId: 1n,
  frameId: 1,
  payload: new Uint8Array([1, 2, 3]),
  inputProfile: "tensor",
  submitMode: "inline",
});
```

## `ClientSession.submitNoWait`

提交请求并返回 operation id。Native 与 browser client session 均提供该方法。

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
| `sendTraceContext(metadata, body?, operationId?)` | `TraceContext`                          | `TraceContextMetadata`       | trace attributes；省略 operation 表示 session scope |
| `sendControl(messageType, metadata, tail?)` | 任意允许 client 发送的 Preview4 control frame | 匹配的 runtime metadata 类型 | 声明的 tail        |

`sendControl` 是 `ErrorRecoverable`、`RetryAfter` 与扩展安全控制路由的 typed escape hatch。
`messageType` 与 metadata 类型不匹配时必须拒绝。

## Preview4 Client 对象与缓存方法

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
对象与缓存方法返回 `Promise<void>`，不会在每次 submit 前隐式执行 cache lookup。

## Preview4 Runtime Event

`nextEvent()` 与 `events()` 返回值中的 runtime variant 支持全部 Preview4 runtime-frame
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

| 字段            | 类型                                     | 必填 | 说明                                                                       |
| --------------- | ---------------------------------------- | ---: | -------------------------------------------------------------------------- |
| `signal`        | [`NnrpAbortSignalLike`](./core#数据类型) |   否 | 已 abort 的 signal 在 dispatch 前拒绝；dispatch 后 abort 会发送 `CANCEL`。 |
| `timeoutMillis` | `number`                                 |   否 | 本地等待上限；SDK 在 dispatch 前发送 `DEADLINE`，超时后取消任务。          |

这些 helper 与显式控制方法共用 control sequence allocator，不会创建旁路取消通道。

已发出 `FRAME_SUBMIT` 后取消 `submit()`，该次等待必须在发起 `CANCEL` 后确定性地以
[`NnrpTimeoutError`](./core#错误) 拒绝，其 `diagnostic.code` 为 `NNRP_SUBMIT_CANCELLED`。等待超时使用
同一错误类型和 `NNRP_SUBMIT_TIMEOUT` 诊断码，并在发起 `CANCEL` 后拒绝；发送前的 `DEADLINE` 仍属于
wire 流程。两种情况下，本地终态 lifecycle event 都继续由 `nextEvent()` 提供，禁止与同一个
`submit()` 竞速并把它解析为成功返回的 `NnrpResult`。由对端独立触发的终态 lifecycle 仍可作为
非成功 `NnrpResult` 证据完成 `submit()`。

## `ClientSession.nextEvent`

读取下一条 client event。`NnrpClientEvent` 是闭合 tagged union，包括一个 runtime
`NnrpRuntimeEvent` variant 和一个 lifecycle `NnrpOperationLifecycleEvent` variant。

| 参数      | 类型                                            | 必填 | 说明                 |
| --------- | ----------------------------------------------- | ---: | -------------------- |
| `options` | [`NnrpEventPollOptions`](#nnrpeventpolloptions) |   否 | Event polling 选项。 |

| 返回                       |
| -------------------------- |
| `Promise<NnrpClientEvent>` |

## Client Session 生命周期与结果方法

| 方法                   | 参数                                                             | 返回值                                   | 说明                                                         |
| ---------------------- | ---------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `inFlightFrames()`     | 无                                                               | `readonly number[]`                      | 返回尚未进入终态的 frame id。                                |
| `completeEvent(event)` | [`event: NnrpRuntimeEvent`](./runtime#typed-runtime-frame-event) | `void`                                   | 为外部消费的 event 执行终态记账。                            |
| `nextResult(options?)` | [`options?: NnrpEventPollOptions`](#nnrpeventpolloptions)        | `Promise<NnrpResult>`                    | 跳过非结果 event，返回下一个终态结果。                       |
| `migrate(request)`     | [`request: NnrpSessionMigrationRequest`](./core#数据类型)        | `Promise<void>`                          | 请求 session 迁移；不支持的 runtime 返回 typed diagnostic。  |
| `patch(request)`       | [`request: NnrpSessionPatchRequest`](./core#数据类型)            | `Promise<NnrpSessionPatchResult>`        | 修改 session metadata、profile、cadence、quality 或 credit。 |
| `events(options?)`     | [`options?: NnrpEventPollOptions`](#nnrpeventpolloptions)        | `AsyncIterable<NnrpClientEvent>`         | 持续迭代 event，直到 session 关闭或 polling 失败。           |
| `recoveryTicket()`     | 无                                                               | `NnrpSessionRecoveryTicket \| undefined` | Resume 协商成功时返回最新 runtime ticket snapshot。          |
| `close()`              | 无                                                               | `Promise<void>`                          | 关闭 role session 并释放其 in-flight 状态。                  |

## 运行时差异

| 领域              | Native client                                                        | Browser client                                                                            |
| ----------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 包                | `@nnrp/native-client`                                                | `@nnrp/browser-client`                                                                    |
| Runtime 打开方式  | `openNativeClient(options)` 直接返回已连接 client。                  | `openBrowserRuntime(options)` 返回 runtime，然后 `runtime.connect(options)` 返回 client。 |
| Transport package | TCP、QUIC、IPC 与 WebSocket package 携带 native transport artifact。 | Browser client 使用 WebSocket Provider 与 browser-client WASM。                           |
| Server API        | 不暴露。                                                             | 不暴露。                                                                                  |

## 选项类型

### `NnrpNativeClientOptions`

| 字段              | 类型                                                    | 必填 | 说明                                                                     |
| ----------------- | ------------------------------------------------------- | ---: | ------------------------------------------------------------------------ |
| `endpoint`        | `string \| URL`                                         |   是 | 远端 NNRP endpoint。                                                     |
| `providerRoutes`  | `NnrpClientProviderRoutes`                              |   否 | 按 carrier 隔离的 locator 与对端验证配置。                               |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#数据类型)                |   否 | `auto`、`prefer-*` 或 `force-*` 选择策略。                               |
| `transports`      | `readonly NnrpNativeTransportProvider[]`                |   否 | 已安装 native transport provider。见 [Transport Provider](./transport)。 |
| `sessionDefaults` | [`NnrpSessionOptions`](#nnrpsessionoptions)             |   否 | session 未设置字段时使用的默认值。                                       |
| `ffi`             | [`NnrpNativeFfiBinding`](./native#nnrpnativeffibinding) |   否 | 受控集成和测试用显式 native binding。                                    |

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
| `providerRoutes`     | `NnrpClientProviderRoutes`                                |   否 | WebSocket route；浏览器信任仍由宿主持有。    |
| `transportPolicy`    | [`NnrpTransportPolicy`](./core#数据类型)                  |   否 | Selection policy。                           |
| `transportProviders` | `readonly NnrpBrowserTransportProvider[]`                 |   否 | 本连接允许的 browser provider。              |
| `sessionDefaults`    | [`NnrpBrowserSessionOptions`](#nnrpbrowsersessionoptions) |   否 | session 未设置字段时使用的默认值。           |

### `NnrpSessionPriorityClass`

| 成员          | 线值 | 语义                                       |
| ------------- | ---: | ------------------------------------------ |
| `Interactive` |    0 | 需要优先调度、对时延敏感的工作。           |
| `Balanced`    |    1 | 普通交互工作负载使用的默认调度类别。       |
| `Background`  |    2 | 可以让位于交互流量、以吞吐为主的后台工作。 |

### `NnrpSessionOptions`

| 字段                    | 类型                                                    | 默认值                     | 说明                                                                   |
| ----------------------- | ------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| `requestedSessionId`    | `number`                                                | `0`                        | 首选 wire session id；零值由 server 分配。                             |
| `profileId`             | `number`                                                | 标准 token profile         | 请求的 profile registry id。                                           |
| `schemaId`              | `number`                                                | token-delta schema id      | 请求的 schema registry id。                                            |
| `schemaVersion`         | `number`                                                | token-delta schema version | 请求的 schema version。                                                |
| `priorityClass`         | [`NnrpSessionPriorityClass`](#nnrpsessionpriorityclass) | `Balanced`                 | 请求的调度类别。                                                       |
| `defaultDeadlineMillis` | `number`                                                | `500`                      | 默认 operation deadline。                                              |
| `maxInFlightOperations` | `number`                                                | `4`                        | 请求的 session 并发上限。                                              |
| `leaseTtlHintMillis`    | `number`                                                | `30000`                    | 请求的 cache lease lifetime。                                          |
| `allowResume`           | `boolean`                                               | `false`                    | 启用 resumable-session 协商。                                          |
| `resumeTokenBytes`      | `number`                                                | `0`                        | 本地接受的 opaque recovery-token 最大字节数；零值使用 runtime 默认值。 |
| `cacheHints`            | `readonly NnrpCacheObjectKind[]`                        | `[]`                       | 合入自动 `CLIENT_HELLO` 的 connection capability hint。                |

所有数值字段都按冻结 wire 宽度校验。Handle、generation、认证长度、extension 长度与 client tag 均由
runtime 派生或仅供内部使用，不是公开选项。Cadence、quality tier、application metadata、
submit-capacity policy 与本地 credit update 属于 profile、patch 或 flow-control API，不属于
`SESSION_OPEN`。

### `NnrpBrowserSessionOptions`

与 [`NnrpSessionOptions`](#nnrpsessionoptions) 具有相同字段和默认值，但作用域是 browser client。
Browser host 持有 WebSocket carrier；Rust WASM 持有 handshake、多 session、resume 与 recovery-ticket
语义。

### `NnrpEventPollOptions`

| 字段            | 类型                                     | 必填 | 说明                        |
| --------------- | ---------------------------------------- | ---: | --------------------------- |
| `timeoutMillis` | `number`                                 |   否 | Event 最大等待毫秒数。      |
| `signal`        | [`NnrpAbortSignalLike`](./core#数据类型) |   否 | 取消尚未完成的 event wait。 |
