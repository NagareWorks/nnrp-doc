# Rust — 冻结 API

Rust SDK（`nnrp-rs`）工作区包含四个 crate。Preview3 当前已经具备协议核心、异步 TCP client/server runtime、一致性 fixtures，以及跨语言绑定所需的 FFI ABI 表面。

| 分组 | Crate | 说明 | 状态 |
|---|---|---|---|
| [核心类型](./api/core) | `nnrp-core` | Wire codec、校验、生命周期、缓存/Schema、恢复、一致性基线 | ✅ Preview3 core 已实现 |
| [客户端（Preview3）](./api/client) | `nnrp-runtime` | `NnrpClient`、`NnrpClientSession`、事件接收、submit/cancel/patch/migrate/close | ✅ TCP runtime 已实现 |
| [服务端（Preview3）](./api/server) | `nnrp-runtime` | `NnrpServer`、`NnrpServerSession`、accept/receive/send/flow/close | ✅ TCP runtime 已实现 |
| [FFI / 原生接口](./api/ffi) | `nnrp-ffi` | Value handle、buffer view、callback/polling event、client/server handle ABI | ✅ 已实现 |
| [WASM 导出（Preview3）](./api/wasm) | `nnrp-ffi` | WebAssembly 导出接口 | 🚧 规划中 |

## 工作区信息

| 属性 | 值 |
|---|---|
| 工作区 | `nnrp-rs` |
| 版本 | `1.0.0-preview.2` |
| 最低 Rust | `1.82` |
| Runtime 依赖 | `tokio = "1"`、`async-trait = "0.1"` |

```toml
[dependencies]
nnrp-core = "1.0.0-preview.2"
nnrp-runtime = "1.0.0-preview.2"

# FFI 集成（C#/Python/Unity 调用）
nnrp-ffi = "1.0.0-preview.2"
```

## 构建目标

| 目标 | 产物 | 用途 |
|---|---|---|
| `--lib` | `libnnrp_core.rlib` / `libnnrp_runtime.rlib` | Rust 内部依赖 |
| `--lib --crate-type=cdylib` | `nnrp_ffi.dll` / `.so` / `.dylib` | C#/Python/Unity FFI 集成 |
| `--target wasm32-unknown-unknown` | `nnrp_ffi.wasm` | Web 应用（规划中） |

## 当前边界

`nnrp-runtime` 当前提供 TCP 传输上的 client/server session runtime。QUIC API hook 已保留，但调用 `connect_quic` / `bind_quic` 会返回 `UnsupportedTransport`，直到 QUIC binding 落地。

FFI 层已经暴露 client/server handle、session、operation 和 event ABI；它是跨语言绑定的底层控制面，不直接把 Rust 异步对象或 socket 指针暴露给调用方。

## Rust 侧约束

1. 所有权和借用规则需要在公开类型里表达清楚。
2. 异步接收流程保持显式：客户端通过 `await_event` / `await_result`，服务端通过 `receive_*`。
3. 公开 crate、feature flag 和结果类型在 Preview3 集成窗口内应保持稳定。
