# JavaScript/TypeScript WASM 浏览器 API

`@nnrp/wasm` 面向浏览器和 edge client。它校验 `nnrp-rs` WASM primitive manifest， 解析 WASM asset
URL，并暴露 browser client session。

## `openBrowserRuntime`

创建 browser runtime。

| 参数      | 类型                     | 必填 | 说明                                                                                           |
| --------- | ------------------------ | ---: | ---------------------------------------------------------------------------------------------- |
| `options` | `NnrpWasmRuntimeOptions` |   否 | Module URL、预编译 module、artifact manifest、transport policy 与 browser transport provider。 |

| 返回                          |
| ----------------------------- |
| `Promise<NnrpBrowserRuntime>` |

```ts
import { openBrowserRuntime } from "@nnrp/wasm";

const runtime = await openBrowserRuntime({
  moduleUrl: "/assets/nnrp_wasm.wasm",
});
```

## `NnrpBrowserRuntime.connect`

创建 browser client。

| 参数      | 类型                        | 必填 | 说明                                                     |
| --------- | --------------------------- | ---: | -------------------------------------------------------- |
| `options` | `NnrpBrowserConnectOptions` |   是 | Endpoint、可选 transport policy、可选 session defaults。 |

| 返回                |
| ------------------- |
| `NnrpBrowserClient` |

## `NnrpBrowserRuntime.selectTransport`

根据 peer manifest 和本地 provider slot 选择 browser transport。

| 参数      | 类型                                   | 必填 | 说明                              |
| --------- | -------------------------------------- | ---: | --------------------------------- |
| `options` | `NnrpBrowserTransportSelectionOptions` |   是 | Peer manifest 与可选 score 覆盖。 |

| 返回                            |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

## `NnrpBrowserClient.openSession`

打开 browser client session。

| 参数      | 类型                        | 必填 | 说明                                               |
| --------- | --------------------------- | ---: | -------------------------------------------------- |
| `options` | `NnrpBrowserSessionOptions` |   否 | Input profile、cadence、quality tier 和 metadata。 |

| 返回                       |
| -------------------------- |
| `NnrpBrowserClientSession` |

## `NnrpBrowserClientSession.submit`

在 WASM/transport 实现接入后提交请求并等待 result。

| 参数      | 类型                                   | 必填 | 说明             |
| --------- | -------------------------------------- | ---: | ---------------- |
| `request` | [`NnrpSubmitRequest`](./core#数据类型) |   是 | Submit request。 |

| 返回                  |
| --------------------- |
| `Promise<NnrpResult>` |

## `NnrpBrowserClientSession.cancel`

取消 operation。

| 参数        | 类型                | 必填 | 说明                 |
| ----------- | ------------------- | ---: | -------------------- |
| `operation` | `bigint \| number`  |   是 | Operation id。       |
| `options`   | `NnrpCancelOptions` |   否 | Reason 和 metadata。 |

| 返回            |
| --------------- |
| `Promise<void>` |

## `NnrpBrowserClientSession.nextEvent`

读取下一条 browser runtime event。

| 参数      | 类型                   | 必填 | 说明                 |
| --------- | ---------------------- | ---: | -------------------- |
| `options` | `NnrpEventPollOptions` |   否 | Event polling 选项。 |

| 返回                        |
| --------------------------- |
| `Promise<NnrpRuntimeEvent>` |

## WASM Artifact Helper

| API                                                        | 说明                                                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `createWasmRuntimeBinding(options?)`                       | 创建 browser manifest、module URL、可选 module、可选 artifact 和 browser transport providers。 |
| `resolveWasmArtifact(options)`                             | 校验 artifact manifest 并解析 WASM/types URL。                                                 |
| `validateWasmArtifactManifest(manifest, requiredExports?)` | 校验 `nnrp-wasm` primitive manifest 和必需 exports。                                           |
| `createBrowserTransportProvider(kind, options?)`           | 创建 `websocket` 或 `webtransport` browser transport provider slot。                           |

## 选项类型

### `NnrpWasmRuntimeOptions`

| 属性                 | 类型                                      | 必填 | 说明                                                |
| -------------------- | ----------------------------------------- | ---: | --------------------------------------------------- |
| `moduleUrl`          | `string \| URL`                           |   否 | 显式 WASM module URL。                              |
| `module`             | `WebAssembly.Module`                      |   否 | 预编译 module。                                     |
| `artifact`           | `NnrpWasmArtifactOptions`                 |   否 | `nnrp-rs` WASM primitive manifest 与可选 base URL。 |
| `transportPolicy`    | `NnrpTransportPolicy`                     |   否 | Browser transport selection policy。                |
| `transportProviders` | `readonly NnrpBrowserTransportProvider[]` |   否 | 本地 browser transport 可用性和 score 插槽。        |

### `NnrpWasmArtifactManifest`

| 属性                 | 类型                | 必填 | 说明                                    |
| -------------------- | ------------------- | ---: | --------------------------------------- |
| `package`            | `"nnrp-wasm"`       |   是 | Artifact package kind。                 |
| `wasm`               | `string`            |   是 | Artifact package 内的 WASM 文件路径。   |
| `types`              | `string`            |   是 | Artifact package 内的类型声明文件路径。 |
| `owner`              | `string`            |   否 | 产物来源仓库或 owner。                  |
| `downstream_wrapper` | `string`            |   否 | 下游 wrapper package。                  |
| `exports`            | `readonly string[]` |   是 | 导出的 WASM primitive 名称。            |

### `NnrpBrowserTransportProvider`

| 属性         | 类型                            | 必填 | 说明                            |
| ------------ | ------------------------------- | ---: | ------------------------------- |
| `kind`       | `"websocket" \| "webtransport"` |   是 | Browser transport kind。        |
| `available`  | `boolean`                       |   否 | 本地可用性覆盖。                |
| `score`      | `number`                        |   否 | 本地 score 覆盖。               |
| `diagnostic` | `NnrpDiagnostic`                |   否 | 本地不可用或降级 score 的原因。 |
