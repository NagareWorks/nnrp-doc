# Python — Client API

Client
文档按使用路径组织：连接、提交、收结果、关闭。数据结构只在参数表里链接到对应声明，代码块只用于示例。

## 导入

```python
from nnrp.client import (
    ClientProfile,
    ClientSession,
    SubmitRequest,
    connect_client_control,
    connect_client_control_with_probe,
)
```

## Client 使用流程

1. 构造 [`ClientProfile`](#clientprofile)。
2. 选择 TCP、QUIC 或 probe-based bootstrap。
3. 调用 [`connect_client_control`](#connect-client-control) 或
   [`connect_client_control_with_probe`](#connect-client-control-with-probe)。
4. 使用返回 bootstrap session 内的 [`ClientSession`](#clientsession)；多帧并发用
   [`send_submit`](#clientsession-send-submit) + [`receive_result`](#clientsession-receive-result)。
5. 在 client control session 生命周期内保持 async context manager 打开。

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
