# JavaScript/TypeScript API

Start from the runtime package that matches the host:

| Host                           | Package        | First API                                                                                                                                                                         |
| ------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js/Deno client or service | `@nnrp/native` | [`openNativeClient`](./api/native#opennativeclient) or [`openBackendRuntime`](./api/native#openbackendruntime)                                                                    |
| Browser or edge client         | `@nnrp/wasm`   | [`openBrowserRuntime`](./api/wasm#openbrowserruntime)                                                                                                                             |
| Shared validation/helpers      | `@nnrp/core`   | [`createCapabilityManifest`](./api/core#createcapabilitymanifest), [`normalizeSubmitRequest`](./api/core#normalizesubmitrequest), [`selectTransport`](./api/core#selecttransport) |

## Package Boundary Rules

| Package        | May import                                                | Must not expose                                            |
| -------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| `@nnrp/core`   | Runtime-neutral TypeScript only                           | Native loaders, WASM loaders, Node built-ins, DOM globals. |
| `@nnrp/native` | Node-compatible filesystem/process/native-loading helpers | Browser transport implementation files or DOM globals.     |
| `@nnrp/wasm`   | Browser/WebAssembly APIs                                  | Server sessions, native library loaders, `node:*` modules. |

## API Reference

- [Core Types](./api/core)
- [Native Backend Runtime](./api/native)
- [WASM Browser Runtime](./api/wasm)
