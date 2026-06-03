# JavaScript/TypeScript API

先根据 API 角色查文档；native/browser 的运行时差异会在对应角色页内标注。

| 角色               | 包                                                                         | 起始 API                                                                                                                                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Client             | `@nnrp/native-client`、`@nnrp/browser-client`                              | [`openNativeClient`](./api/client#opennativeclient) 或 [`openBrowserRuntime`](./api/client#openbrowserruntime)                                                                                                                                   |
| Server             | `@nnrp/native-server`                                                      | [`openBackendRuntime`](./api/server#openbackendruntime)                                                                                                                                                                                          |
| Transport provider | `@nnrp/transport-tcp`、`@nnrp/transport-quic`、`@nnrp/transport-websocket` | [`createTcpTransportProvider`](./api/transport#createtcptransportprovider)、[`createQuicTransportProvider`](./api/transport#createquictransportprovider)、[`createWebSocketTransportProvider`](./api/transport#createwebsockettransportprovider) |
| 共享校验与 helper  | `@nnrp/core`                                                               | [`createCapabilityManifest`](./api/core#createcapabilitymanifest)、[`normalizeSubmitRequest`](./api/core#normalizesubmitrequest)、[`selectTransport`](./api/core#selecttransport)                                                                |

## 包边界规则

| 包                          | 可以拥有                                                                                               | 不能隐藏                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `@nnrp/core`                | 运行时无关 TypeScript contract。                                                                       | Native loader、WASM loader、Node built-in 或 DOM global。 |
| `@nnrp/native-client`       | Client role surface 与 native client lifecycle。                                                       | TCP/QUIC artifact 或 server-only entrypoint。             |
| `@nnrp/native-server`       | Server role surface 与 native server lifecycle。                                                       | TCP/QUIC artifact 或 browser code。                       |
| `@nnrp/browser-client`      | Browser client surface 与 browser WASM primitives。                                                    | Native `.dll` / `.so` / `.dylib` 产物或 server API。      |
| `@nnrp/transport-tcp`       | TCP provider 行为、native artifact 与 WASM transport primitives。                                      | QUIC 或 WebSocket 行为。                                  |
| `@nnrp/transport-quic`      | QUIC provider 行为、native artifact 与 WASM transport primitives。                                     | TCP 或 WebSocket 行为。                                   |
| `@nnrp/transport-websocket` | 宿主 WebSocket provider 行为，适用于浏览器、edge runtime 或提供 WebSocket implementation 的后端 host。 | Rust native/WASM transport artifact。                     |

## API 参考

- [核心类型](./api/core)
- [Client](./api/client)
- [Server](./api/server)
- [Transport Provider](./api/transport)
- [Native Runtime 说明](./api/native)
- [Browser Runtime 说明](./api/wasm)
