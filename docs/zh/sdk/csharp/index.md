# C# SDK 概览

`nnrp-cs` 是 NNRP 的 C# SDK 家族。Preview3 继续在 `Nnrp.Core`、`Nnrp.Client` 和
`Nnrp.Server` 中保留托管协议 helper，同时默认宿主集成路径切到 `Nnrp.NativeBridge` 加显式
TCP/QUIC transport 包，热路径由 Rust native artifact 承载。

## 当前状态（Preview3）

| 模块 | 状态 |
|---|---|
| 核心协议类型、枚举、包头、消息与 cache helper | 可用 |
| 托管 client/server session helper | 用于测试、诊断和自定义 framed transport |
| Native bridge 快路径 | 可用 |
| TCP transport 包（`Nnrp.Transport.Tcp`） | 可用 |
| QUIC transport 包（`Nnrp.Transport.Quic`） | 可用 |
| Transport 探测与基于策略的选择 | 可用 |

## 运行时要求

- .NET 6 或更新版本应用运行时
- SDK 包目标框架为 `netstandard2.1`

## 目录

- [快速使用](./quick-start)
- **API 参考**：[枚举](./api/enums) · [协议类型](./api/protocol) · [消息类型](./api/messages) · [客户端](./api/client) · [服务端](./api/server) · [传输层](./api/transport)
