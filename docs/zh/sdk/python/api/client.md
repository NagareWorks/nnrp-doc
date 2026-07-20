# Python — Client API

Client
文档按使用路径组织：连接、提交、收结果、关闭。数据结构只在参数表里链接到对应声明，代码块只用于示例。

## 导入

```python
from nnrp.client import (
    ClientProfile,
    ClientSession,
    NativeClientSessionOpenOptions,
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
| `endpoint` | `str \| NnrpEndpoint` | 是 | 远端 `nnrp://` 或 `nnrps://` 应用 endpoint。 |
| `provider_endpoint` | `str \| NativeTransportEndpoint \| None` | 否 | IPC、WebSocket、一致性测试、诊断或受控部署使用的显式 carrier-local locator。 |
| `transport_policy` | `TransportPolicy \| str \| int` | 否 | Provider 选择策略，默认 `auto`。 |
| `transport` | `str \| None` | 否 | 显式选择 `tcp`、`quic`、`ipc` 或 `websocket`。 |
| `security` | `NativeTransportClientSecurity \| None` | 否 | Provider 持有的 TLS 或对端校验配置。 |
| `options` | `NativeClientConnectionOptions \| None` | 否 | Native connection id 与 generation。 |
| `artifact_path` | `Path \| str \| None` | 否 | 显式 native library 路径；通常不需要。 |
| `root` | `Path \| str \| None` | 否 | Native artifact 根目录。 |
| `native_platform` | `NativePlatform \| None` | 否 | 诊断或测试时覆盖平台选择。 |
| `library` | `Any \| None` | 否 | 测试注入用 library。 |
| `fallback` | `NativeRuntimeBackend \| None` | 否 | 测试或诊断 fallback。 |
| `require_native` | `bool` | 否 | 生产路径建议设为 `True`，native 不可用时直接失败。 |

```python
with connect_native_client_connection(
    "nnrps://runtime.example/session/default",
    require_native=True,
    transport="tcp",
) as connection:
    session = connection.open_session(NativeClientSessionOpenOptions(requested_session_id=42))
    result = connection.submit_and_poll_result(session, operation_id=1001, frame_id=1, body=b"payload")
```

TCP 与 QUIC 使用应用 endpoint 的 authority，authority 未提供端口时默认使用 `4433`。IPC 必须
提供匹配的 `unix://` 或 `npipe://` `provider_endpoint`；WebSocket 必须提供匹配的 `ws://` 或
`wss://` 覆盖。Provider-local locator 与最终选择的 Provider 不匹配时必须拒绝。只有 role adoption
成功后 carrier 所有权才移入 Rust；失败时 Python 仍可关闭 carrier wrapper。

## `NativeClientConnection`

Native client connection 是 preview4 Python host API 的主入口。它不让 Python 为每个小字段跨一次 ABI，而是通过 session、operation、event 和 owned buffer 走粗粒度 native 调用。

### `NativeClientConnection.open_session`

`NativeClientSessionOpenOptions` 的冻结默认值如下：

| 字段 | 默认值 | 说明 |
|---|---:|---|
| `requested_session_id` | `1` | 初始 wire session id 请求值。 |
| `session_generation` | `1` | 本地 handle generation。 |
| `profile_id` | `2`（`STANDARD_PROFILE_TOKEN`） | 标准 token profile。 |
| `schema_id` | `0x00001001`（`TOKEN_DELTA_SCHEMA_ID`） | Token-delta schema。 |
| `schema_version` | `3`（`TOKEN_DELTA_SCHEMA_VERSION`） | Token-delta schema version。 |

无参数 `open_session()` 必须使用这一组值，与 Rust runtime 默认契约一致。只有在选择其他已安装
profile/schema 组合时才覆盖这些字段。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `options` | `NativeClientSessionOpenOptions \| None` | 否 | Session id、generation、profile、schema 等打开参数。 |

| 返回 |
|---|
| `NativeRuntimeSession` |

### `NativeClientConnection.submit_and_poll_result`

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `session` | `NativeRuntimeSession` | 是 | 已打开的 native session。 |
| `operation_id` | `int` | 是 | Operation id。 |
| `frame_id` | `int` | 是 | Frame id。 |
| `metadata` | `FrameSubmitMetadata \| None` | 否 | Typed submit metadata；默认生成 canonical token metadata。 |
| `body` | `bytes \| bytearray \| memoryview` | 否 | Submit metadata 之后的应用 body。 |
| `parent_operation_id` | `int \| None` | 否 | 父 operation。 |
| `operation_group_id` | `int \| None` | 否 | Operation 分组。 |
| `max_events` | `int \| None` | 否 | 本次 poll 最多处理事件数。 |

`NativeRuntimeSession.submit()` 与 `submit_operation()` 使用同一套 `metadata` + `body` 契约。
未传 `metadata` 时，SDK 使用给定的非零 `operation_id` 构造 canonical token submit metadata：
`TOKEN_CHUNK`、一个 payload frame、inline mode、25 ms latency budget。其他 profile 传入自己的
typed metadata。SDK 拒绝 `operation_id` 与方法参数不一致的 metadata，随后拼装 metadata 与 body，
只跨一次 FFI。
| `timeout_ms` | `int` | 否 | Native role event poll 的最长等待时间；`0` 表示非阻塞 poll。 |

| 返回 |
|---|
| `NativeRuntimeResult` |

对于 `RESULT_PUSH`，`NativeRuntimeResult` 提供：

| 字段 | 类型 | 说明 |
|---|---|---|
| `metadata` | `ResultPushMetadata` | 已解码的固定 result metadata。 |
| `body` | `bytes` | Metadata 前缀之后、由 Python 持有的应用 result body。 |
| `operation_id` | `int` | 已关联的 wire operation identity。 |
| `frame_id` | `int` | 已关联的 wire frame identity。 |

应用侧 result 不暴露包含序列化 metadata 的 FFI payload。

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

Event pump helper 包括 `dispatch_events`、`dispatch_credit_updates`、`dispatch_result_hints`、`dispatch_structured_events`、`dispatch_tool_deltas` 和 `dispatch_workflow_states`。

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
