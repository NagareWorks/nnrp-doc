# JavaScript/TypeScript SDK 概览

`nnrp-js` 提供 NNRP 应用使用的 JavaScript 与 TypeScript SDK 包。仓库使用 Deno 作为开发工具链， npm
包输出为 ESM 与 `.d.ts` 声明，面向 Node.js、Deno、浏览器和 edge 消费者。

## 包形态

| 包                          | 运行时                        | 用途                                                                                                                                     |
| --------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `@nnrp/core`                | 运行时无关                    | 共享协议类型、诊断、capability manifest、submit/result helper 与 transport selection。                                                   |
| `@nnrp/native-client`       | Node.js 与 Deno 后端宿主      | Native client/session 入口；不捆绑 transport artifact。                                                                                  |
| `@nnrp/native-server`       | Node.js 与 Deno 后端宿主      | Native server/listen/session 入口；不捆绑 transport artifact。                                                                           |
| `@nnrp/browser-client`      | 浏览器与 edge client          | Browser client/session 入口，内置浏览器 WASM primitives。                                                                                |
| `@nnrp/transport-tcp`       | Native / WASM transport slot  | TCP transport provider 包，带全平台 native artifact 与 WASM primitives。                                                                 |
| `@nnrp/transport-quic`      | Native / WASM transport slot  | QUIC transport provider 包，带全平台 native artifact 与 WASM primitives。                                                                |
| `@nnrp/transport-websocket` | 宿主 WebSocket transport slot | WebSocket transport provider，适用于浏览器、edge runtime 或提供 WebSocket implementation 的后端 host；它不依赖 Rust WebSocket artifact。 |

安装时先选择实际调用的 role package，再安装允许参与探测的 transport package。TCP 与 QUIC 产物归属
各自 transport 包，而不是隐藏在 native client/server role 包里。

## 运行模式

| 模式                  | Role package           | Transport package                                                                                                                         |
| --------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Backend native client | `@nnrp/native-client`  | `@nnrp/transport-tcp`、`@nnrp/transport-quic`                                                                                             |
| Backend native server | `@nnrp/native-server`  | `@nnrp/transport-tcp`、`@nnrp/transport-quic`                                                                                             |
| Browser client        | `@nnrp/browser-client` | `@nnrp/transport-websocket`；如果宿主暴露 TCP/QUIC-capable WASM transport bridge，也可加入 `@nnrp/transport-tcp` / `@nnrp/transport-quic` |
| 共享校验与 helper     | `@nnrp/core`           | 无                                                                                                                                        |

`@nnrp/core` 必须保持运行时无关。Native role 包不能夹带浏览器 transport 或 transport artifact。
Transport 包负责自己的 transport 行为与所需产物。

## 当前包状态

当前发布的 preview 包版本为 `1.0.0-preview.3.4`，npm 上同时指向 `latest` 和 `preview`。 TCP 与 QUIC
tarball 包含所有支持平台的 `.dll`、`.so`、`.dylib`、manifest 与 WASM 文件；browser/edge
部署在宿主提供对应网络能力时也可以启用这些 provider。WebSocket 仍然是不依赖 Rust WebSocket artifact
的小型包。

## 目录

- [快速使用](./quick-start)
- [API 总览](./api)
- [核心类型](./api/core)
- [Client API](./api/client)
- [Server API](./api/server)
- [Transport Provider](./api/transport)
