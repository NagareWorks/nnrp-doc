# JavaScript/TypeScript Browser Runtime Notes

Browser and edge clients use [`@nnrp/browser-client`](./client#openbrowserruntime). The browser
client package carries browser WASM primitives and exposes the same client session workflow
described in the [Client API](./client).

## Browser Transport

Use [`@nnrp/transport-websocket`](./transport#createwebsockettransportprovider) for the default
browser-native transport. For browser/edge hosts that expose TCP/QUIC-capable WASM transport
bridges, install [`@nnrp/transport-tcp`](./transport#createtcptransportprovider) and
[`@nnrp/transport-quic`](./transport#createquictransportprovider) as well.

WebSocket does not bundle Rust native/WASM transport artifacts because the Rust runtime does not
expose a WebSocket transport implementation. TCP and QUIC do bundle WASM transport primitives; the
only gating factor is whether the browser/edge host can provide the matching network capability.

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
| `@nnrp/transport-tcp`       | Yes                                       | Yes                              |
| `@nnrp/transport-quic`      | Yes                                       | Yes                              |
