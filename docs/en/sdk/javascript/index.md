# JavaScript/TypeScript SDK Overview

`nnrp-js` provides the JavaScript and TypeScript SDK packages for NNRP applications. The workspace
uses Deno for development, while npm packages are ESM with `.d.ts` declarations for Node.js, Deno,
browser, and edge consumers.

## Package Shape

| Package                     | Runtime                                | Purpose                                                                                                                                                      |
| --------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@nnrp/core`                | Runtime-neutral                        | Shared protocol types, diagnostics, capability manifests, submit/result helpers, and transport selection.                                                    |
| `@nnrp/native-client`       | Node.js and Deno backend hosts         | Native client/session entrypoint. It does not bundle transport artifacts.                                                                                    |
| `@nnrp/native-server`       | Node.js and Deno backend hosts         | Native server/listen/session entrypoint. It does not bundle transport artifacts.                                                                             |
| `@nnrp/browser-client`      | Browser and edge clients               | Browser client/session entrypoint with packaged browser WASM primitives.                                                                                     |
| `@nnrp/transport-tcp`       | Native and WASM-capable transport slot | TCP transport provider package with full-platform native artifacts and WASM primitives.                                                                      |
| `@nnrp/transport-quic`      | Native and WASM-capable transport slot | QUIC transport provider package with full-platform native artifacts and WASM primitives.                                                                     |
| `@nnrp/transport-websocket` | Host WebSocket transport slot          | WebSocket transport provider for browsers, edge runtimes, or backend hosts with a WebSocket implementation; it does not depend on a Rust WebSocket artifact. |

Install a role package for the surface you call, then install the transport packages that should be
available for probing. TCP and QUIC artifacts live in their transport packages, not in the native
client/server role packages.

## Runtime Modes

| Mode                      | Role package           | Transport packages                                                                                                                            |
| ------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend native client     | `@nnrp/native-client`  | `@nnrp/transport-tcp`, `@nnrp/transport-quic`                                                                                                 |
| Backend native server     | `@nnrp/native-server`  | `@nnrp/transport-tcp`, `@nnrp/transport-quic`                                                                                                 |
| Browser client            | `@nnrp/browser-client` | `@nnrp/transport-websocket`; add `@nnrp/transport-tcp` / `@nnrp/transport-quic` when the host exposes TCP/QUIC-capable WASM transport bridges |
| Shared validation/helpers | `@nnrp/core`           | None                                                                                                                                          |

`@nnrp/core` must stay runtime-neutral. Native role packages must not carry browser-only transports
or transport artifacts. Transport packages own transport behavior and the artifacts needed for that
transport.

## Current Package State

The published preview packages are available on npm as `1.0.0-preview.3.4` and are also tagged as
`latest` and `preview`. TCP and QUIC package tarballs include all supported `.dll`, `.so`, `.dylib`,
manifest, and WASM files, so browser/edge deployments can use those providers when their host
exposes the required network capability. WebSocket remains a small package that does not depend on a
Rust WebSocket artifact.

## Contents

- [Quick Start](./quick-start)
- [API Overview](./api)
- [Core Types](./api/core)
- [Client API](./api/client)
- [Server API](./api/server)
- [Transport Providers](./api/transport)
