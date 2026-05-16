# Python SDK 概览

`nnrp-py` 是 NNRP 协议的 Python 实现，基于 asyncio + aioquic，覆盖完整的客户端和服务端控制面。

## 当前状态（Preview3）

| 模块 | 状态 |
|---|---|
| 核心协议类型（枚举、包头、数据包） | ✅ 可用（0.1.0） |
| 消息类型（控制面 + 数据面） | ✅ 可用（0.1.0） |
| 客户端 API（`ClientSession`、`ClientProfile`） | ✅ 可用（0.1.0） |
| 服务端 API（`ServerSession`、`accept_server_session`） | ✅ 可用（0.1.0） |
| QUIC 传输适配器 | ✅ 可用（aioquic） |
| TCP 传输适配器 | ✅ 可用 |
| 缓存操作（`put_cache`、`invalidate_cache`） | 🔶 Preview3 规划 |
| 多视角（`max_views > 1`） | 🔶 Preview3 规划 |

## 运行时要求

- Python ≥ 3.11
- asyncio 事件循环

## 目录

- [快速使用](./quick-start)
- **API 参考**：[枚举](./api/enums) · [包头与数据包](./api/packet) · [消息类型](./api/messages) · [客户端](./api/client) · [服务端](./api/server) · [传输适配器](./api/transport)
- [部署与接入](./deploy)