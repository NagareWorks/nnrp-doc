# JavaScript/TypeScript API

Start from the API role first. Runtime differences are called out inside each role page.

| Role                      | Packages                                                                   | First API                                                                                                                                                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Client                    | `@nnrp/native-client`, `@nnrp/browser-client`                              | [`openNativeClient`](./api/client#opennativeclient) or [`openBrowserRuntime`](./api/client#openbrowserruntime)                                                                                                                                   |
| Server                    | `@nnrp/native-server`                                                      | [`openBackendRuntime`](./api/server#openbackendruntime)                                                                                                                                                                                          |
| Transport providers       | `@nnrp/transport-tcp`, `@nnrp/transport-quic`, `@nnrp/transport-websocket` | [`createTcpTransportProvider`](./api/transport#createtcptransportprovider), [`createQuicTransportProvider`](./api/transport#createquictransportprovider), [`createWebSocketTransportProvider`](./api/transport#createwebsockettransportprovider) |
| Shared validation/helpers | `@nnrp/core`                                                               | [`createCapabilityManifest`](./api/core#createcapabilitymanifest), [`normalizeSubmitRequest`](./api/core#normalizesubmitrequest), [`selectTransport`](./api/core#selecttransport)                                                                |

## Package Boundary Rules

| Package                     | May own                                                                                                         | Must not hide                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `@nnrp/core`                | Runtime-neutral TypeScript contracts.                                                                           | Native loaders, WASM loaders, Node built-ins, or DOM globals. |
| `@nnrp/native-client`       | Client role surface and native client lifecycle.                                                                | TCP/QUIC artifacts or server-only entrypoints.                |
| `@nnrp/native-server`       | Server role surface and native server lifecycle.                                                                | TCP/QUIC artifacts or browser code.                           |
| `@nnrp/browser-client`      | Browser client surface and browser WASM primitives.                                                             | Native `.dll` / `.so` / `.dylib` payloads or server APIs.     |
| `@nnrp/transport-tcp`       | TCP provider behavior, native artifacts, and WASM transport primitives.                                         | QUIC or WebSocket behavior.                                   |
| `@nnrp/transport-quic`      | QUIC provider behavior, native artifacts, and WASM transport primitives.                                        | TCP or WebSocket behavior.                                    |
| `@nnrp/transport-websocket` | Host WebSocket provider behavior for browsers, edge runtimes, or backend hosts with a WebSocket implementation. | Rust native/WASM transport artifacts.                         |

## API Reference

- [Core Types](./api/core)
- [Client](./api/client)
- [Server](./api/server)
- [Transport Providers](./api/transport)
- [Native Runtime Notes](./api/native)
- [Browser Runtime Notes](./api/wasm)
