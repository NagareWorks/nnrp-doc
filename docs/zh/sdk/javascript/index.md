# JavaScript/TypeScript SDK 概览

`nnrp-js` 提供 NNRP 应用使用的 JavaScript 与 TypeScript SDK 包。仓库使用 Deno 作为开发工具链， npm
包输出为 ESM 与 `.d.ts` 声明，面向 Node.js、Deno、浏览器和 edge 消费者。

## 包形态

| 包                          | 运行时                        | 用途                                                                                                      |
| --------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `@nnrp/core`                | 运行时无关                    | 共享协议类型、诊断、capability manifest、submit/result helper 与 transport selection。                    |
| `@nnrp/native-client`       | Node.js 与 Deno 后端宿主      | Native client/session 入口；不捆绑 transport artifact。                                                   |
| `@nnrp/native-server`       | Node.js 与 Deno 后端宿主      | Native server/listen/session 入口；不捆绑 transport artifact。                                            |
| `@nnrp/browser-client`      | 浏览器与 edge client          | Browser client/session 入口，内置浏览器 WASM primitives。                                                 |
| `@nnrp/transport-tcp`       | Native transport slot         | TCP transport provider 包，带全平台 native artifact。                                                     |
| `@nnrp/transport-quic`      | Native transport slot         | QUIC transport provider 包，带全平台 native artifact。                                                    |
| `@nnrp/transport-websocket` | 宿主 WebSocket transport slot | 面向浏览器和 edge runtime 的 client-side WebSocket transport provider；它不依赖 Rust WebSocket artifact。 |

安装时先选择实际调用的 role package，再安装允许参与探测的 transport package。TCP 与 QUIC 产物归属
各自 transport 包，而不是隐藏在 native client/server role 包里。

## 运行模式

| 模式                  | Role package           | Transport package                             |
| --------------------- | ---------------------- | --------------------------------------------- |
| Backend native client | `@nnrp/native-client`  | `@nnrp/transport-tcp`、`@nnrp/transport-quic` |
| Backend native server | `@nnrp/native-server`  | `@nnrp/transport-tcp`、`@nnrp/transport-quic` |
| Browser client        | `@nnrp/browser-client` | `@nnrp/transport-websocket`                   |
| 共享校验与 helper     | `@nnrp/core`           | 无                                            |

`@nnrp/core` 必须保持运行时无关。Native role 包不能夹带浏览器 transport 或 transport artifact。
Transport 包负责自己的 transport 行为与所需产物。

## 当前包状态

当前发布的 preview 包版本为 `1.0.0-preview.3.5`，npm 上同时指向 `latest` 和 `preview`。 TCP 与 QUIC
tarball 包含 backend host 使用的 native artifact。WebSocket 仍然是 browser client transport
package， 并且不依赖 Rust WebSocket artifact。

## 目录

- [快速使用](./quick-start)
- [API 总览](./api)
- [核心类型](./api/core)
- [Client API](./api/client)
- [Server API](./api/server)
- [Transport Provider](./api/transport)
