# JavaScript/TypeScript SDK Overview

`nnrp-js` provides ESM npm packages with `.d.ts` declarations for Node.js, Deno, browser, and edge
applications. Start with a role package, then install only the carrier providers the application is
allowed to use.

## Package Shape

| Package                     | Runtime                    | Purpose                                                                                                                       |
| --------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `@nnrp/core`                | Runtime-neutral            | Shared protocol types, control/object codecs, diagnostics, endpoint resolution, capability manifests, and provider selection. |
| `@nnrp/native-client`       | Node.js/Deno               | Native client/session role; no transport artifacts.                                                                           |
| `@nnrp/native-server`       | Node.js/Deno               | Native server/listen/session role; no transport artifacts.                                                                    |
| `@nnrp/browser-client`      | Browser/edge               | Browser client/session role plus the `nnrp-wasm-browser` runtime artifact.                                                    |
| `@nnrp/transport-tcp`       | Node.js/Deno               | TCP provider behavior and platform native artifacts.                                                                          |
| `@nnrp/transport-quic`      | Node.js/Deno               | QUIC provider behavior and platform native artifacts.                                                                         |
| `@nnrp/transport-ipc`       | Node.js/Deno               | IPC provider behavior and platform native artifacts.                                                                          |
| `@nnrp/transport-websocket` | Node.js/Deno, browser/edge | Native Rust WebSocket provider on backend hosts; host-WebSocket provider in browsers.                                         |

## Runtime Modes

| Mode                      | Role package           | Carrier packages                                  |
| ------------------------- | ---------------------- | ------------------------------------------------- |
| Backend native client     | `@nnrp/native-client`  | Any installed subset of TCP, QUIC, IPC, WebSocket |
| Backend native server     | `@nnrp/native-server`  | Any installed subset of TCP, QUIC, IPC, WebSocket |
| Browser client            | `@nnrp/browser-client` | `@nnrp/transport-websocket`                       |
| Shared validation/helpers | `@nnrp/core`           | None                                              |

Application endpoints stay `nnrp://` or `nnrps://`. Provider-local forms such as `unix://`,
`npipe://`, `ws://`, and `wss://` are for explicit provider overrides, diagnostics, and conformance
fixtures.

## Contents

- [Quick Start](./quick-start)
- [API Overview](./api)
- [Core Types](./api/core)
- [Client API](./api/client)
- [Server API](./api/server)
- [Runtime Control & Objects](./api/runtime)
- [Carrier Providers](./api/transport)
