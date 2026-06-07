# Python — Server API

Server 文档按使用路径组织：接受 session、接收提交、发送结果或 drop、关闭。低层消息和 packet 细节保留在对应参考页。

## 导入

```python
from nnrp.server import (
    ServerProfile,
    ServerSession,
    ServerSessionAcceptResolution,
    ReceivedSubmit,
    accept_server_connection,
    accept_server_session,
)
```

## Server 使用流程

1. 构造 [`ServerProfile`](#serverprofile)。
2. 用 `serve_tcp` 或 `serve_quic` 打开 listener。
3. 对每个 listener 调用 [`accept_server_session`](#accept-server-session)，或在已经预读首包、已经接受 connection 的 runtime 中调用 [`accept_server_connection`](#accept-server-connection)。
4. 循环调用 [`ServerSession.receive_submit`](#serversession-receive-submit)。
5. 用 [`send_result`](#serversession-send-result) 或 [`send_result_drop`](#serversession-send-result-drop) 回答每一帧。
6. 对端断开或应用拒绝继续处理时关闭 session。

## `accept_server_session`

接受连接、校验 `CLIENT_HELLO`、发送 `SERVER_HELLO_ACK`，并返回活跃 [`ServerSession`](#serversession)。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `listener` | `ServerListener` | 是 | 已打开 listener | QUIC/TCP listener。 |
| `session_id` | `int \| None` | 否 | 默认客户端请求值 | 服务端分配或覆盖的 session id。 |
| `active_model_name` | `str` | 否 | 默认 `""` | SDK 保留在 `ServerSession.active_model_name`，不写入 `SERVER_HELLO_ACK` body。 |
| `server_profile` | [`ServerProfile`](#serverprofile) | 否 | 默认 `ServerProfile()` | 服务端 capability 和限制。 |
| `timeout` | `float` | 否 | 秒，默认 `10.0` | accept 与握手读取超时。 |
| `session_resolver` | `Callable[[ClientHelloContext], ServerSessionAcceptResolution \| Awaitable[...]] \| None` | 否 | 默认 `None` | 在解析 `CLIENT_HELLO` 后决定实际 `session_id` 和 `active_model_name`。 |

| 返回 | 可能抛出 |
|---|---|
| [`ServerSession`](#serversession) | transport、认证、握手解析、capability 拒绝错误。 |

```python
session = await accept_server_session(
    listener,
    server_profile=ServerProfile(max_concurrent_frames=4),
    active_model_name="render-v1",
)
```

## `accept_server_connection`

对已经接受的 transport connection 执行服务端握手。这个入口用于 runtime 已经拿到
connection，或者为了 `TRANSPORT_PROBE` / 自定义探测流程已经预读了首个 control packet 的场景。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `connection` | `ServerConnection` | 是 | 已接受连接 | QUIC/TCP connection。 |
| `first_packet` | `NnrpPacket \| None` | 否 | 默认 `None` | 已预读的 `CLIENT_HELLO`；为空时 SDK 自行读取。 |
| `session_id` | `int \| None` | 否 | 默认客户端请求值 | 未提供 `session_resolver` 时使用。 |
| `active_model_name` | `str` | 否 | 默认 `""` | 返回在 `ServerSession` 上供应用观察。 |
| `server_profile` | [`ServerProfile`](#serverprofile) | 否 | 默认 `ServerProfile()` | 服务端 capability 和限制。 |
| `timeout` | `float` | 否 | 秒，默认 `10.0` | 读取握手包超时。 |
| `session_resolver` | `Callable[[ClientHelloContext], ServerSessionAcceptResolution \| Awaitable[...]] \| None` | 否 | 默认 `None` | 根据已解析 `CLIENT_HELLO` 决定服务端 session。 |

`accept_server_connection` 和 `accept_server_session` 都由 SDK 统一构造 `SERVER_HELLO_ACK`。
Preview3 SDK 会在 ACK body 中写入 `control_extension_block`，至少包含 transport policy ack
扩展，用来声明 `active_transport_id`。`control_extension_bytes` 必须等于 ACK body 长度；
应用层模型名、业务 session id 映射等信息不得塞进 ACK body。

```python
def resolve_session(hello):
    requested_model = hello.auth_block.decode("utf-8") if hello.auth_block else ""
    opened = open_runtime_session(requested_model)
    return ServerSessionAcceptResolution(
        session_id=opened.wire_session_id,
        active_model_name=opened.active_model_name,
    )

session = await accept_server_connection(
    connection,
    first_packet=client_hello_packet,
    server_profile=ServerProfile(max_concurrent_frames=4),
    session_resolver=resolve_session,
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

### `ClientHelloContext`

服务端握手解析结果，保存在 `ServerSession.hello`，也会传给 `session_resolver`。

| 字段 | 类型 | 说明 |
|---|---|---|
| `packet` | [`NnrpPacket`](./packet#nnrppacket) | 原始 `CLIENT_HELLO`。 |
| `metadata` | `ClientHelloMetadata` | 解析后的握手 metadata。 |
| `auth_block` | `bytes` | 应用定义的认证或模型请求载荷。 |
| `control_extensions` | `tuple[ControlExtensionEntry, ...]` | 已解析握手扩展。 |

### `ServerSessionAcceptResolution`

`session_resolver` 的返回值。

| 字段 | 类型 | 说明 |
|---|---|---|
| `session_id` | `int` | 服务端最终接受的 wire session id。 |
| `active_model_name` | `str` | 应用可观测的活动模型名，不进入 ACK body。 |

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
4. Runtime 不要手工构造 `SERVER_HELLO_ACK`；需要预读首包时使用 `accept_server_connection(first_packet=...)`。
:::
