# Rust SDK 概览

`nnrp-core` crate 是 NNRP 协议的 Rust 实现，`nnrp-ffi` 提供跨语言绑定所需的 C ABI 表面。

## 当前状态（Preview3）

| 模块 | 状态 |
|---|---|
| 协议版本、wire codec、消息类型、核心错误 | ✅ Preview3 core 已实现 |
| 连接/会话生命周期、流控、缓存/Schema、恢复、操作模型 | ✅ Preview3 core 已实现 |
| Rust 生成的一致性 fixtures 与 adapter 执行 | ✅ Preview3 core 已实现 |
| FFI value handle、buffer view、callback/polling event、错误族 | ✅ ABI 表面已实现 |
| 客户端 API（`NnrpClient`、`NnrpClientSession`） | 🚧 runtime 尚未实现 |
| 服务端 API（`NnrpServer`、`NnrpServerSession`） | 🚧 runtime 尚未实现 |
| FFI runtime-backed 客户端 / 服务端入口 | 🚧 依赖 Rust runtime |
| WASM 导出（`NnrpWasmClient`、`NnrpWasmSession`） | 🔶 Preview3 规划 |

## 工具链要求

- Rust ≥ 1.75（stable）
- tokio 1.x（计划用于 client/server runtime）
- WASM 目标：`wasm32-unknown-unknown` + wasm-pack

## 目录

- [快速使用](./quick-start)
- **API 参考**：[核心类型](./api/core) · [FFI / 原生接口](./api/ffi) · [客户端](./api/client) · [服务端](./api/server) · [WASM 导出](./api/wasm)
