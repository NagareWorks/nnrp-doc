# C# SDK 概览

`nnrp-cs` 是面向 NNRP/1 Preview4 的 role-first C# SDK。应用安装一个角色包，再安装部署允许的
transport 包。每个 transport 包拥有自己的 provider 行为和 Rust transport-scoped native artifact；
角色包不会隐藏这些产物。

## 包结构

| 职责 | 包 |
|---|---|
| 共享协议、endpoint、runtime metadata 和 provider 选择契约 | `Nnrp.Core` |
| 生产 client 连接和 session 编排 | `Nnrp.Client` |
| 生产 server listener、已接受 session 和 operation 编排 | `Nnrp.Server` |
| Native 加载、ABI 校验、handle 和粗粒度 FFI 调用 | `Nnrp.NativeBridge` |
| TCP provider 行为和产物 | `Nnrp.Transport.Tcp` |
| QUIC provider 行为和产物 | `Nnrp.Transport.Quic` |
| IPC provider 行为和产物 | `Nnrp.Transport.Ipc` |
| WebSocket provider 行为和产物 | `Nnrp.Transport.WebSocket` |
| Unity client assembly 和 transport-scoped plugin | `com.nnrp.client` |

只安装一个 transport 时直接选择它；安装多个 transport 时，SDK 会在已安装 provider 之间执行
策略过滤、能力检查和探测。用户侧应用 endpoint 始终使用 `nnrp://` 或 `nnrps://`；carrier-local
locator 只作为显式 provider override。

## 运行时要求

- .NET 6 或更新版本应用运行时
- SDK 包目标框架为 `netstandard2.1`
- 与托管 ABI 和所选 transport 包一致的 Preview4 Rust artifact

## 目录

- [快速使用](./quick-start)
- **API 参考**：[客户端](./api/client) · [服务端](./api/server) · [Runtime Control 与 Object](./api/runtime) · [传输](./api/transport) · [枚举](./api/enums) · [协议类型](./api/protocol) · [消息类型](./api/messages)
