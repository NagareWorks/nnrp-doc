# JavaScript/TypeScript — Native Runtime API

`@nnrp/native` 面向需要 `nnrp-rs` native runtime 的 Node.js 和 Deno 应用。CLI、coding agent、
运维 agent、后端服务以及 opencode 这类 adapter 集成，都应该走这个包。它延迟加载 native artifact，
并同时暴露 client-first 和 server surface。

## Native Client 使用流程

当 JavaScript 应用要消费 NNRP 服务时走这条路径，例如 coding agent、operator agent、桌面 helper 或 CLI。

1. 调用 [`openNativeClient`](#opennativeclient)。
2. 用 [`client.openSession`](#nnrpclient-opensession) 打开 session。
3. 用 [`session.submit`](#nnrpclientsession-submit) 或
   [`session.submitNoWait`](#nnrpclientsession-submitnowait) 提交工作。
4. 使用 non-blocking submit 时，用 [`session.nextEvent`](#nnrpclientsession-nextevent) 接收 runtime event。

## Native Server 使用流程

当 JavaScript 承载 NNRP 服务或 adapter 时走这条路径。

1. 调用 [`openBackendRuntime`](#openbackendruntime)。
2. 用 [`runtime.listen`](#nnrpbackendruntime-listen) 启动 listener。
3. 用 [`server.accept`](#nnrpserver-accept) 接受 session。
4. 通过 server session 接收 submit 并发送 result。

## `openNativeClient`

加载 native artifact，连接远端 NNRP endpoint，并返回可直接使用的 client。只需要 client role 的 Node/Deno
应用应该优先使用这个入口。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `options` | [`NnrpNativeClientOptions`](#nnrpnativeclientoptions) | 是 | native artifact 与 endpoint 选项 | runtime loading 加远端连接选项。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<NnrpClient>` | [`NnrpNativeBindingUnavailableError`](#nnrpnativebindingunavailableerror)、native、transport、握手或 capability 错误。 |

```ts
import { openNativeClient } from "@nnrp/native";

const client = await openNativeClient({
  endpoint: "127.0.0.1:4433",
  nativeLibrary: { artifactDir: "./native" },
  transportPolicy: "score",
});

const session = await client.openSession({ inputProfile: "tensor" });
const result = await session.submit({
  frameId: 1,
  payload: new Uint8Array([1, 2, 3]),
  inputProfile: "tensor",
  submitMode: "inline",
});
```

## `openBackendRuntime`

加载并校验 native artifact。包级 import 不得加载 native library。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `options` | [`NnrpBackendRuntimeOptions`](#nnrpbackendruntimeoptions) | 否 | 默认自动发现 | native artifact 与 transport policy 选项。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<NnrpBackendRuntime>` | [`NnrpNativeBindingUnavailableError`](#nnrpnativebindingunavailableerror)、manifest 校验错误。 |

```ts
const runtime = await openBackendRuntime({
  nativeLibrary: { artifactDir: "./native" },
  transportPolicy: "score",
});
```

## `NnrpBackendRuntime.connect`

作为 client 连接远端 NNRP endpoint。应用已经持有 runtime，或者同时需要 server API / 显式 runtime
lifecycle control 时使用这个入口。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `options` | [`NnrpConnectOptions`](#nnrpconnectoptions) | 是 | endpoint 和可选策略 | 远端连接选项。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<NnrpClient>` | native、transport、握手或 capability 错误。 |

```ts
const client = await runtime.connect({
  endpoint: "127.0.0.1:4433",
  transportPolicy: "score",
});
```

## `NnrpBackendRuntime.listen`

启动 server listener。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `options` | [`NnrpListenOptions`](#nnrplistenoptions) | 是 | endpoint 和可选策略 | 本地监听选项。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<NnrpServer>` | native、bind 或 transport 错误。 |

## `NnrpClient.openSession`

打开 client session。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `options` | [`NnrpSessionOptions`](#nnrpsessionoptions) | 否 | 默认 runtime profile | session profile 和 metadata。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<NnrpClientSession>` | session-open 拒绝或 transport 错误。 |

```ts
const session = await client.openSession({ inputProfile: "tensor" });
```

## `NnrpClientSession.submit`

提交一个请求并等待匹配结果。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `request` | [`NnrpSubmitRequest`](./core#nnrpsubmitrequest) | 是 | `frameId` 在 in-flight 中唯一 | 结构化提交请求。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<NnrpResult>` | native、transport、timeout、drop 或关联错误。 |

```ts
const result = await session.submit({
  frameId: 1,
  payload: new Uint8Array([1, 2, 3]),
  inputProfile: "tensor",
  submitMode: "inline",
});
```

## `NnrpClientSession.submitNoWait`

提交请求并返回 native operation id。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `request` | [`NnrpSubmitRequest`](./core#nnrpsubmitrequest) | 是 | `frameId` 在 in-flight 中唯一 | 结构化提交请求。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<bigint>` | native、transport 或本地校验错误。 |

## `NnrpServer.accept`

接受 server session。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| 无 | - | - | - | 使用 `runtime.listen` 创建的 listener。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<NnrpServerSession>` | accept、session-open 或 transport 错误。 |

## `NnrpServerSession.sendResult`

向 client 发送结果。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `result` | [`NnrpResult`](./core#nnrpresult) | 是 | 必须匹配已提交 frame/operation | 结果 payload 和诊断信息。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<void>` | native、序列化、生命周期或 transport 错误。 |

## 核心类型

### `NnrpNativeClientOptions`

| 属性 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `endpoint` | `string \| URL` | 是 | 远端 NNRP endpoint。 |
| `nativeLibrary` | [`NnrpNativeLibraryOptions`](#nnrpnativelibraryoptions) | 否 | native artifact 发现选项。 |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#transport-selection) | 否 | client transport 策略。 |
| `sessionDefaults` | [`NnrpSessionOptions`](#nnrpsessionoptions) | 否 | session 未显式提供字段时使用的默认值。 |

### `NnrpBackendRuntimeOptions`

| 属性 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `nativeLibrary` | [`NnrpNativeLibraryOptions`](#nnrpnativelibraryoptions) | 否 | native artifact 发现选项。 |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#transport-selection) | 否 | runtime transport 策略。 |

### `NnrpNativeLibraryOptions`

| 属性 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `path` | `string` | 否 | 显式 native library 路径。 |
| `artifactDir` | `string` | 否 | native artifact 目录。 |
| `requiredSymbols` | `readonly string[]` | 否 | runtime 创建前必须存在的 ABI symbols。 |

### `NnrpNativeArtifact`

| 属性 | 类型 | 说明 |
|---|---|---|
| `platform` | `string` | artifact platform tag。 |
| `arch` | `string` | artifact architecture tag。 |
| `libraryPath` | `string` | native library 路径。 |
| `manifestPath` | `string` | artifact manifest 路径。 |
| `symbols` | `readonly string[]` | 导出的 ABI symbols。 |
| `abiVersion` | `string` | native ABI version。 |

### `NnrpSessionOptions`

| 属性 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `inputProfile` | [`NnrpInputProfile`](./core#payloads-and-submit-requests) | 否 | 默认 session input profile。 |
| `targetCadence` | `number` | 否 | 目标 cadence 或 FPS。 |
| `qualityTier` | `number` | 否 | 应用质量档位。 |
| `metadata` | `Readonly<Record<string, string>>` | 否 | 应用 metadata。 |

## Conformance 与 Benchmark 入口

```bash
deno task conformance:backend
deno task benchmark:backend
```

## 常见坑

::: warning
1. 不要在模块 import 时加载 native artifact；只有 `openNativeClient` 和 `openBackendRuntime` 可以加载。
2. 只需要 client 的 Node/Deno 应用应该优先用 `openNativeClient`，不要为了 connect 手动创建 runtime。
3. `quic-only` 这类显式策略不可用时必须失败，不能静默降级。
4. native 包不得包含浏览器专用 transport 或 DOM 依赖。
:::
