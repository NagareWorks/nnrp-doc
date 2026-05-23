# Rust — 冻结 API

Rust SDK（`nnrp-rs`）工作区包含协议核心、runtime、transport provider、FFI/native packaging、WASM primitives 和一致性测试 crate。Preview3 当前已经具备协议核心、异步 TCP client/server runtime、一致性 fixtures，以及跨语言绑定所需的 FFI ABI / WASM primitive 表面。

| 分组 | Crate | 说明 | 状态 |
|---|---|---|---|
| [核心类型](./api/core) | `nnrp-core` | Wire codec、校验、生命周期、缓存/Schema、恢复、一致性基线 | ✅ Preview3 core 已实现 |
| [客户端（Preview3）](./api/client) | `nnrp-runtime` | `NnrpClient`、`NnrpClientSession`、事件接收、submit/cancel/patch/migrate/close | ✅ TCP runtime 已实现 |
| [服务端（Preview3）](./api/server) | `nnrp-runtime` | `NnrpServer`、`NnrpServerSession`、accept/receive/send/flow/close | ✅ TCP runtime 已实现 |
| Transport provider | `nnrp-transport-provider` / `nnrp-transport-tcp` / `nnrp-transport-quic` | provider registry、native library detection、policy resolver、probe score selection、TCP provider、QUIC provider slot | ✅ 已实现 |
| [FFI / 原生接口](./api/ffi) | `nnrp-ffi` | Value handle、buffer view、callback/polling event、client/server handle ABI、native artifact packaging | ✅ 已实现 |
| [WASM 导出（Preview3）](./api/wasm) | `nnrp-wasm` | wasm-bindgen JSON primitive、probe scoring、transport selection、`.d.ts` / `.wasm` 打包 | ✅ Primitive 已实现 |

## 工作区信息

| 属性 | 值 |
|---|---|
| 工作区 | `nnrp-rs` |
| 版本 | `1.0.0-preview.3` |
| 最低 Rust | `1.82` |
| Runtime 依赖 | `tokio = "1"`、`async-trait = "0.1"` |

```toml
[dependencies]
nnrp-core = "1.0.0-preview.3"
nnrp-runtime = "1.0.0-preview.3"
nnrp-transport-provider = "1.0.0-preview.3"
nnrp-transport-tcp = "1.0.0-preview.3"
nnrp-transport-quic = "1.0.0-preview.3"
nnrp-wasm = "1.0.0-preview.3"

# FFI 集成（C#/Python/Unity 调用）
nnrp-ffi = "1.0.0-preview.3"
```

## 构建目标

| 目标 | 产物 | 用途 |
|---|---|---|
| `--lib` | `libnnrp_core.rlib` / `libnnrp_runtime.rlib` | Rust 内部依赖 |
| `python scripts/package_native_artifacts.py` | `nnrp_ffi.dll` / `.so` / `.dylib` + `nnrp_ffi.h` + manifest | C#/Python/Unity/Node native FFI 集成 |
| `python scripts/package_wasm_primitives.py` | `nnrp_wasm.wasm` + `nnrp_wasm.d.ts` + manifest | `nnrp-js` 封装浏览器/Node WASM primitive |

## 当前边界

`nnrp-runtime` 当前内置 TCP 传输上的 client/server session runtime，同时开放 `FramedTransport` / `FramedListener` 插槽给外部 TCP/QUIC provider。`nnrp-transport-quic` 已作为独立 provider 包存在，但它不会替调用方冻结某个 TLS 或 QUIC 后端；默认 descriptor 会报告后端缺失。需要接入具体 QUIC 实现时，使用 `QuicProvider::backend_descriptor` 注册真实 backend，并通过 `from_transport` / `from_listener` 注入。

FFI 层已经暴露 client/server handle、session、operation 和 event ABI；它是跨语言绑定的底层控制面，不直接把 Rust 异步对象或 socket 指针暴露给调用方。

Native 链接库适合 C#/Python/Unity 和 Node.js 后端 native addon 场景。`nnrp-rs` 发布 native/WASM primitives 和 C ABI header；未来 `nnrp-js` 在 Node.js 中应优先探测 native link library，并在不可用时回退到 WASM。浏览器不能加载 `.dll` / `.so` / `.dylib`，后续 JS/TS 浏览器 SDK 必须走 `nnrp-wasm` primitive 包和 WebSocket/WebTransport transport adapter。

## Rust 侧约束

1. 所有权和借用规则需要在公开类型里表达清楚。
2. 异步接收流程保持显式：客户端通过 `await_event` / `await_result`，服务端通过 `receive_*`。
3. 公开 crate、feature flag 和结果类型在 Preview3 集成窗口内应保持稳定。
