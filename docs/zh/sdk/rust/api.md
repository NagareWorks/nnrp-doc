# Rust — 冻结 API

Rust SDK（`nnrp-rs`）工作区包含三个 crate。当前已发布的公开 API 为核心类型与 FFI 层；完整客户端/服务端 API 计划在 Preview3 实现。

| 分组 | Crate | 说明 | 状态 |
|---|---|---|---|
| [核心类型](./api/core) | `nnrp-core` | 协议版本、错误类型 | ✅ 已冻结 |
| [FFI / 原生接口](./api/ffi) | `nnrp-ffi` | C ABI 导出、dll/so/wasm 构建目标 | ✅ 已冻结（基础） |
| [客户端（Preview3）](./api/client) | `nnrp-core` | 异步客户端 API | 🚧 规划中 |
| [服务端（Preview3）](./api/server) | `nnrp-core` | 异步服务端 API | 🚧 规划中 |
| [WASM 导出（Preview3）](./api/wasm) | `nnrp-ffi` | WebAssembly 导出接口 | 🚧 规划中 |

## 工作区信息

| 属性 | 值 |
|---|---|
| 工作区 | `nnrp-rs` |
| 版本 | `0.1.0` |
| 最低 Rust | `1.82` |
| 唯一依赖 | `thiserror = "2.0"` |

```toml
[dependencies]
nnrp-core = "0.1"

# FFI 集成（C#/Python 调用）
nnrp-ffi = { version = "0.1", features = ["cdylib"] }
```

## 构建目标（当前）

| 目标 | 产物 | 用途 |
|---|---|---|
| `--lib` | `libnnrp_core.rlib` | Rust 内部依赖 |
| `--lib --crate-type=cdylib` | `nnrp_ffi.dll` / `.so` | C#/Python FFI 集成 |
| `--target wasm32-unknown-unknown` | `nnrp_ffi.wasm` | Web 应用（Preview3） |
5. 稳定的错误枚举与关闭语义。

## Rust 侧约束

1. 所有权和借用规则需要在公开类型里表达清楚。
2. 异步 stream 或 channel 式接收流程应保持显式。
3. 公开 crate、feature flag 和结果类型在 Preview3 集成窗口内应保持稳定。