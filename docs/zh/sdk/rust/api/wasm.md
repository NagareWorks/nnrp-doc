# Rust — WASM 浏览器 Primitives

`nnrp-wasm` 打包由 Rust 生成、适合浏览器使用的协议 primitives。它不替代 JavaScript/TypeScript SDK，也不加载 native transport library。

## Cargo

```toml
[dependencies]
nnrp-wasm = "1.0.0-preview.4.17"
```

## Artifact

| 项目 | 值 |
|---|---|
| Release artifact | `nnrp-wasm-browser-1.0.0-preview.4.17.zip` |
| 内容 | `.wasm`、生成的 JS glue、`.d.ts`、manifest |
| 用途 | 浏览器协议 primitives 与 binary-frame helpers |
| 不包含 | Native `.dll` / `.so` / `.dylib` transport libraries |

## Exports

| Export | 目的 |
|---|---|
| `nnrp_wasm_protocol_major()` | 返回 protocol major version。 |
| `nnrp_wasm_wire_format()` | 返回 wire format id。 |
| `selectTransportWithProbeJson(providersJson, remoteTransportsJson, policy, requestedMaxFrameBytes, samplesJson)` | 应用冻结的 provider/probe 策略并返回 `TransportSelection` JSON。`requestedMaxFrameBytes` 为空值或规范十进制 `u64` 字符串。 |
| `summarizeProviderProbeJson(providerJson, samplesJson)` | 返回单个 provider 的结构化 `ProbeMetrics` JSON。 |
| `encodeWebSocketBinaryFrameJson(...)` | 编码浏览器 WebSocket binary-frame wrapper。 |
| `decodeWebSocketBinaryFrameJson(...)` | 解码一个浏览器 WebSocket binary-frame wrapper。 |
| `decodeWebSocketBinaryFrameBatchJson(...)` | 批量解码浏览器 binary frames。 |
| `encodeRuntimeControlMetadataJson(...)` | 从 JSON 编码 runtime-control metadata。 |
| `decodeRuntimeControlMetadataJson(...)` | 将 runtime-control metadata 解码成 JSON。 |
| `encodeRuntimeObjectMetadataJson(...)` | 从 JSON 编码 runtime object metadata。 |
| `decodeRuntimeObjectMetadataJson(...)` | 将 runtime object metadata 解码成 JSON。 |

WASM 表面使用[传输策略与探测](/zh/protocol/v1/transport-strategy)冻结的 provider 元数据、candidate 诊断、拒绝原因
注册表与确定性排序，不导出加权 score。
Probe sample JSON 使用 `provider_id`；package 展示名不是选路身份。

JSON 边界保持足够粗粒度，方便 JS/TS SDK 批处理，避免大量字段级 JS/WASM 往返。

runtime-control 与 runtime-object JSON 边界中，所有在线路上声明为 `u64` 的字段都使用规范无符号十进制
字符串，包括标识符、序列号、预算、限制、cache key word、lease、trace 标识符、offset、length 与时间戳。
值只能包含 ASCII 数字、不能带符号，并且零值只能写成 `"0"`。bridge 会拒绝这些字段上的 JSON number，
避免 JavaScript 静默丢失精度。高层 JavaScript/TypeScript SDK 负责在十进制字符串与 `bigint` 之间映射；
线路上的 `u32`、`u16`、`u8` 和 `i16` 字段仍使用 JSON number。

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
