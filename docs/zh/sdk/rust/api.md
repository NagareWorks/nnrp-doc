# Rust API 概览

这一页是地图。具体方法表放在 client、server、core、FFI 和 WASM 分页里，方便使用者从自己要实现的工作流进入，而不是先读一整坨符号清单。

## Release

| 项目 | 值 |
|---|---|
| NNRP 协议线 | NNRP/1 Preview4 |
| Rust package version | `1.0.0-preview.4.0` |
| 最低 Rust 版本 | `1.82` |
| GitHub release asset tag | `v1.0.0-preview.4.0` |

## API 区域

| 区域 | Package | 拥有内容 | 页面 |
|---|---|---|---|
| 核心协议模型 | `nnrp-core` | Wire codec、metadata、profiles、runtime-control、object/cache、校验 | [核心类型](./api/core) |
| 客户端 runtime | `nnrp-runtime` | connect、open session、submit、receive events、control requests、close | [客户端 API](./api/client) |
| 服务端 runtime | `nnrp-runtime` | bind、accept、receive submit/control、send result/progress/object/cache events | [服务端 API](./api/server) |
| Transport providers | `nnrp-transport-provider`、`nnrp-transport-*` | Registry、probe policy、TCP/QUIC/IPC/WebSocket 真实传输实现 | [Transport Provider 边界](#transport-provider-boundary) |
| 原生 ABI | `nnrp-ffi` | C ABI、handle/event model、native artifact manifest | [FFI / 原生接口](./api/ffi) |
| 浏览器 primitives | `nnrp-wasm` | WASM protocol helpers、browser binary-frame helpers、`.d.ts` 输出 | [WASM](./api/wasm) |

## Cargo

```toml
[dependencies]
nnrp-core = "1.0.0-preview.4.0"
nnrp-runtime = "1.0.0-preview.4.0"
nnrp-transport-provider = "1.0.0-preview.4.0"
nnrp-transport-tcp = "1.0.0-preview.4.0"
nnrp-transport-quic = "1.0.0-preview.4.0"
nnrp-transport-ipc = "1.0.0-preview.4.0"
nnrp-transport-websocket = "1.0.0-preview.4.0"

# 可选下游表面
nnrp-ffi = "1.0.0-preview.4.0"
nnrp-wasm = "1.0.0-preview.4.0"
nnrp-conformance = "1.0.0-preview.4.0"
```

## Transport Provider 边界

Runtime 只通过 framed transport traits 看 transport。具体网络行为归 provider 包所有。

| Package | 拥有内容 | Native / WASM artifact 边界 |
|---|---|---|
| `nnrp-transport-tcp` | TCP connect/bind 与 TCP probe identity | Native FFI transport artifact 以 TCP 为粒度发布 |
| `nnrp-transport-quic` | Quinn/Rustls QUIC connect/bind 与 QUIC probe identity | Native FFI transport artifact 以 QUIC 为粒度发布 |
| `nnrp-transport-ipc` | 本地 IPC endpoint：Unix domain socket 与 Windows named pipe | Native FFI transport artifact 以 IPC 为粒度发布 |
| `nnrp-transport-websocket` | 原生 Rust WebSocket binary-frame transport | Native FFI transport artifact 以 WebSocket 为粒度发布 |
| `nnrp-wasm` | 浏览器 WASM primitives 与 browser binary-frame helpers | 浏览器 artifact 是 `nnrp-wasm-browser-1.0.0-preview.4.0.zip` |

client/server runtime 这种角色包不隐藏 transport 实现。需要哪个 transport，就安装拥有该行为的 transport 包；多个 transport 同时可用时，再交给 provider policy 选择。

## Runtime Control 与 Object/Cache Frame

Preview4 增加了紧凑控制面事件，用于 scheduling、cancel、progress、partial result、backpressure、
capability negotiation、route hint、cache reference 和 trace context。Wire 定义见
[运行时控制 Profiles](/zh/profiles/runtime-control/)。Rust 侧通过 client event、server send/receive helper
和 core metadata 类型暴露这些能力。

## Artifact 命名

| Artifact family | 示例 |
|---|---|
| Native transport FFI | `nnrp-ffi-transport-tcp-native-linux-x86_64-1.0.0-preview.4.0.zip` |
| Native QUIC FFI | `nnrp-ffi-transport-quic-native-windows-x86_64-1.0.0-preview.4.0.zip` |
| Browser WASM | `nnrp-wasm-browser-1.0.0-preview.4.0.zip` |
| Checksums | `SHA256SUMS` |

下游 SDK 加载 native library 或 WASM 文件前，应先校验 artifact manifest。
