# Rust — 冻结 API

Rust SDK（`nnrp-rs`）工作区包含三个 crate。Preview3 当前已经具备协议核心、一致性 fixtures 与稳定 FFI ABI 表面；可直接跑业务的 client/server runtime 仍是后续工作。

| 分组 | Crate | 说明 | 状态 |
|---|---|---|---|
| [核心类型](./api/core) | `nnrp-core` | Wire codec、校验、生命周期、缓存/Schema、恢复、一致性基线 | ✅ Preview3 core 已实现 |
| [FFI / 原生接口](./api/ffi) | `nnrp-ffi` | Value handle、buffer view、callback/polling event、错误族 | ✅ ABI 表面已实现 |
| [客户端（Preview3）](./api/client) | runtime crate / `nnrp-core` consumer | 异步客户端 API | 🚧 runtime 尚未实现 |
| [服务端（Preview3）](./api/server) | runtime crate / `nnrp-core` consumer | 异步服务端 API | 🚧 runtime 尚未实现 |
| [WASM 导出（Preview3）](./api/wasm) | `nnrp-ffi` | WebAssembly 导出接口 | 🚧 规划中 |

## 工作区信息

| 属性 | 值 |
|---|---|
| 工作区 | `nnrp-rs` |
| 版本 | `1.0.0-preview.2` |
| 最低 Rust | `1.82` |
| Core 依赖 | `thiserror = "2.0"` |

```toml
[dependencies]
nnrp-core = "1.0.0-preview.2"

# FFI 集成（C#/Python 调用）
nnrp-ffi = "1.0.0-preview.2"
```

## 构建目标（当前）

| 目标 | 产物 | 用途 |
|---|---|---|
| `--lib` | `libnnrp_core.rlib` | Rust 内部依赖 |
| `--lib --crate-type=cdylib` | `nnrp_ffi.dll` / `.so` | C#/Python FFI 集成 |
| `--target wasm32-unknown-unknown` | `nnrp_ffi.wasm` | Web 应用（Preview3） |

## 当前边界

当前 FFI 函数是 ABI 与生命周期原语，不是网络化 client/server runtime。真正的 `connect`、`listen`、`accept`、session pump、submit/result stream，以及 runtime-backed FFI entrypoint 是 Rust SDK 下一阶段。

## Rust 侧约束

1. 所有权和借用规则需要在公开类型里表达清楚。
2. 异步 stream 或 channel 式接收流程应保持显式。
3. 公开 crate、feature flag 和结果类型在 Preview3 集成窗口内应保持稳定。
