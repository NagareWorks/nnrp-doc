# C# API

先看面向使用者的 client 和 server 入口页。协议、消息、枚举和 transport 页面作为参数表链接过去的参考资料。

| 优先阅读 | 用途 |
|---|---|
| [客户端](./api/client) | 连接、提交、接收结果/事件、关闭。 |
| [服务端](./api/server) | 接受 session、接收 submit、发送 result/drop、关闭。 |

| 参考页 | 用途 |
|---|---|
| [枚举](./api/enums) | client、server、message、transport 使用的 enum 值。 |
| [协议类型](./api/protocol) | header、framed message、状态机和 cache store。 |
| [消息类型](./api/messages) | 控制面和数据面消息对象。 |
| [传输层](./api/transport) | framed transport contract、TCP/native bridge 集成说明。 |

## 包信息

| 属性 | 值 |
|---|---|
| 包 | `Nnrp.Core`、`Nnrp.Client`、`Nnrp.Server`、`Nnrp.NativeBridge`、`Nnrp.Transport.Tcp`、`Nnrp.Transport.Quic` |
| 版本目标 | Preview3 包线（`1.0.0-preview.3.*`） |
| 目标框架 | `netstandard2.1` |

```powershell
dotnet add package Nnrp.NativeBridge --prerelease
dotnet add package Nnrp.Transport.Tcp --prerelease
dotnet add package Nnrp.Transport.Quic --prerelease
```

## 文档格式

应用方法按“一个方法一个小节”记录。每个小节包含参数、是否必填、取值范围、返回值、错误行为，然后给一个短示例。代码块只用于示例，不重复粘贴 interface 清单。

## C# 侧约定

1. Async 方法是一等 API 形态。
2. Disposable 生命周期和关闭行为必须明确。
3. 公开命名空间、接口和结果对象应保持稳定，除非 SDK 版本发生变更。
