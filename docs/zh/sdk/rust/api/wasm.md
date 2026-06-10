# Rust — WASM 浏览器 Primitives

`nnrp-wasm` 打包由 Rust 生成、适合浏览器使用的协议 primitives。它不替代 JavaScript/TypeScript SDK，也不加载 native transport library。

## Cargo

```toml
[dependencies]
nnrp-wasm = "1.0.0-preview.4.0"
```

## Artifact

| 项目 | 值 |
|---|---|
| Release artifact | `nnrp-wasm-browser-1.0.0-preview.4.0.zip` |
| 内容 | `.wasm`、生成的 JS glue、`.d.ts`、manifest |
| 用途 | 浏览器协议 primitives 与 binary-frame helpers |
| 不包含 | Native `.dll` / `.so` / `.dylib` transport libraries |

## Exports

| Export | 目的 |
|---|---|
| `nnrp_wasm_protocol_major()` | 返回 protocol major version。 |
| `nnrp_wasm_wire_format()` | 返回 wire format id。 |
| `selectTransportWithProbeJson(...)` | 应用 provider/probe policy，返回 selected provider JSON。 |
| `scoreProviderProbeJson(...)` | 根据 policy 和 probe samples 给单个 provider 打分。 |
| `encodeWebSocketBinaryFrameJson(...)` | 编码浏览器 WebSocket binary-frame wrapper。 |
| `decodeWebSocketBinaryFrameJson(...)` | 解码一个浏览器 WebSocket binary-frame wrapper。 |
| `decodeWebSocketBinaryFrameBatchJson(...)` | 批量解码浏览器 binary frames。 |
| `encodeRuntimeControlMetadataJson(...)` | 从 JSON 编码 runtime-control metadata。 |
| `decodeRuntimeControlMetadataJson(...)` | 将 runtime-control metadata 解码成 JSON。 |
| `encodeRuntimeObjectMetadataJson(...)` | 从 JSON 编码 runtime object metadata。 |
| `decodeRuntimeObjectMetadataJson(...)` | 将 runtime object metadata 解码成 JSON。 |

JSON 边界保持足够粗粒度，方便 JS/TS SDK 批处理，避免大量字段级 JS/WASM 往返。

## 浏览器 Transport 边界

浏览器不能打开 raw TCP socket，也不能加载 native link library。浏览器构建中：

| Concern | Owner |
|---|---|
| Protocol metadata、binary-frame helper、provider scoring | `nnrp-wasm` |
| WebSocket connection lifecycle、auth、reconnect、worker/fetch 集成 | JavaScript/TypeScript SDK |
| Native TCP/QUIC/IPC/WebSocket libraries | FFI transport artifacts，不属于浏览器包 |

## 常见问题

::: warning
1. 不要在 browser client package 里塞 native library。
2. 不要把 WASM 当成高层 `NnrpClient`；高层 session API 属于 JS/TS SDK。
3. 处理多个浏览器 frame 时用 batch decode helper，避免不必要的 JS/WASM 边界开销。
:::
