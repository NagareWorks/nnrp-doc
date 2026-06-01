# Python — Server API

Server 文档按使用路径组织：接受 session、接收提交、发送结果或 drop、关闭。低层消息和 packet 细节保留在对应参考页。

## 导入

```python
from nnrp.server import (
    ServerProfile,
    ServerSession,
    ReceivedSubmit,
    accept_server_session,
)
```

## Server 使用流程

1. 构造 [`ServerProfile`](#serverprofile)。
2. 用 `serve_tcp` 或 `serve_quic` 打开 listener。
3. 对每个连接调用 [`accept_server_session`](#accept-server-session)。
4. 循环调用 [`ServerSession.receive_submit`](#serversession-receive-submit)。
5. 用 [`send_result`](#serversession-send-result) 或 [`send_result_drop`](#serversession-send-result-drop) 回答每一帧。
6. 对端断开或应用拒绝继续处理时关闭 session。

## `accept_server_session`

接受连接、校验 `CLIENT_HELLO`、发送 `SERVER_HELLO_ACK`，并返回活跃 [`ServerSession`](#serversession)。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `listener_or_connection` | `ServerListener \| ServerConnection` | 是 | 已打开 transport | listener 或已接受连接。 |
| `profile` | [`ServerProfile`](#serverprofile) | 是 | 配置对象 | 服务端 capability 和限制。 |
| `model_name` | `str` | 否 | 默认 `""` | 握手返回的模型名。 |
| `extra_extensions` | `tuple[ControlExtensionEntry, ...]` | 否 | 默认空 | 额外控制扩展。 |
| `auth_validator` | `Callable[[bytes], bool] \| None` | 否 | 同步 predicate | 返回 `False` 时拒绝连接。 |

| 返回 | 可能抛出 |
|---|---|
| [`ServerSession`](#serversession) | transport、认证、握手解析、capability 拒绝错误。 |

```python
session = await accept_server_session(
    listener,
    ServerProfile(max_concurrent_frames=4),
    model_name="render-v1",
    auth_validator=validate_token,
)
```

## `ServerSession.receive_submit`

接收并解析下一条 `FRAME_SUBMIT`。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `timeout` | `float \| None` | 否 | 秒；`None` 表示不超时 | 等待提交的最长时间。 |

| 返回 | 可能抛出 |
|---|---|
| [`ReceivedSubmit`](#receivedsubmit) | 超时、包格式错误、session mismatch、wire format 不支持。 |

```python
received = await session.receive_submit(timeout=30.0)
```

## `ServerSession.send_result`

推送一帧推理结果。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `frame_id` | `int` | 是 | 来自 [`ReceivedSubmit`](#receivedsubmit) | 用于关联请求。 |
| `tile_ids` | `tuple[int, ...]` | 否 | 默认空 | 结果 tile id。 |
| `sections` | `tuple[TensorSectionData, ...]` | 否 | 默认空 | Tensor 结果 sections。 |
| `typed_payloads` | `tuple[TypedPayload, ...]` | 否 | 默认空 | 非 tensor payload。 |
| `result_class` | [`ResultClass`](./enums#resultclassintenum) | 否 | 默认 `COMPLETE` | 结果完整性。 |
| `applied_budget_policy` | [`BudgetPolicy`](./enums#budgetpolicy-intflag) | 否 | 默认 `NONE` | 服务端实际使用的降级策略。 |
| `inference_ms` | `int` | 否 | 毫秒 | 推理耗时。 |
| `queue_ms` | `int` | 否 | 毫秒 | 排队耗时。 |
| `server_total_ms` | `int` | 否 | 毫秒 | 服务端总耗时。 |
| `status_code` | `int` | 否 | 应用自定义 | 状态细节。 |

| 返回 | 可能抛出 |
|---|---|
| `int` 发送字节数 | 序列化或 transport 错误。 |

```python
await session.send_result(
    frame_id=received.metadata.frame_id,
    sections=run_inference(received.request),
    result_class=ResultClass.COMPLETE,
)
```

## `ServerSession.send_result_drop`

通知客户端某一帧不会返回结果。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `frame_id` | `int` | 是 | 已提交 frame id | 要 drop 的帧。 |
| `reason` | `int` | 否 | 应用自定义 | 当前消息形态支持时使用。 |

| 返回 | 可能抛出 |
|---|---|
| `int` 发送字节数 | 序列化或 transport 错误。 |

```python
await session.send_result_drop(frame_id=received.metadata.frame_id)
```

## 核心类型

### `ServerProfile`

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `max_concurrent_frames` | `int` | `1` | 协议层 in-flight 限制。 |
| `enable_cache` | `bool` | `True` | 是否启用 cache 协商。 |
| `max_sections` | `int` | `16` | 每帧最大 tensor section 数。 |
| `max_body_bytes` | `int` | `33554432` | 最大请求 body 字节数。 |

### `ReceivedSubmit`

| 字段 | 类型 | 说明 |
|---|---|---|
| `packet` | [`NnrpPacket`](./packet#nnrppacket) | 原始 `FRAME_SUBMIT` 包。 |
| `metadata` | `FrameSubmitMetadata` | 解析后的 frame metadata。 |
| `request` | [`SubmitRequest`](./client#submitrequest) | 结构化提交请求。 |
| `tensor_body` | `TensorBodyView \| None` | 存在 tensor payload 时的 body view。 |

## 示例

```python
async def handle_session(session: ServerSession) -> None:
    try:
        while True:
            received = await session.receive_submit(timeout=30.0)
            sections = await run_inference_async(received.request)
            await session.send_result(
                frame_id=received.metadata.frame_id,
                sections=sections,
                result_class=ResultClass.COMPLETE,
            )
    finally:
        await session.close()
```

## 常见坑

::: warning
1. 不要在 receive coroutine 里直接跑阻塞推理；用 executor 或 worker pool。
2. 每个已接受 frame 都需要 result 或 drop。
3. `max_concurrent_frames` 是协议限制，不是完整调度器。
4. `auth_validator` 是同步函数，不要在里面做数据库或网络 I/O。
:::
