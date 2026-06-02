# JavaScript/TypeScript API

先根据宿主选择 runtime 包：

| 宿主                       | 包             | 起始 API                                                                                                                                                                          |
| -------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js/Deno client 或服务 | `@nnrp/native` | [`openNativeClient`](./api/native#opennativeclient) 或 [`openBackendRuntime`](./api/native#openbackendruntime)                                                                    |
| 浏览器或 edge client       | `@nnrp/wasm`   | [`openBrowserRuntime`](./api/wasm#openbrowserruntime)                                                                                                                             |
| 共享校验与 helper          | `@nnrp/core`   | [`createCapabilityManifest`](./api/core#createcapabilitymanifest)、[`normalizeSubmitRequest`](./api/core#normalizesubmitrequest)、[`selectTransport`](./api/core#selecttransport) |

## 包边界规则

| 包             | 可以导入                                                 | 不能暴露                                                |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| `@nnrp/core`   | 运行时无关 TypeScript                                    | Native loader、WASM loader、Node built-in、DOM global。 |
| `@nnrp/native` | Node-compatible filesystem/process/native-loading helper | 浏览器 transport 实现文件或 DOM global。                |
| `@nnrp/wasm`   | 浏览器与 WebAssembly API                                 | Server session、native library loader、`node:*` 模块。  |

## API 参考

- [核心类型](./api/core)
- [Native 后端 Runtime](./api/native)
- [WASM 浏览器 Runtime](./api/wasm)
