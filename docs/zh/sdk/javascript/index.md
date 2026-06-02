# JavaScript/TypeScript SDK 概览

`nnrp-js` 提供 NNRP 应用使用的 JavaScript 与 TypeScript SDK 包。仓库用 Deno 作为开发工具链，
发布输出为 ESM 与 `.d.ts` 声明，面向 Node.js、Deno 兼容后端宿主、浏览器客户端与 edge 客户端。

SDK 分为三个包：

| 包             | 运行时                   | 主要用途                                                                                                             |
| -------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `@nnrp/core`   | 运行时无关               | 共享协议常量、诊断、submit/result 形态、capability manifest 与 transport selection helper。                          |
| `@nnrp/native` | Node.js 与 Deno 后端宿主 | Native artifact manifest 校验、后端 runtime 生命周期、client session、server session 与粗粒度 native FFI 插槽。      |
| `@nnrp/wasm`   | 浏览器与 edge client     | WASM primitive manifest 校验、浏览器 client runtime 生命周期、browser session API 与浏览器 transport provider 插槽。 |

## 运行模式

| 模式           | 包             | 能力                                                                                   |
| -------------- | -------------- | -------------------------------------------------------------------------------------- |
| Backend native | `@nnrp/native` | Client session、server listener、TCP/QUIC capability claim、native artifact 诊断。     |
| Browser WASM   | `@nnrp/wasm`   | Browser client session、WebSocket/WebTransport capability claim、WASM primitive 诊断。 |
| Core           | `@nnrp/core`   | 只包含共享类型和 helper。                                                              |

`@nnrp/core` 不能导入 native loader、WASM loader、Node built-in 或 DOM API。`@nnrp/native`
不能携带浏览器专用代码。`@nnrp/wasm` 不能导入 `node:*` 模块，也不能暴露 server API。

## 当前包状态

SDK 包已经具备 package export map、声明输出、package smoke check、runtime policy check、 conformance
命令、benchmark 命令和 release dry-run workflow。Native 与 WASM artifact 都先通过 manifest
gate，再暴露加速 runtime 路径。

## 目录

- [快速使用](./quick-start)
- [API 总览](./api)
- [核心类型](./api/core)
- [Native 后端 Runtime](./api/native)
- [WASM 浏览器 Runtime](./api/wasm)
