# JavaScript/TypeScript SDK 概览

`nnrp-js` 提供适用于 Node.js、Deno、browser 和 edge 应用的 ESM npm 包与 `.d.ts` 声明。先选择 role
package，再只安装应用允许使用的载体 Provider。

## 包形态

| 包                          | 运行时                     | 用途                                                                                       |
| --------------------------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| `@nnrp/core`                | 运行时无关                 | 共享协议类型、控制/对象 codec、诊断、endpoint 解析、capability manifest 与 Provider 选择。 |
| `@nnrp/native-client`       | Node.js/Deno               | Native client/session role；不带 transport artifact。                                      |
| `@nnrp/native-server`       | Node.js/Deno               | Native server/listen/session role；不带 transport artifact。                               |
| `@nnrp/browser-client`      | Browser/edge               | Browser client/session role 与 `nnrp-wasm-browser` runtime artifact。                      |
| `@nnrp/transport-tcp`       | Node.js/Deno               | TCP Provider 行为与当前平台 native artifact。                                              |
| `@nnrp/transport-quic`      | Node.js/Deno               | QUIC Provider 行为与当前平台 native artifact。                                             |
| `@nnrp/transport-ipc`       | Node.js/Deno               | IPC Provider 行为与当前平台 native artifact。                                              |
| `@nnrp/transport-websocket` | Node.js/Deno、browser/edge | 后端宿主使用 native Rust WebSocket Provider；浏览器使用 host-WebSocket Provider。          |

## 运行模式

| 模式                  | Role package           | 载体 package                               |
| --------------------- | ---------------------- | ------------------------------------------ |
| Backend native client | `@nnrp/native-client`  | TCP、QUIC、IPC、WebSocket 的任意已安装子集 |
| Backend native server | `@nnrp/native-server`  | TCP、QUIC、IPC、WebSocket 的任意已安装子集 |
| Browser client        | `@nnrp/browser-client` | `@nnrp/transport-websocket`                |
| 共享校验与 helper     | `@nnrp/core`           | 无                                         |

应用 endpoint 始终使用 `nnrp://` 或 `nnrps://`。`unix://`、`npipe://`、`ws://`、`wss://` 等
Provider-local form 只用于显式 Provider 覆盖、诊断和一致性测试 fixture。

## 目录

- [快速使用](./quick-start)
- [API 总览](./api)
- [核心类型](./api/core)
- [Client API](./api/client)
- [Server API](./api/server)
- [运行时控制与对象](./api/runtime)
- [载体 Provider](./api/transport)
