# Rust SDK 概览

`nnrp-core` crate 是 NNRP 协议的 Rust 实现，同时通过 `nnrp-ffi` 提供 C ABI 和 WASM 导出，供跨语言和 Web 场景使用。

## 当前状态（Preview3）

| 模块 | 状态 |
|---|---|
| 协议版本与基础错误类型（`ProtocolVersion`、`NnrpError`） | ✅ 可用（0.1.0） |
| FFI C ABI（`current_protocol_version`） | ✅ 可用（0.1.0） |
| 完整协议线路类型（`NnrpHeader`、消息类型等） | 🔶 Preview3 规划（0.3） |
| 客户端 API（`NnrpClient`、`NnrpClientSession`） | 🔶 Preview3 规划（0.3） |
| 服务端 API（`NnrpServer`、`NnrpServerSession`） | 🔶 Preview3 规划（0.3） |
| FFI 完整客户端 / 服务端 C ABI | 🔶 Preview3 规划 |
| WASM 导出（`NnrpWasmClient`、`NnrpWasmSession`） | 🔶 Preview3 规划 |

## 工具链要求

- Rust ≥ 1.75（stable）
- tokio 1.x（async runtime）
- WASM 目标：`wasm32-unknown-unknown` + wasm-pack

## 目录

- [快速使用](./quick-start)
- **API 参考**：[核心类型](./api/core) · [FFI / 原生接口](./api/ffi) · [客户端](./api/client) · [服务端](./api/server) · [WASM 导出](./api/wasm)
- [部署与接入](./deploy)