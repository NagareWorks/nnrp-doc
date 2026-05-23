# Rust SDK 概览

`nnrp-rs` 是 NNRP 的 Rust 工作区，当前由 `nnrp-core`、`nnrp-runtime`、`nnrp-transport-provider`、`nnrp-transport-tcp`、`nnrp-ffi` 和 `nnrp-conformance` 组成。Preview3 已经具备协议核心、TCP client/server runtime、transport provider registry、FFI handle/event ABI 与一致性 fixtures。

## 当前状态（Preview3）

| 模块 | 状态 |
|---|---|
| 协议版本、wire codec、消息类型、核心错误 | ✅ Preview3 core 已实现 |
| 连接/会话生命周期、流控、缓存/Schema、恢复、操作模型 | ✅ Preview3 core 已实现 |
| Rust 生成的一致性 fixtures 与 adapter 执行 | ✅ Preview3 core 已实现 |
| 客户端 API（`NnrpClient`、`NnrpClientSession`） | ✅ TCP runtime 已实现 |
| 服务端 API（`NnrpServer`、`NnrpServerSession`） | ✅ TCP runtime 已实现 |
| Transport provider registry / policy resolver | ✅ TCP provider 与本地/远端能力交集选择已实现 |
| FFI value handle、buffer view、callback/polling event、错误族 | ✅ ABI 表面已实现 |
| FFI runtime-backed 客户端 / 服务端入口 | ✅ handle/event ABI 已接入 |
| QUIC runtime binding | 🔶 transport/listener/provider 插槽已开放，具体 provider 未冻结 |
| WASM 导出（`NnrpWasmClient`、`NnrpWasmSession`） | 🔶 Preview3 规划 |

## 工具链要求

- Rust ≥ 1.82（stable）
- tokio 1.x
- WASM 目标：`wasm32-unknown-unknown` + wasm-pack（规划中）

## 目录

- [快速使用](./quick-start)
- **API 参考**：[核心类型](./api/core) · [FFI / 原生接口](./api/ffi) · [客户端](./api/client) · [服务端](./api/server) · [WASM 导出](./api/wasm)
