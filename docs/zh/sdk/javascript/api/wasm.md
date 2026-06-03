# JavaScript/TypeScript Browser Runtime 说明

Browser 与 edge client 使用 [`@nnrp/browser-client`](./client#openbrowserruntime)。Browser client
package 携带 browser WASM primitives，并暴露 [Client API](./client) 中描述的同一套 client session
workflow。

## Browser Transport

默认浏览器原生 transport 使用
[`@nnrp/transport-websocket`](./transport#createwebsockettransportprovider)。 如果 browser/edge host
暴露 TCP/QUIC-capable WASM transport bridge，也可以安装
[`@nnrp/transport-tcp`](./transport#createtcptransportprovider) 和
[`@nnrp/transport-quic`](./transport#createquictransportprovider)。

WebSocket 不捆绑 Rust native/WASM transport artifact，因为 Rust runtime 没有暴露 WebSocket transport
实现。TCP 与 QUIC 会捆绑 WASM transport primitives；唯一门槛是 browser/edge host 是否提供对应
network capability。

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
| `@nnrp/transport-tcp`       | 是                                    | 是                           |
| `@nnrp/transport-quic`      | 是                                    | 是                           |
