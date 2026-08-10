# Python — Client API

Client
文档按使用路径组织：连接、提交、收结果、关闭。数据结构只在参数表里链接到对应声明，代码块只用于示例。

## 导入

```python
from nnrp import NativeTransportBinding, NativeTransportClientSecurity, TransportPolicy
from nnrp.client import (
    ClientProfile,
    ClientSession,
    NativeClientOptions,
    NativeClientProviderRoute,
    NativeClientSessionOptions,
    NativeSessionRecoveryTicket,
    SubmitRequest,
    connect_client_control,
    connect_client_control_with_probe,
    connect_native_client_connection,
)
```

## Client 使用流程

生产 host 路径使用 Rust-backed native runtime：

1. 提供 `nnrp://` 或 `nnrps://` 应用 endpoint。
2. 调用 [`connect_native_client_connection`](#connect-native-client-connection)，由 SDK 选择已安装 Provider 并打开 carrier。
3. 通过 [`NativeClientConnection.open_session`](#nativeclientconnection-open-session) 打开 session。
4. 用粗粒度 native 方法提交、轮询结果、发送运行时控制帧。
5. 调用 `close()` 释放 connection 和 session。

Packet transport helper 仍然公开，但主要用于 smoke、诊断和自定义 transport：

1. 构造 [`ClientProfile`](#clientprofile)。
2. 选择 TCP、QUIC 或 probe-based bootstrap。
3. 调用 [`connect_client_control`](#connect-client-control) 或
   [`connect_client_control_with_probe`](#connect-client-control-with-probe)。
4. 使用返回 bootstrap session 内的 [`ClientSession`](#clientsession)；多帧并发用
   [`send_submit`](#clientsession-send-submit) + [`receive_result`](#clientsession-receive-result)。
5. 在 client control session 生命周期内保持 async context manager 打开。

## `connect_native_client_connection`

根据应用 endpoint 选择已安装的 Preview4 Provider，打开 Provider carrier，将其所有权移交给
Rust role runtime，完成 NNRP 握手，并返回 `NativeClientConnection` 上下文管理器。常规 host
配置中，Provider-local locator 不得替代应用 endpoint。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `options` | `NativeClientOptions` | 是 | 应用 endpoint、Provider route、transport policy 与 session defaults。 |

```python
async def run() -> None:
    options = NativeClientOptions(
        endpoint="nnrps://runtime.example/session/default",
        provider_routes={
            "tcp": NativeClientProviderRoute(
                security=NativeTransportClientSecurity(
                    server_name="runtime.example",
                    trusted_certificate_der=trusted_certificate_der,
                )
            )
        },
        transport_policy=TransportPolicy.FORCE_TCP,
    )
    with connect_native_client_connection(options) as connection:
        print(connection.active_transport_name)
        await connection.open_session(NativeClientSessionOptions(requested_session_id=42))
```

`NativeClientConnection.transport_selection` 保留完整且不可变的
`NativeTransportSelection`，包含最终 Provider 和全部接受或拒绝的候选项；
`active_transport_name` 是最终 Provider 的规范 transport 名。SDK 会发现已安装的 Provider package；
每个 package 必须真正负责自己的探测、carrier 建立和 role adoption，不能只是配置开关。

TCP 与 QUIC 使用应用 endpoint 的 authority，authority 未提供端口时默认使用 `4433`。IPC route 必须
提供匹配的 `unix://` 或 `npipe://` locator；WebSocket route 必须提供匹配的 `ws://` 或 `wss://`
locator。Provider-local locator 与 route transport 不匹配时必须拒绝。只有 role adoption
成功后 carrier 所有权才移入 Rust；失败时 Python 仍可关闭 carrier wrapper。

## `NativeClientConnection`

Native client connection 是 preview4 Python host API 的主入口。它不让 Python 为每个小字段跨一次 ABI，而是通过 session、operation、event 和 owned buffer 走粗粒度 native 调用。

### `NativeClientConnection.open_session`

`NativeClientSessionOptions` 的冻结默认值如下：

| 字段 | 默认值 | 说明 |
|---|---:|---|
| `requested_session_id` | `0` | 首选 wire session id；零表示由服务端分配。 |
| `profile_id` | `2`（`STANDARD_PROFILE_TOKEN`） | 标准 token profile。 |
| `schema_id` | `0x00001001`（`TOKEN_DELTA_SCHEMA_ID`） | Token-delta schema。 |
| `schema_version` | `3`（`TOKEN_DELTA_SCHEMA_VERSION`） | Token-delta schema version。 |
| `priority_class` | `balanced` | Session 调度等级。 |
| `default_deadline_ms` | `500` | Operation 默认 deadline。 |
| `max_in_flight_operations` | `4` | 请求的并发上限。 |
| `lease_ttl_hint_ms` | `30000` | 请求的 cache lease 生命周期。 |
| `allow_resume` | `False` | 启用 resumable-session 协商。 |
| `resume_token_bytes` | `0` | 本地 recovery token 容量；零表示 runtime 默认值。 |
| `cache_hints` | `()` | 自动折叠进 `CLIENT_HELLO` 的 cache object kind。 |

无参数 `open_session()` 必须使用这一组值，与 Rust runtime 默认契约一致。只有在选择其他已安装
profile/schema 组合时才覆盖这些字段。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `options` | `NativeClientSessionOptions \| None` | 否 | Session 协商参数；默认使用 `NativeClientOptions.session_defaults`。 |

| 返回 |
|---|
| `NativeRuntimeSession` |

Session 协商可能等待 Provider 与对端 I/O，因此该方法是 async。一个 connection 保持打开，
并可同时持有多个 session。

### `NativeClientConnection.resume_session`

`await connection.resume_session(ticket, options=None)` 使用 runtime 签发的
`NativeSessionRecoveryTicket` 恢复 session。应用可通过 `ticket.to_bytes()` 持久化，并通过
`NativeSessionRecoveryTicket.from_bytes(encoded)` 恢复该值，但不得构造或修改不透明 token。
协商了恢复能力后，`session.recovery_ticket()` 返回当前 ticket。

### `NativeClientConnection.submit_and_poll_result`

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `session` | `NativeRuntimeSession` | 是 | 已打开的 native session。 |
| `request` | `SubmitRequest` | 是 | Typed tensor、token 或 typed-payload submit request。 |
| `parent_operation_id` | `int \| None` | 否 | 父 operation。 |
| `operation_group_id` | `int \| None` | 否 | Operation 分组。 |
| `max_events` | `int \| None` | 否 | 本次 poll 最多处理事件数。 |
| `timeout_ms` | `int` | 否 | Native event poll 最长等待时间；`0` 表示非阻塞。 |

使用 `SubmitRequest.tensor(...)`、`SubmitRequest.token(...)` 或
`SubmitRequest.typed_payload(...)` 构造请求。SDK 校验并打包 typed request，submit 与有界 result
poll 各跨一次 FFI。

| 返回 |
|---|
| `NativeRuntimeResult` |

`NativeRuntimeResult` 保留每一种终态：

| 字段 | 类型 | 说明 |
|---|---|---|
| `operation_id` | `int` | 非零 submitted operation identity。 |
| `terminal_state` | `ResultTerminalState` | `SUCCESS`、`CANCELLED`、`DROPPED` 或 `ERROR`。 |
| `event` | `NativeTerminalEvent` | 闭合的 `NativeRuntimeEvent \| OperationLifecycleEvent` 终态证据联合。 |

成功结果保留 `RESULT_PUSH`；非成功结果保留建立该状态的精确 wire 或本地 lifecycle event。联合类型
不使用两个 nullable 并行字段，应用侧 result 也不暴露序列化 FFI payload。

### `OperationLifecycleEvent`

| 字段 | 类型 | 说明 |
|---|---|---|
| `operation_id` | `int` | 非零 operation identity。 |
| `state` | `OperationState` | 精确的本地生命周期状态。 |

这是本地 role 通知，不会伪造 `RuntimeFrameHeader`。Native event 的 header 不存在时必须投影为该类型，
不能冒充 wire `NativeRuntimeEvent`。

### Runtime control helper

| 方法 | 消息类型 |
|---|---|
| `cancel_runtime_operation` | `CANCEL` |
| `abort_runtime_operation` | `ABORT` |
| `update_runtime_priority` | `PRIORITY_UPDATE` |
| `update_runtime_deadline` | `DEADLINE` |
| `expire_runtime_operation_at` | `EXPIRE_AT` |
| `supersede_runtime_operation` | `SUPERSEDE` |
| `update_runtime_budget` | `BUDGET_UPDATE` |
| `send_runtime_route_hint` | `ROUTE_HINT` |
| `send_runtime_execution_hint` | `EXECUTION_HINT` |
| `negotiate_runtime_capabilities` | `CAPABILITY_NEGOTIATION` |
| `degrade_runtime_profile` | `DEGRADE_PROFILE` |

## `NativeRuntimeSession` Preview4 Frame

`NativeClientConnection.open_session()` 返回的 session 持有高层 Preview4 发送接口。普通应用
使用以下方法，不自行调用 codec 函数构造 frame：

| 方法 | 消息 |
|---|---|
| `cancel_operation(metadata, diagnostic=b"")`, `abort_operation(...)` | `CANCEL`, `ABORT` |
| `update_priority(metadata)`, `update_deadline(metadata)`, `expire_at(metadata)` | scheduling 消息 |
| `supersede(metadata, diagnostic=b"")`, `update_budget(metadata)` | `SUPERSEDE`, `BUDGET_UPDATE` |
| `negotiate_capabilities(metadata, body=b"")`, `degrade_profile(...)` | capability 消息 |
| `send_route_hint(metadata, body=b"")`, `send_execution_hint(...)` | routing 消息 |
| `send_trace_context(metadata, body=b"")` | `TRACE_CONTEXT` |
| `declare_object(metadata, body=b"")`, `reference_object(...)` | `OBJECT_DECLARE`, `OBJECT_REF` |
| `release_object(metadata, diagnostic=b"")` | `OBJECT_RELEASE` |
| `patch_object(metadata, delta, metadata_body=b"")` | `OBJECT_PATCH` |
| `send_object_delta(metadata, delta, metadata_body=b"")` | `OBJECT_DELTA` |
| `reference_cache(metadata, body=b"")`, `report_cache_miss(...)` | cache reference/miss |
| `invalidate_cache(metadata)` | `CACHE_INVALIDATE` |

每个方法返回 `None`，校验声明长度，并只调用一次粗粒度 Rust runtime。底层与角色无关的
frame-send 原语仅供 SDK 内部使用，不在 `NativeRuntimeSession` 上公开。

### Session 作用域事件泵

Rust role event 归属于单个 session，因此 Python SDK 只在 `NativeRuntimeSession` 上提供接收和
分发方法，不提供 connection-wide queue：

| 方法 | 返回 |
|---|---|
| `next_event(timeout=None)` | `NativeClientEvent`，即闭合的 `NativeRuntimeEvent | OperationLifecycleEvent` 客户端联合类型。 |
| `poll_event()` / `poll_events(max_events=None, event_kind=None)` | 持有自身 buffer 的原始 `NativeRuntimeEvent` 快照。 |
| `poll_credit_updates(max_events=None)` | 已解码的 credit 与 backpressure 更新。 |
| `poll_result_hints(max_events=None)` | 已解码的 result hint。 |
| `poll_payload_family_events(...)` | 已解码的 payload-family event。 |
| `poll_runtime_frames(max_events=None)` | 已解码的 Preview4 runtime frame。 |
| `dispatch_events(...)` 与 typed `dispatch_*` 变体 | 同一 session 上的同步 callback 分发。 |
| `async_poll_event()` 与 typed `iter_*` 变体 | 同一 session event source 的异步封装。 |

`NativeClientEvent` 是这两个闭合 variant 的公开类型别名。调用方按类型判别 active value；不带 header
的 lifecycle 通知绝不转换成伪造的 runtime frame。事件泵使用 session handle 执行一次有界 native poll，并在返回前复制和释放 native-owned buffer。
应用打开多个 session 时必须分别 poll；connection 层不会重新分配事件归属。

## `connect_client_control`

打开选中的 transport，完成控制面握手，并 yield `ClientControlBootstrapSession`。

| 参数                    | 类型                                 | 必填 | 取值 / 范围                  | 说明                                   |
| ----------------------- | ------------------------------------ | ---: | ---------------------------- | -------------------------------------- |
| `host`                  | `str`                                |   是 | hostname 或 IP               | 远端 NNRP endpoint。                   |
| `quic_port`             | `int \| None`                        |   否 | QUIC port                    | 提供后启用 QUIC。                      |
| `tcp_port`              | `int \| None`                        |   否 | TCP port                     | 提供后启用 TCP。                       |
| `quic_configuration`    | `QuicConfiguration \| None`          |   否 | aioquic config               | QUIC client 配置。                     |
| `tcp_configuration`     | `NnrpTcpClientConfiguration \| None` |   否 | TCP config                   | TCP client 配置。                      |
| `client_profile`        | [`ClientProfile`](#clientprofile)    |   否 | 默认 SDK profile             | 客户端 capability 和 cache 偏好。      |
| `selected_transport_id` | [`TransportId`](./enums#transportid) |   否 | `UNSPECIFIED`, `QUIC`, `TCP` | 没有 probe result 时的选中 transport。 |
| `forced_transport_id`   | [`TransportId`](./enums#transportid) |   否 | `UNSPECIFIED`, `QUIC`, `TCP` | 受控部署里的强制 transport。           |
| `auth_block`            | `bytes`                              |   否 | 默认 `b""`                   | 应用自定义认证负载。                   |
| `timeout`               | `float`                              |   否 | 秒，默认 `10.0`              | 连接和握手 timeout。                   |

| 返回                                           | 可能抛出                                   |
| ---------------------------------------------- | ------------------------------------------ |
| `AsyncIterator[ClientControlBootstrapSession]` | transport、握手解析、capability 拒绝错误。 |

```python
profile = ClientProfile(max_views=1, enable_cache=True)
async with connect_client_control(
    "render.example.com",
    quic_port=4433,
    client_profile=profile,
) as bootstrap:
    result = await bootstrap.session.submit(request)
```

## `connect_client_control_with_probe`

连接前执行 QUIC/TCP 探测，并把选中的 transport 写入握手。

| 参数                   | 类型                                 | 必填 | 取值 / 范围      | 说明                           |
| ---------------------- | ------------------------------------ | ---: | ---------------- | ------------------------------ |
| `host`                 | `str`                                |   是 | hostname 或 IP   | 远端 NNRP endpoint。           |
| `quic_port`            | `int`                                |   是 | QUIC port        | QUIC probe/connect port。      |
| `tcp_port`             | `int`                                |   是 | TCP port         | TCP probe/connect port。       |
| `quic_configuration`   | `QuicConfiguration \| None`          |   否 | aioquic config   | QUIC client 配置。             |
| `tcp_configuration`    | `NnrpTcpClientConfiguration \| None` |   否 | TCP config       | TCP client 配置。              |
| `client_profile`       | [`ClientProfile`](#clientprofile)    |   否 | 默认 SDK profile | capability 和 cache 偏好。     |
| `probe_payload_bytes`  | `int`                                |   否 | 默认 `32768`     | 每次 probe 的 payload 大小。   |
| `probe_sample_count`   | `int`                                |   否 | 默认 `3`         | 参与评分的 probe sample 数量。 |
| `include_warmup_probe` | `bool`                               |   否 | 默认 `False`     | 评分前增加 warmup sample。     |
| `auth_block`           | `bytes`                              |   否 | 默认 `b""`       | 应用认证负载。                 |
| `timeout`              | `float`                              |   否 | 秒，默认 `10.0`  | probe、连接和握手 timeout。    |

| 返回                                           | 可能抛出                      |
| ---------------------------------------------- | ----------------------------- |
| `AsyncIterator[ClientControlBootstrapSession]` | probe、transport 或握手失败。 |

```python
async with connect_client_control_with_probe(
    "render.example.com",
    quic_port=4433,
    tcp_port=4434,
    client_profile=ClientProfile(),
) as bootstrap:
    result = await bootstrap.session.submit(request)
```

## `ClientSession`

已建立的客户端 session。

### `ClientSession.submit`

提交一帧并等待匹配的结果。

| 参数      | 类型                              | 必填 | 取值 / 范围                    | 说明                 |
| --------- | --------------------------------- | ---: | ------------------------------ | -------------------- |
| `request` | [`SubmitRequest`](#submitrequest) |   是 | `frame_id` 在 in-flight 中唯一 | 结构化提交请求。     |
| `timeout` | `float \| None`                   |   否 | 秒；`None` 表示不超时          | 等待结果的最长时间。 |

| 返回                | 可能抛出                                          |
| ------------------- | ------------------------------------------------- |
| [`Result`](#result) | `asyncio.TimeoutError`、transport、协议关联错误。 |

```python
result = await session.submit(request, timeout=0.05)
```

### `ClientSession.send_submit`

只发送，不等待结果。适合多帧并发。

| 参数      | 类型                              | 必填 | 取值 / 范围                    | 说明           |
| --------- | --------------------------------- | ---: | ------------------------------ | -------------- |
| `request` | [`SubmitRequest`](#submitrequest) |   是 | `frame_id` 在 in-flight 中唯一 | 要发送的请求。 |

| 返回  | 可能抛出                  |
| ----- | ------------------------- |
| `int` | 序列化或 transport 错误。 |

```python
await session.send_submit(request)
```

### `ClientSession.receive_result`

接收下一条服务端结果。

| 参数      | 类型            | 必填 | 取值 / 范围           | 说明                 |
| --------- | --------------- | ---: | --------------------- | -------------------- |
| `timeout` | `float \| None` |   否 | 秒；`None` 表示不超时 | 等待结果的最长时间。 |

| 返回                | 可能抛出                       |
| ------------------- | ------------------------------ |
| [`Result`](#result) | 超时、结果格式错误、关联错误。 |

```python
result = await session.receive_result(timeout=0.05)
```

### `ClientSession.patch_session`

运行时更新 session 参数。

| 参数                    | 类型                                         | 必填 | 取值 / 范围    | 说明                 |
| ----------------------- | -------------------------------------------- | ---: | -------------- | -------------------- |
| `patch_fields`          | [`SessionPatchField`](./enums#session-patch) |   是 | bitmask        | 指定哪些字段生效。   |
| `target_cadence`        | `int`                                        |   否 | `0` 表示不变   | 目标帧率或 cadence。 |
| `quality_tier`          | `int`                                        |   否 | `0..255`       | 应用自定义质量档位。 |
| `active_lane_mask`      | `int`                                        |   否 | bitmask        | 活跃 lane/view。     |
| `preferred_codec`       | `int`                                        |   否 | codec id       | 偏好的 codec。       |
| `preferred_compression` | `int`                                        |   否 | compression id | 偏好的压缩方式。     |

| 返回                      | 可能抛出                    |
| ------------------------- | --------------------------- |
| `SessionPatchAckMetadata` | 拒绝、超时或 ack 解析错误。 |

```python
ack = await session.patch_session(
    SessionPatchField.TARGET_CADENCE | SessionPatchField.QUALITY_TIER,
    target_cadence=60,
    quality_tier=2,
)
```

### `ClientSession.close`

关闭 session 和底层连接。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明     |
| ---- | ---- | ---: | ----------- | -------- |
| 无   | -    |    - | -           | 无参数。 |

| 返回   | 可能抛出               |
| ------ | ---------------------- |
| `None` | transport close 错误。 |

```python
try:
    await session.submit(request)
finally:
    await session.close()
```

## 核心类型

### `ClientProfile`

| 字段                | 类型   | 默认值    | 说明                      |
| ------------------- | ------ | --------- | ------------------------- |
| `max_views`         | `int`  | `1`       | 最大并发 view 数。        |
| `enable_cache`      | `bool` | `True`    | 是否协商服务端 cache。    |
| `max_cache_entries` | `int`  | `256`     | 请求的最大 cache 条目数。 |
| `max_cache_bytes`   | `int`  | `8388608` | 请求的最大 cache 字节数。 |

### `ClientDialPolicy`

| 字段                    | 类型                                 | 说明                                       |
| ----------------------- | ------------------------------------ | ------------------------------------------ |
| `selected_transport_id` | [`TransportId`](./enums#transportid) | 已选择 transport。                         |
| `forced_transport_id`   | [`TransportId`](./enums#transportid) | 强制 transport；`UNSPECIFIED` 表示不强制。 |

### `SubmitRequest`

| 字段                  | 类型                                           | 必填 | 说明                                                             |
| --------------------- | ---------------------------------------------- | ---: | ---------------------------------------------------------------- |
| `operation_id`        | `int`                                          |   是 | 非零 `u64` 生命周期 id，与 `frame_id` 独立。                     |
| `frame_id`            | `int`                                          |   是 | in-flight 内唯一。                                               |
| `tile_ids`            | `tuple[int, ...]`                              |   否 | 提交的 tile id。                                                 |
| `sections`            | `tuple[TensorSectionData, ...]`                |   否 | Tensor sections，见 [packet types](./packet#tensorsectiondata)。 |
| `typed_payloads`      | `tuple[TypedPayload, ...]`                     |   否 | 非 tensor payload。                                              |
| `input_profile`       | [`InputProfile`](./enums#inputprofileintenum)  |   是 | 输入数据 profile。                                               |
| `submit_mode`         | [`SubmitMode`](./enums#submitmodeintenum)      |   是 | Inline 或 reference。                                            |
| `budget_policy`       | [`BudgetPolicy`](./enums#budgetpolicy-intflag) |   否 | 允许的降级策略。                                                 |
| `inference_budget_ms` | `int`                                          |   否 | 相对推理预算；`0` 表示无限制。                                   |
| `deadline_ms`         | `int`                                          |   否 | 绝对 Unix 毫秒时间戳。                                           |

### `Result`

这是 pure packet/router API 使用的解码 helper，不是 Preview4 native role 的 result 投影；role session
返回上文的 `NativeRuntimeResult`。

| 字段             | 类型                                | 说明                     |
| ---------------- | ----------------------------------- | ------------------------ |
| `packet`         | [`NnrpPacket`](./packet#nnrppacket) | 原始结果包。             |
| `metadata`       | `ResultPushMetadata`                | 解析后的结果 metadata。  |
| `sections`       | `tuple[TensorSectionData, ...]`     | Tensor 结果 sections。   |
| `typed_payloads` | `tuple[TypedPayload, ...]`          | 非 tensor 结果 payload。 |

## 常见坑

::: warning

1. 一定要关闭 `ClientSession`，否则服务端资源会等到超时才释放。
2. 不要让多个 coroutine 直接并发写同一个 session；使用应用层队列。
3. `deadline_ms` 是绝对 Unix 毫秒时间戳，`inference_budget_ms` 是相对时间。
4. 生产环境优先使用探测或 fallback 策略，避免在 TCP-only 网络里强制 QUIC。 :::
