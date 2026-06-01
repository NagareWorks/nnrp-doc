# JavaScript/TypeScript — WASM Browser Client API

`@nnrp/wasm` 面向浏览器和 edge client。它加载 WASM artifact，暴露 client session，并通过 WebSocket/WebTransport 这类浏览器 transport adapter 工作。

## Browser 使用流程

1. 调用 [`openBrowserRuntime`](#openbrowserruntime)。
2. 用 [`runtime.connect`](#nnrpbrowserruntime-connect) 连接。
3. 用 [`client.openSession`](#nnrpbrowserclient-opensession) 打开 session。
4. 用 [`session.submit`](#nnrpbrowsersession-submit) 或 [`submitNoWait`](#nnrpbrowsersession-submitnowait) 提交。
5. 用 [`nextEvent`](#nnrpbrowsersession-nextevent) 读取事件。
6. 关闭 session、client 和 runtime。

## `openBrowserRuntime`

加载 WASM module 并校验 manifest。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `options` | [`NnrpWasmOptions`](#nnrpwasmoptions) | 否 | URL、module、manifest、fetch 选项 | WASM loader 配置。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<NnrpBrowserRuntime>` | manifest、fetch、compile 或版本校验错误。 |

```ts
const runtime = await openBrowserRuntime({
  wasmUrl: new URL("/assets/nnrp_wasm_bg.wasm", location.href),
  manifestUrl: new URL("/assets/nnrp_wasm_manifest.json", location.href),
});
```

## `NnrpBrowserRuntime.connect`

连接浏览器可用 transport endpoint。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `options` | [`NnrpBrowserConnectOptions`](#nnrpbrowserconnectoptions) | 是 | endpoint 和浏览器 transport 策略 | browser client 连接选项。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<NnrpBrowserClient>` | 浏览器 transport、策略或握手错误。 |

```ts
const client = await runtime.connect({
  endpoint: new URL("wss://example.test/nnrp"),
  transportPolicy: "score",
});
```

## `NnrpBrowserClient.openSession`

打开 browser client session。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `options` | [`NnrpSessionOptions`](./native#nnrpsessionoptions) | 否 | 默认 runtime profile | session 选项。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<NnrpBrowserSession>` | session-open 拒绝或 transport 错误。 |

## `NnrpBrowserSession.submit`

提交一个请求并等待匹配结果。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `request` | [`NnrpSubmitRequest`](./core#nnrpsubmitrequest) | 是 | `frameId` 在 in-flight 中唯一 | 结构化提交请求。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<NnrpResult>` | WASM、transport、timeout、drop 或关联错误。 |

```ts
const result = await session.submit({
  frameId: 1,
  payload: new Uint8Array([1, 2, 3]),
  inputProfile: "tensor",
  submitMode: "inline",
});
```

## `NnrpBrowserSession.submitNoWait`

提交请求并返回 operation id。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `request` | [`NnrpSubmitRequest`](./core#nnrpsubmitrequest) | 是 | `frameId` 在 in-flight 中唯一 | 结构化提交请求。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<bigint>` | WASM、transport 或校验错误。 |

## `NnrpBrowserSession.nextEvent`

接收下一条 browser runtime event。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| 无 | - | - | - | 读取下一条 runtime event。 |

| 返回 | 可能抛出 |
|---|---|
| `Promise<NnrpRuntimeEvent>` | WASM 或 transport 错误。 |

## Browser Transport Provider

Browser transport 是 adapter slot，不是协议语义本身。

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `probe` | `string \| URL` | `Promise<NnrpTransportCandidate>` | 探测 endpoint。 |
| `connect` | `string \| URL` | `Promise<NnrpBrowserTransport>` | 连接 endpoint。 |

## 核心类型

### `NnrpWasmOptions`

| 属性 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `wasmUrl` | `string \| URL` | 否 | WASM artifact URL。 |
| `wasmModule` | `WebAssembly.Module` | 否 | 预编译 WASM module。 |
| `manifestUrl` | `string \| URL` | 否 | WASM manifest URL。 |
| `fetch` | `typeof globalThis.fetch` | 否 | fetch 实现覆盖。 |

### `NnrpBrowserConnectOptions`

| 属性 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `endpoint` | `string \| URL` | 是 | 远端浏览器 transport endpoint。 |
| `transportPolicy` | `"score" \| "websocket-only" \| "webtransport-only"` | 否 | 浏览器 transport 策略。 |

## Conformance 与 Benchmark 入口

```bash
deno task conformance:browser
deno task benchmark:browser
```

## 常见坑

::: warning
1. Browser mode 不暴露 `listen`、`accept`、server session 或 native artifact resolver。
2. 浏览器包不得导入 Node built-in。
3. WebSocket / WebTransport 是 adapter；transport scoring 仍由 `@nnrp/core` 提供。
:::
