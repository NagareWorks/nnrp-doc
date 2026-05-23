# Rust SDK 概览

`nnrp-rs` 是 NNRP 的 Rust 工作区，当前由 `nnrp-core`、`nnrp-runtime`、`nnrp-transport-provider`、`nnrp-transport-tcp`、`nnrp-transport-quic`、`nnrp-ffi`、`nnrp-wasm` 和 `nnrp-conformance` 组成。Preview3 已经具备协议核心、TCP/QUIC client/server runtime、transport provider registry、FFI handle/event ABI、WASM primitives 与一致性 fixtures。

## 当前状态（Preview3）

| 模块 | 状态 |
|---|---|
| 协议版本、wire codec、消息类型、核心错误 | ✅ Preview3 core 已实现 |
| 连接/会话生命周期、流控、缓存/Schema、恢复、操作模型 | ✅ Preview3 core 已实现 |
| Rust 生成的一致性 fixtures 与 adapter 执行 | ✅ Preview3 core 已实现 |
| 客户端 API（`NnrpClient`、`NnrpClientSession`） | ✅ TCP runtime 与 QUIC provider 接入已实现 |
| 服务端 API（`NnrpServer`、`NnrpServerSession`） | ✅ TCP runtime 与 QUIC provider 接入已实现 |
| Transport provider registry / policy resolver | ✅ TCP provider、Quinn/Rustls QUIC provider、本地/远端能力交集选择与 probe 评分选择已实现 |
| FFI value handle、buffer view、callback/polling event、错误族 | ✅ ABI 表面已实现 |
| FFI runtime-backed 客户端 / 服务端入口 | ✅ handle/event ABI 已接入 |
| QUIC runtime binding | ✅ `nnrp-transport-quic` 提供默认 Quinn/Rustls provider，同时保留自定义 provider 插槽 |
| WASM primitive package（probe / transport selection） | ✅ `nnrp-wasm` 已实现；完整 JS/TS SDK 由 `nnrp-js` 封装 |

## 工具链要求

- Rust ≥ 1.82（stable）
- tokio 1.x
- WASM 目标：`wasm32-unknown-unknown`

## 目录

- [快速使用](./quick-start)
- **API 参考**：[核心类型](./api/core) · [FFI / 原生接口](./api/ffi) · [客户端](./api/client) · [服务端](./api/server) · [WASM 导出](./api/wasm)
