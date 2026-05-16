# Python — 冻结 API

Python SDK（`nnrp-py`）的公开 API 分为以下几组。点击各组标题查看详细参考。

| 分组 | 说明 | 状态 |
|---|---|---|
| [枚举与常量](./api/enums) | `MessageType`、`HeaderFlags`、`ErrorCode` 等所有枚举定义 | ✅ 已冻结 |
| [包头与数据包](./api/packet) | `NnrpHeader`、`NnrpPacket`、`TensorSectionData` 及序列化工具 | ✅ 已冻结 |
| [消息类型](./api/messages) | 各消息的 metadata 类与构造函数 | ✅ 已冻结 |
| [客户端](./api/client) | `ClientProfile`、`ClientSession`、传输建立与迁移 | ✅ 已冻结 |
| [服务端](./api/server) | `ServerProfile`、`ServerSession`、帧接收与结果推送 | ✅ 已冻结 |
| [传输适配器](./api/transport) | TCP / QUIC 连接工厂与配置 | ✅ 已冻结 |

## 包信息

| 属性 | 值 |
|---|---|
| 包名 | `nnrp` |
| 版本 | `0.1.0` |
| 最低 Python | `3.11` |
| 运行时依赖 | `aioquic >= 1.2.0` |

```python
pip install nnrp
```

## 版本与线路格式

当前仅支持 `WireFormat.CURRENT = 0`（NNRP/1）。每个包头的 `wire_format` 字段须与此值匹配，否则解析器将抛出 `ValueError`。
5. 稳定的错误层级与取消接口。

## Python 侧约束

1. 异步方法应作为主契约。
2. 同步封装可以存在，但只是同一控制面语义的便捷层。
3. 公开方法名、参数分组和返回状态对象不应在未升级 SDK 版本的情况下漂移。