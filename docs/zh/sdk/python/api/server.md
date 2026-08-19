# Python — Server API

Server 文档按使用路径组织：接受 session、接收提交、发送结果或 drop、关闭。低层消息和 packet 细节保留在对应参考页。

## 导入

```python
from nnrp import NativeTransportBinding, NativeTransportServerSecurity, TransportPolicy
from nnrp.server import (
    NativeServerAcceptOptions,
    NativeServerBootstrapOptions,
    NativeServerProviderRoute,
    NativeServerSessionOptions,
    NativeServerSessionPolicyDecision,
    ServerProfile,
    ServerSession,
    ServerSessionAcceptResolution,
    ReceivedSubmit,
    accept_server_connection,
    accept_server_session,
    listen_native_server,
)
```

## Server 使用流程

生产 host 使用 Rust 接管的 role 路径：

1. 用 `nnrp://` 或 `nnrps://` 应用 endpoint 调用 [`listen_native_server`](#listen-native-server)。
2. 调用 `NativeServer.accept()`，由 Rust 接受 carrier 并完成 NNRP 握手。
3. 从返回的 `NativeRuntimeServerSession` 接收 submit/control/object/cache event。
4. 通过收到的 operation 发送 progress、partial、terminal 与 drop；通过 session 发送 trace
   和其他 session-scoped 输出。
5. 关闭 session 与 server context。

Packet transport helper 只用于诊断和自定义 carrier：

1. 构造 [`ServerProfile`](#serverprofile)。
2. 用 packet transport adapter（例如 `serve_tcp` 或 `serve_quic`）打开 listener。
3. 对每个 listener 调用 [`accept_server_session`](#accept-server-session)，或在已经预读首包、已经接受 connection 的 runtime 中调用 [`accept_server_connection`](#accept-server-connection)。
4. 循环调用 [`ServerSession.receive_submit`](#serversession-receive-submit)。
5. 用 [`send_result`](#serversession-send-result) 或 [`send_result_drop`](#serversession-send-result-drop) 回答每一帧。
6. 对端断开或应用拒绝继续处理时关闭 session。

## `listen_native_server`

解析 policy 允许的全部已安装 Preview4 provider，原子打开 listener set，把每个 listener 所有权移交
对应 Rust server runtime，并返回一个逻辑 `NativeServer` context manager。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `options` | `NativeServerBootstrapOptions` | 是 | 应用 endpoint、Provider route、transport policy 与 session defaults。 |

`NativeServer.accept(options=None)` 接收只包含 `timeout_ms` 的 `NativeServerAcceptOptions`，
并返回 carrier-backed `NativeRuntimeServerSession`。Native handle 与 generation 保持内部，
该路径不会创建 synthetic local submit。

`NativeServer.bound_provider_endpoints` 是从规范 transport 名到实际绑定 `NativeTransportEndpoint` 的不可变
mapping，并保留操作系统分配的端口。Provider listener 的致命失败会让完整逻辑 server 失败并关闭；拒绝
单个 peer handshake 只影响该 accepted carrier。

已安装 Provider package 通过同一个原子 listener-set 契约参与运行。每个可用 binding 真正拥有
listener 和 Rust role adoption；Provider route 只提供局部 locator 与安全配置。

```python
options = NativeServerBootstrapOptions(
    endpoint="nnrp://0.0.0.0:4433/runtime/default",
    transport_policy=TransportPolicy.FORCE_TCP,
)
with listen_native_server(options) as server:
    session = server.accept(NativeServerAcceptOptions(timeout_ms=30_000))
```

`NativeServerSessionOptions` 冻结 supported profile/cache object 集合、cache 限额、schema
registry、recovery token 容量、in-flight 与 credit 限额、lease/resume window 以及应用准入
policy。默认 policy 接受所有 wire-valid session。

`NativeServerSessionPolicyDecision` 是 policy 的返回结果。`accept()` 接受 session；
`reject(reason_code, diagnostic)` 使用应用定义的原因码和诊断信息拒绝 session。异步 policy
方法必须返回这类 decision。

应用 policy 实现以下 async 方法：

```python
class AdmissionPolicy:
    async def evaluate(self, open_metadata):
        if open_metadata.max_in_flight_operations > 32:
            return NativeServerSessionPolicyDecision.reject(17, "requested concurrency is too high")
        return NativeServerSessionPolicyDecision.accept()
```

通过 `NativeServerBootstrapOptions.session_defaults` 安装该 policy。SDK 对每个
`SESSION_OPEN` 评估一次，即使 host 已有正在运行的 asyncio event loop 也保持该语义。

## `NativeRuntimeServerSession` Preview4 Frame

`NativeRuntimeServerSession.active_transport_name` 是实际接受 carrier 的 listener 对应的规范 transport 名称。
它必须与协商得到的 active transport 一致，不能从 listener preference 顺序推断。

Native server host 与 client 使用同一个角色中立 runtime-frame ABI。Server session 提供
以下应用接口：

| 方法 | 消息 |
|---|---|
| `send_backpressure(metadata)`, `send_credit_update(metadata)` | pressure 消息 |
| `send_trace_context(metadata, body=b"", *, operation_id=None)` | `TRACE_CONTEXT`；`None` 为 session scope，否则解析 active operation frame |
| `send_recoverable_error(metadata, diagnostic=b"")`, `send_retry_after(...)` | recovery 消息 |
| `declare_object`, `reference_object`, `release_object` | object lifecycle 消息 |
| `patch_object`, `send_object_delta` | object update 消息 |
| `reference_cache`, `report_cache_miss`, `invalidate_cache` | cache 消息 |

`poll_runtime_frames()` 和 `iter_runtime_frames()` 返回已经解码的
[`NativeRuntimeFrameEvent`](./runtime#nativeruntimeframeevent)。应用侧 server 方法不接收原始
`control_code`。

### `NativeRuntimeServerSession.next_event`

```python
async def next_event(self, timeout: float | None = None) -> NativeServerEvent: ...
```

返回规范的闭合 server 联合类型：submit ownership 使用 `NativeRuntimeServerOperation`，非 submit
wire traffic 使用 `NativeRuntimeEvent`，不带 header 的本地状态使用 `OperationLifecycleEvent`。
每次恰好返回一个 variant，并保持 session 内事件顺序。

### `NativeRuntimeServerSession.poll_event`

```python
def poll_event(self, *, timeout_ms: int = 0) -> NativeServerEvent | None: ...
```

按 wire 顺序返回下一条原始 wire event；有界等待结束仍无事件时返回 `None`。
`poll_events(max_events=..., timeout_ms=...)` 是 adapter、测试套件和吞吐敏感 dispatch loop 使用的
粗粒度原生批量接口，不改变事件顺序。需要 submit ownership 或本地 lifecycle 通知的应用使用
`next_event()`。

### `NativeRuntimeServerSession.receive_submit`

```python
async def receive_submit(self, timeout: float | None = None) -> NativeRuntimeServerOperation: ...
```

返回的 operation 直接提供 wire identity 和已解码请求，不向应用暴露 FFI buffer：

| 字段 | 类型 | 说明 |
|---|---|---|
| `operation_id` | `int` | 来自 `FRAME_SUBMIT` 的非零 wire operation identity。 |
| `frame_id` | `int` | 来自 packet header 的 wire frame identity。 |
| `submit` | `NativeRuntimeEvent` | 完整持有的 `FRAME_SUBMIT` 事件，包括 metadata 与 body。 |

### `NativeRuntimeServerOperation.send_result`

```python
async def send_result(
    self,
    metadata: ResultPushMetadata,
    body: bytes = b"",
) -> None: ...
```

SDK 校验并拼装 `ResultPushMetadata` 与 `body`，随后只执行一次粗粒度 native 调用。调用方
不需要预先序列化 metadata，也不接触 FFI 形态的 result payload。

同一个 operation 还暴露以下 async 方法：

| 方法 | 消息 | Tail |
|---|---|---|
| `send_result_drop(metadata, diagnostic=b"")` | `RESULT_DROP_REASON` | diagnostic bytes |
| `send_progress(metadata, body=b"")` | `PROGRESS` | progress body |
| `send_partial_result(metadata, body=b"")` | `PARTIAL_RESULT` | partial body |

四个方法都会校验 operation identity。只允许一个终态方法成功，且
`NativeRuntimeServerSession` 不提供任何并行的 operation 回复方法。

收到终态 lifecycle event 不会在终态回复成功前使 operation 失效。operation 会保持可回复，直到
终态回复成功或 session 关闭，后续 event poll 不得改变这段生命周期。

## 数据包传输诊断接口

以下 `ServerSession` helper 属于数据包级诊断与自定义 carrier 接口。它们不实现冻结的跨语言
runtime role API，也不封装 Rust runtime operation handle；生产 role host 不得用它们替代
`NativeRuntimeServerSession`。

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
| `connection` | `ServerConnection` | 是 | 已接受连接 | 一条已经接受的 carrier connection。 |
| `first_packet` | `NnrpPacket \| None` | 否 | 默认 `None` | 已预读的 `CLIENT_HELLO`；为空时 SDK 自行读取。 |
| `session_id` | `int \| None` | 否 | 默认客户端请求值 | 未提供 `session_resolver` 时使用。 |
| `active_model_name` | `str` | 否 | 默认 `""` | 返回在 `ServerSession` 上供应用观察。 |
| `server_profile` | [`ServerProfile`](#serverprofile) | 否 | 默认 `ServerProfile()` | 服务端 capability 和限制。 |
| `timeout` | `float` | 否 | 秒，默认 `10.0` | 读取握手包超时。 |
| `session_resolver` | `Callable[[ClientHelloContext], ServerSessionAcceptResolution \| Awaitable[...]] \| None` | 否 | 默认 `None` | 根据已解析 `CLIENT_HELLO` 决定服务端 session。 |

`accept_server_connection` 和 `accept_server_session` 都由 SDK 统一构造 `SERVER_HELLO_ACK`。
SDK 会在 ACK body 中写入 `control_extension_block`，至少包含 transport policy ack
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
