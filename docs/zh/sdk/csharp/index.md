# C# SDK 概览

`Nnrp.Core` 是 NNRP 协议的 C# 实现，目标框架 `netstandard2.1`，覆盖完整的客户端和服务端控制面。

## 当前状态（Preview3）

| 模块 | 状态 |
|---|---|
| 核心协议类型（枚举、包头、消息） | ✅ 可用 |
| 客户端 API（`NnrpClient`、`INnrpClientSession`） | ✅ 可用 |
| 服务端 API（`NnrpServer`、`INnrpServerSession`） | ✅ 可用 |
| TCP 传输（`NnrpTcpMessageTransport`） | ✅ 可用 |
| QUIC 传输 | 🔶 Preview3 规划 |
| 缓存操作（`PutCacheAsync`、`InvalidateCacheAsync`） | 🔶 Preview3 规划 |
| 多视角（`MaxViews > 1`） | 🔶 Preview3 规划 |

## 运行时要求

- .NET ≥ 6 / .NET Standard 2.1

## 目录

- [快速使用](./quick-start)
- **API 参考**：[枚举](./api/enums) · [协议类型](./api/protocol) · [消息类型](./api/messages) · [客户端](./api/client) · [服务端](./api/server) · [传输层](./api/transport)
