# JavaScript/TypeScript Browser Runtime 说明

Browser 与 edge client 使用 [`@nnrp/browser-client`](./client#openbrowserruntime)。Browser client
package 携带 browser WASM primitives，并暴露 [Client API](./client) 中描述的同一套 client session
workflow。

## Browser Transport

默认浏览器原生 transport 使用
[`@nnrp/transport-websocket`](./transport#createwebsockettransportprovider)。当前 browser client API
接受 WebSocket provider。TCP 与 QUIC provider package 面向 native host。

WebSocket 不捆绑 Rust native 或 browser WASM artifact，因为 Rust runtime 没有暴露 WebSocket
transport 实现。

## WASM Artifact Helper

| API                                                        | 说明                                                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `createWasmRuntimeBinding(options?)`                       | 创建 browser manifest、module URL、可选 module、可选 artifact 和 browser transport providers。 |
| `resolveWasmArtifact(options)`                             | 校验 artifact manifest 并解析 WASM/types URL。                                                 |
| `validateWasmArtifactManifest(manifest, requiredExports?)` | 校验 WASM primitive manifest 和必需 exports。                                                  |

## Runtime 边界

| 包                          | 包含 native `.dll` / `.so` / `.dylib` | 包含 browser WASM primitives |
| --------------------------- | ------------------------------------- | ---------------------------- |
| `@nnrp/browser-client`      | 否                                    | 是                           |
| `@nnrp/transport-websocket` | 否                                    | 否                           |
| `@nnrp/transport-tcp`       | 是                                    | 否                           |
| `@nnrp/transport-quic`      | 是                                    | 否                           |
