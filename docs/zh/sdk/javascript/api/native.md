# JavaScript/TypeScript — Native Backend API

`@nnrp/native` 面向 Node.js 和 Deno 后端服务。它加载 `nnrp-rs` native artifact，打开 backend runtime，并暴露 client 和 server surface。

## Backend 使用流程

1. 调用 [`openBackendRuntime`](#openbackendruntime)。
2. client 模式使用 [`runtime.connect`](#nnrpbackendruntime-connect)，server 模式使用
   [`runtime.listen`](#nnrpbackendruntime-listen)。
3. 使用 [`client.openSession`](#nnrpclient-opensession) 或 [`server.accept`](#nnrpserver-accept) 打开 session。
4. 通过 session 方法 submit、receive、send result、close。

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

作为 client 连接远端 NNRP backend。

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
1. 不要在模块 import 时加载 native artifact；只有 `openBackendRuntime` 可以加载。
2. backend native 包不得包含浏览器专用 transport 或 DOM 依赖。
3. `quic-only` 这类显式策略不可用时必须失败，不能静默降级。
:::
