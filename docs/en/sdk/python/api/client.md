# Python — Client API

The client page starts with the host-facing workflow: create a connection, open or use a session,
submit work, read results, then close. Data structures are linked from the parameter tables instead
of repeated as interface-style code blocks.

## Imports

Use the high-level client/session APIs for applications. Low-level packet builders remain public for
tests, diagnostics, and custom transports.

```python
from nnrp.client import (
    ClientProfile,
    ClientSession,
    SubmitRequest,
    connect_client_control,
    connect_client_control_with_probe,
)
```

## Client Workflow

1. Build a [`ClientProfile`](#clientprofile).
2. Choose TCP, QUIC, or probe-based transport bootstrap.
3. Call [`connect_client_control`](#connect-client-control) or
   [`connect_client_control_with_probe`](#connect-client-control-with-probe).
4. Use the returned bootstrap session's [`ClientSession`](#clientsession) for request/response
   flows, or [`send_submit`](#clientsession-send-submit) plus
   [`receive_result`](#clientsession-receive-result) when multiple frames are in flight.
5. Keep the async context manager open for the lifetime of the client control session.

## `connect_client_control`

Opens the selected transport, completes the control handshake, and yields a
`ClientControlBootstrapSession`.

| Parameter               | Type                                 | Required | Values / Range               | Description                                                    |
| ----------------------- | ------------------------------------ | -------: | ---------------------------- | -------------------------------------------------------------- |
| `host`                  | `str`                                |      Yes | Hostname or IP               | Remote NNRP endpoint.                                          |
| `quic_port`             | `int \| None`                        |       No | QUIC port                    | Enables QUIC when provided.                                    |
| `tcp_port`              | `int \| None`                        |       No | TCP port                     | Enables TCP when provided.                                     |
| `quic_configuration`    | `QuicConfiguration \| None`          |       No | aioquic config               | QUIC client configuration.                                     |
| `tcp_configuration`     | `NnrpTcpClientConfiguration \| None` |       No | TCP config                   | TCP client configuration.                                      |
| `client_profile`        | [`ClientProfile`](#clientprofile)    |       No | Defaults to SDK profile      | Client capabilities and cache limits sent during handshake.    |
| `selected_transport_id` | [`TransportId`](./enums#transportid) |       No | `UNSPECIFIED`, `QUIC`, `TCP` | Preferred selected transport when no probe result is supplied. |
| `forced_transport_id`   | [`TransportId`](./enums#transportid) |       No | `UNSPECIFIED`, `QUIC`, `TCP` | Hard transport selection for controlled deployments.           |
| `auth_block`            | `bytes`                              |       No | Defaults to `b""`            | Application-defined authentication payload.                    |
| `timeout`               | `float`                              |       No | Seconds, default `10.0`      | Connect and handshake timeout.                                 |

| Returns                                        | Raises                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `AsyncIterator[ClientControlBootstrapSession]` | Transport errors, malformed handshake errors, or capability rejection errors. |

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

Probes QUIC and TCP, selects a transport, and uses the selected transport in the handshake.

| Parameter              | Type                                 | Required | Values / Range          | Description                             |
| ---------------------- | ------------------------------------ | -------: | ----------------------- | --------------------------------------- |
| `host`                 | `str`                                |      Yes | Hostname or IP          | Remote NNRP endpoint.                   |
| `quic_port`            | `int`                                |      Yes | QUIC port               | QUIC probe/connect port.                |
| `tcp_port`             | `int`                                |      Yes | TCP port                | TCP probe/connect port.                 |
| `quic_configuration`   | `QuicConfiguration \| None`          |       No | aioquic config          | QUIC client configuration.              |
| `tcp_configuration`    | `NnrpTcpClientConfiguration \| None` |       No | TCP config              | TCP client configuration.               |
| `client_profile`       | [`ClientProfile`](#clientprofile)    |       No | Defaults to SDK profile | Capability and cache preferences.       |
| `probe_payload_bytes`  | `int`                                |       No | Default `32768`         | Payload size used by each probe sample. |
| `probe_sample_count`   | `int`                                |       No | Default `3`             | Number of scored probe samples.         |
| `include_warmup_probe` | `bool`                               |       No | Default `False`         | Adds a warmup sample before scoring.    |
| `auth_block`           | `bytes`                              |       No | Defaults to `b""`       | Application auth payload.               |
| `timeout`              | `float`                              |       No | Seconds, default `10.0` | Probe, connect, and handshake timeout.  |

| Returns                                        | Raises                                   |
| ---------------------------------------------- | ---------------------------------------- |
| `AsyncIterator[ClientControlBootstrapSession]` | Probe, transport, or handshake failures. |

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

An established client-side session. Prefer these methods over building `FRAME_SUBMIT` packets by
hand.

### `ClientSession.submit`

Submits one frame and waits for the matching result.

| Parameter | Type                              | Required | Values / Range                            | Description                      |
| --------- | --------------------------------- | -------: | ----------------------------------------- | -------------------------------- |
| `request` | [`SubmitRequest`](#submitrequest) |      Yes | `frame_id` must be unique while in flight | Structured frame submit request. |
| `timeout` | `float \| None`                   |       No | Seconds; `None` disables timeout          | Maximum wait for the result.     |

| Returns             | Raises                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| [`Result`](#result) | `asyncio.TimeoutError`, transport errors, protocol correlation errors. |

```python
result = await session.submit(
    SubmitRequest(
        frame_id=1,
        sections=(tensor_section,),
        input_profile=InputProfile.CHANGED_TILES_LUMA,
        submit_mode=SubmitMode.INLINE,
    ),
    timeout=0.05,
)
```

### `ClientSession.send_submit`

Sends a frame without waiting for its result. Use it with
[`receive_result`](#clientsession-receive-result) or [`ResultRouter`](#resultrouter).

| Parameter | Type                              | Required | Values / Range                            | Description                                      |
| --------- | --------------------------------- | -------: | ----------------------------------------- | ------------------------------------------------ |
| `request` | [`SubmitRequest`](#submitrequest) |      Yes | `frame_id` must be unique while in flight | Request to serialize and send as `FRAME_SUBMIT`. |

| Returns | Raises                                          |
| ------- | ----------------------------------------------- |
| `int`   | Transport errors or local serialization errors. |

```python
await session.send_submit(request)
```

### `ClientSession.receive_result`

Receives the next server-pushed result on the result channel.

| Parameter | Type            | Required | Values / Range                   | Description                       |
| --------- | --------------- | -------: | -------------------------------- | --------------------------------- |
| `timeout` | `float \| None` |       No | Seconds; `None` disables timeout | Maximum wait for the next result. |

| Returns             | Raises                                                           |
| ------------------- | ---------------------------------------------------------------- |
| [`Result`](#result) | `asyncio.TimeoutError`, malformed result, or correlation errors. |

```python
result = await session.receive_result(timeout=0.05)
```

### `ClientSession.patch_session`

Updates negotiated runtime parameters without reopening the session.

| Parameter               | Type                                         | Required | Values / Range       | Description                                   |
| ----------------------- | -------------------------------------------- | -------: | -------------------- | --------------------------------------------- |
| `patch_fields`          | [`SessionPatchField`](./enums#session-patch) |      Yes | Bitmask              | Selects which fields the server should apply. |
| `target_cadence`        | `int`                                        |       No | `0` leaves unchanged | Target FPS or cadence value.                  |
| `quality_tier`          | `int`                                        |       No | `0..255`             | Application-defined quality tier.             |
| `active_lane_mask`      | `int`                                        |       No | Bitmask              | Active lane/view mask.                        |
| `preferred_codec`       | `int`                                        |       No | Codec id             | Preferred codec.                              |
| `preferred_compression` | `int`                                        |       No | Compression id       | Preferred compression mode.                   |

| Returns                   | Raises                                       |
| ------------------------- | -------------------------------------------- |
| `SessionPatchAckMetadata` | Rejection, timeout, or malformed ack errors. |

```python
ack = await session.patch_session(
    SessionPatchField.TARGET_CADENCE | SessionPatchField.QUALITY_TIER,
    target_cadence=60,
    quality_tier=2,
)
```

### `ClientSession.close`

Closes the session and underlying connection gracefully.

| Parameter | Type | Required | Values / Range | Description    |
| --------- | ---- | -------: | -------------- | -------------- |
| None      | -    |        - | -              | No parameters. |

| Returns | Raises                  |
| ------- | ----------------------- |
| `None`  | Transport close errors. |

```python
try:
    await session.submit(request)
finally:
    await session.close()
```

## Core Types

### `ClientProfile`

Client capabilities and cache preferences used during handshake.

| Field               | Type   | Default   | Description                                      |
| ------------------- | ------ | --------- | ------------------------------------------------ |
| `max_views`         | `int`  | `1`       | Maximum concurrent views.                        |
| `enable_cache`      | `bool` | `True`    | Whether to negotiate server-side cache support.  |
| `max_cache_entries` | `int`  | `256`     | Maximum cache entries requested from the server. |
| `max_cache_bytes`   | `int`  | `8388608` | Maximum cache bytes requested from the server.   |

### `ClientDialPolicy`

Transport policy included in the client handshake.

| Field                   | Type                                 | Description                                     |
| ----------------------- | ------------------------------------ | ----------------------------------------------- |
| `selected_transport_id` | [`TransportId`](./enums#transportid) | Transport selected by probing or policy.        |
| `forced_transport_id`   | [`TransportId`](./enums#transportid) | Forced transport; `UNSPECIFIED` means no force. |

### `SubmitRequest`

Frame submission request.

| Field                 | Type                                           | Required | Description                                                              |
| --------------------- | ---------------------------------------------- | -------: | ------------------------------------------------------------------------ |
| `frame_id`            | `int`                                          |      Yes | Unique frame id while in flight.                                         |
| `tile_ids`            | `tuple[int, ...]`                              |       No | Tile ids included in the request.                                        |
| `sections`            | `tuple[TensorSectionData, ...]`                |       No | Tensor payload sections. See [packet types](./packet#tensorsectiondata). |
| `typed_payloads`      | `tuple[TypedPayload, ...]`                     |       No | Non-tensor payload frames.                                               |
| `input_profile`       | [`InputProfile`](./enums#inputprofileintenum)  |      Yes | Input data profile.                                                      |
| `submit_mode`         | [`SubmitMode`](./enums#submitmodeintenum)      |      Yes | Inline or reference mode.                                                |
| `budget_policy`       | [`BudgetPolicy`](./enums#budgetpolicy-intflag) |       No | Allowed degradation behavior.                                            |
| `inference_budget_ms` | `int`                                          |       No | Relative inference budget in milliseconds; `0` means unlimited.          |
| `deadline_ms`         | `int`                                          |       No | Absolute Unix timestamp in milliseconds.                                 |

### `TypedPayload`

Non-tensor payload container.

| Field          | Type                                         | Required | Description        |
| -------------- | -------------------------------------------- | -------: | ------------------ |
| `payload_kind` | [`PayloadKind`](./enums#payloadkind-intflag) |      Yes | Payload family.    |
| `data`         | `bytes`                                      |      Yes | Raw payload bytes. |

### `Result`

Server-pushed inference result.

| Field            | Type                                | Description                 |
| ---------------- | ----------------------------------- | --------------------------- |
| `packet`         | [`NnrpPacket`](./packet#nnrppacket) | Raw result packet.          |
| `metadata`       | `ResultPushMetadata`                | Parsed result metadata.     |
| `sections`       | `tuple[TensorSectionData, ...]`     | Tensor result sections.     |
| `typed_payloads` | `tuple[TypedPayload, ...]`          | Non-tensor result payloads. |

### `ResultRouter`

Use `ResultRouter` when multiple frame ids are in flight and consumers need per-frame awaiters.

| Method        | Parameter                                          | Returns             | Description                                  |
| ------------- | -------------------------------------------------- | ------------------- | -------------------------------------------- |
| `send_submit` | [`SubmitRequest`](#submitrequest)                  | `int`               | Sends a request through the wrapped session. |
| `receive`     | `frame_id`, optional `view_id`, optional `timeout` | [`Result`](#result) | Waits for a specific frame result.           |
| `close`       | None                                               | `None`              | Stops the router task.                       |

## Common Pitfalls

::: warning

1. Always close `ClientSession`; unclosed sessions keep server-side resources alive until timeout.
2. Do not send from multiple coroutines through the same session without an application-level queue.
3. `deadline_ms` is absolute Unix time in milliseconds. `inference_budget_ms` is relative.
4. `FORCE_QUIC` hard-fails in TCP-only networks; prefer probing or fallback policies in production.
   :::
