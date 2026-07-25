# C# API

C# Preview4 API 按应用角色组织。Client 和 server 入口负责生命周期编排，transport 包提供真实
provider，`Nnrp.NativeBridge` 保持为共享 native 加载和粗粒度调用边界。

| 从这里开始 | 用途 |
|---|---|
| [客户端](./api/client) | 连接、打开 session、提交、发送控制、消费事件和关闭。 |
| [服务端](./api/server) | 监听、接受 session、接收 operation、流式返回结果和关闭。 |

| 参考页 | 用途 |
|---|---|
| [Runtime Control 与 Object](./api/runtime) | Preview4 control metadata、object/cache metadata、typed event 和二进制 frame codec。 |
| [传输](./api/transport) | 应用 endpoint、provider endpoint、registry、选择逻辑和四个 native 包。 |
| [枚举](./api/enums) | 协议和 runtime enum 值。 |
| [协议类型](./api/protocol) | Header、framed message、状态机和诊断 packet primitive。 |
| [消息类型](./api/messages) | 底层控制面和数据面消息值。 |

## 包信息

| 属性 | 值 |
|---|---|
| 共享包 | `Nnrp.Core`、`Nnrp.NativeBridge` |
| 角色包 | `Nnrp.Client`、`Nnrp.Server` |
| Transport 包 | `Nnrp.Transport.Tcp`、`Nnrp.Transport.Quic`、`Nnrp.Transport.Ipc`、`Nnrp.Transport.WebSocket` |
| Unity 包 | `com.nnrp.client` |
| 版本目标 | `1.0.0-preview.4` |
| 目标框架 | `netstandard2.1` |

## 冻结 API 规则

1. 无论选择哪个 provider，用户侧应用 endpoint 都使用 `nnrp://` 或 `nnrps://`。
2. 安装 transport 包会带来真实 provider 行为和该 transport 自己的 Rust 产物。
3. Client/server 角色 API 以粗粒度操作调用 Rust，不暴露原始 FFI buffer 或 handle。
4. 托管 packet/session helper 只属于诊断面，不是生产 fallback。
5. Preview4 不提供旧 preview API 的 alias 或 forwarding entrypoint。
6. Async、取消、释放、终态和 owned/borrowed memory 语义必须显式。
