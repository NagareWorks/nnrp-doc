# JavaScript/TypeScript Browser Runtime Notes

Browser and edge clients use [`@nnrp/browser-client`](./client#openbrowserruntime). The browser
client package carries browser WASM primitives and exposes the same client session workflow
described in the [Client API](./client).

## Browser Transport

Use [`@nnrp/transport-websocket`](./transport#createwebsockettransportprovider) for the default
browser-native transport. The current browser client API accepts WebSocket providers. TCP and QUIC
provider packages are native host packages.

WebSocket does not bundle Rust native or browser WASM artifacts because the Rust runtime does not
expose a WebSocket transport implementation.

## WASM Artifact Helpers

| API                                                        | Description                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `createWasmRuntimeBinding(options?)`                       | Creates a browser manifest, module URL, optional module, optional artifact, and browser transport providers. |
| `resolveWasmArtifact(options)`                             | Validates an artifact manifest and resolves WASM/types URLs.                                                 |
| `validateWasmArtifactManifest(manifest, requiredExports?)` | Validates the WASM primitive manifest and required exports.                                                  |

## Runtime Boundary

| Package                     | Includes native `.dll` / `.so` / `.dylib` | Includes browser WASM primitives |
| --------------------------- | ----------------------------------------- | -------------------------------- |
| `@nnrp/browser-client`      | No                                        | Yes                              |
| `@nnrp/transport-websocket` | No                                        | No                               |
| `@nnrp/transport-tcp`       | Yes                                       | No                               |
| `@nnrp/transport-quic`      | Yes                                       | No                               |
