# JavaScript/TypeScript API

Start from the API role first. Runtime differences are called out inside each role page.

| Role                      | Packages                                                                                          | First API                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client                    | `@nnrp/native-client`, `@nnrp/browser-client`                                                     | [`openNativeClient`](./api/client#opennativeclient) or [`openBrowserRuntime`](./api/client#openbrowserruntime)                                                                    |
| Server                    | `@nnrp/native-server`                                                                             | [`openBackendRuntime`](./api/server#openbackendruntime)                                                                                                                           |
| Carrier providers         | `@nnrp/transport-tcp`, `@nnrp/transport-quic`, `@nnrp/transport-ipc`, `@nnrp/transport-websocket` | [`createTcpTransportProvider`](./api/transport#provider-factories), `createQuicTransportProvider`, `createIpcTransportProvider`, `createWebSocketTransportProvider`               |
| Shared validation/helpers | `@nnrp/core`                                                                                      | [`createCapabilityManifest`](./api/core#createcapabilitymanifest), [`normalizeSubmitRequest`](./api/core#normalizesubmitrequest), [`selectTransport`](./api/core#selecttransport) |

## Package Boundary Rules

| Package                     | May own                                                                       | Must not hide                                                 |
| --------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `@nnrp/core`                | Runtime-neutral TypeScript contracts.                                         | Native loaders, WASM loaders, Node built-ins, or DOM globals. |
| `@nnrp/native-client`       | Client role surface and native client lifecycle.                              | Transport artifacts or server-only entrypoints.               |
| `@nnrp/native-server`       | Server role surface and native server lifecycle.                              | Transport artifacts or browser code.                          |
| `@nnrp/browser-client`      | Browser client surface and browser WASM primitives.                           | Native `.dll` / `.so` / `.dylib` payloads or server APIs.     |
| `@nnrp/transport-tcp`       | TCP provider behavior and native artifacts.                                   | QUIC, WebSocket, browser, or server role behavior.            |
| `@nnrp/transport-quic`      | QUIC provider behavior and native artifacts.                                  | TCP, WebSocket, browser, or server role behavior.             |
| `@nnrp/transport-ipc`       | IPC provider behavior and native artifacts.                                   | Browser or non-IPC transport behavior.                        |
| `@nnrp/transport-websocket` | Native Rust WebSocket provider plus browser host-WebSocket provider behavior. | Browser WASM artifact or role lifecycle.                      |

## API Reference

- [Core Types](./api/core)
- [Client](./api/client)
- [Server](./api/server)
- [Transport Providers](./api/transport)
- [Native Runtime Notes](./api/native)
- [Browser Runtime Notes](./api/wasm)
