# C# — 冻结 API

C# SDK（`Nnrp.Core`）的公开 API 分为以下几组。

| 分组 | 说明 | 状态 |
|---|---|---|
| [枚举](./api/enums) | 所有 `enum` 定义（`Nnrp.Core` 命名空间） | ✅ 已冻结 |
| [协议类型](./api/protocol) | 包头、帧、状态机等低层协议类型 | ✅ 已冻结 |
| [消息类型](./api/messages) | 各消息类与扩展类型 | ✅ 已冻结 |
| [客户端](./api/client) | `NnrpClient`、`ClientProfile`、提交与结果 | ✅ 已冻结 |
| [服务端](./api/server) | `INnrpServerSession`、`ServerProfile`、帧接收与结果 | ✅ 已冻结 |
| [传输层](./api/transport) | `INnrpMessageTransport`、TCP 实现 | ✅ 已冻结 |

## 包信息

| 属性 | 值 |
|---|---|
| 包名 | `Nnrp.Core` |
| 版本 | `1.0.0` |
| 目标框架 | `netstandard2.1` |
| 无外部依赖 | — |

```xml
<PackageReference Include="Nnrp.Core" Version="1.0.0" />
```
5. 稳定的异常分类与取消行为。

## C# 侧约束

1. 异步方法应是一等接口，并采用 Task 模型。
2. Disposable 生命周期和关闭行为必须明确。
3. 公开命名空间、接口和结果对象在 Preview3 集成窗口内应保持稳定。