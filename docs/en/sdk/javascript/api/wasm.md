# JavaScript/TypeScript Browser Runtime Notes

Browser and edge clients use [`@nnrp/browser-client`](./client#openbrowserruntime). The browser
client package carries browser WASM primitives and exposes the same client session workflow
described in the [Client API](./client).

## Browser Transport

Use [`@nnrp/transport-websocket`](./transport#provider-factories) for the default browser-native
carrier. TCP, QUIC, and IPC provider packages are native-host packages.

`@nnrp/browser-client` owns the `nnrp-wasm-browser` artifact. The browser branch of
`@nnrp/transport-websocket` uses those runtime primitives with the host `WebSocket` object. Native
WebSocket artifacts remain inside `@nnrp/transport-websocket`.

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
| `@nnrp/transport-websocket` | Yes on Node.js/Deno                       | No; uses `@nnrp/browser-client`  |
| `@nnrp/transport-tcp`       | Yes                                       | No                               |
| `@nnrp/transport-quic`      | Yes                                       | No                               |
| `@nnrp/transport-ipc`       | Yes                                       | No                               |
