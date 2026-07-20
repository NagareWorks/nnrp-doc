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
    NativeClientSessionOpenOptions,
    SubmitRequest,
    connect_client_control,
    connect_client_control_with_probe,
    connect_native_client_connection,
)
```

## Client Workflow

Production host code uses the Rust-backed native runtime:

1. Provide an `nnrp://` or `nnrps://` application endpoint.
2. Call [`connect_native_client_connection`](#connect-native-client-connection); the SDK selects an installed provider and opens its carrier.
3. Open a session with [`NativeClientConnection.open_session`](#nativeclientconnection-open-session).
4. Use coarse native methods for submit, polling, and runtime-control frames.
5. Call `close()` to release the connection and sessions.

Packet transport helpers remain public, but they are mainly for smoke tests, diagnostics, and custom transports:

1. Build a [`ClientProfile`](#clientprofile).
2. Choose TCP, QUIC, or probe-based transport bootstrap.
3. Call [`connect_client_control`](#connect-client-control) or
   [`connect_client_control_with_probe`](#connect-client-control-with-probe).
4. Use the returned bootstrap session's [`ClientSession`](#clientsession) for request/response
   flows, or [`send_submit`](#clientsession-send-submit) plus
   [`receive_result`](#clientsession-receive-result) when multiple frames are in flight.
5. Keep the async context manager open for the lifetime of the client control session.

## `connect_native_client_connection`

Selects an installed Preview4 provider for an application endpoint, opens the provider carrier,
transfers that carrier to the Rust role runtime, completes the NNRP handshake, and returns a
`NativeClientConnection` context manager. A provider-local locator never replaces the application
endpoint in normal host configuration.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `endpoint` | `str \| NnrpEndpoint` | Yes | Remote `nnrp://` or `nnrps://` application endpoint. |
| `provider_endpoint` | `str \| NativeTransportEndpoint \| None` | No | Explicit carrier-local locator for IPC, WebSocket, diagnostics, conformance, or controlled deployment. |
| `transport_policy` | `TransportPolicy \| str \| int` | No | Provider selection policy; defaults to `auto`. |
| `transport` | `str \| None` | No | Explicit `tcp`, `quic`, `ipc`, or `websocket` selection. |
| `security` | `NativeTransportClientSecurity \| None` | No | Provider-owned TLS or peer verification configuration. |
| `options` | `NativeClientConnectionOptions \| None` | No | Native connection id and generation options. |
| `artifact_path` | `Path \| str \| None` | No | Explicit native library path; usually unnecessary. |
| `root` | `Path \| str \| None` | No | Native artifact root. |
| `native_platform` | `NativePlatform \| None` | No | Platform override for diagnostics or tests. |
| `library` | `Any \| None` | No | Test-injected library. |
| `fallback` | `NativeRuntimeBackend \| None` | No | Test or diagnostic fallback. |
| `require_native` | `bool` | No | Recommended as `True` for production; fails when native runtime is unavailable. |

```python
with connect_native_client_connection(
    "nnrps://runtime.example/session/default",
    require_native=True,
    transport="tcp",
) as connection:
    session = connection.open_session(NativeClientSessionOpenOptions(requested_session_id=42))
    result = connection.submit_and_poll_result(session, operation_id=1001, frame_id=1, payload=b"payload")
```

TCP and QUIC resolve the application authority and default to port `4433` when the authority omits
a port. IPC requires a matching `unix://` or `npipe://` `provider_endpoint`; WebSocket requires a
matching `ws://` or `wss://` override. The SDK rejects a provider-local locator that does not belong
to the selected provider. Carrier ownership moves into Rust only after successful role adoption;
failure leaves the carrier wrapper closable by Python.

## `NativeClientConnection`

`NativeClientConnection` is the primary preview4 Python host API. It preserves coarse native calls through session, operation, event, and owned-buffer objects instead of crossing the ABI for every small field.

### `NativeClientConnection.open_session`

`NativeClientSessionOpenOptions` has these frozen defaults:

| Field | Default | Description |
|---|---:|---|
| `requested_session_id` | `1` | Initial wire session id request. |
| `session_generation` | `1` | Local handle generation. |
| `profile_id` | `2` (`STANDARD_PROFILE_TOKEN`) | Standard token profile. |
| `schema_id` | `0x00001001` (`TOKEN_DELTA_SCHEMA_ID`) | Token-delta schema. |
| `schema_version` | `3` (`TOKEN_DELTA_SCHEMA_VERSION`) | Token-delta schema version. |

The no-argument `open_session()` path uses exactly these values, matching the Rust runtime default.
Applications override them only when selecting another installed profile/schema pair.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `options` | `NativeClientSessionOpenOptions \| None` | No | Session id, generation, profile, and schema open options. |

| Returns |
|---|
| `NativeRuntimeSession` |

### `NativeClientConnection.submit_and_poll_result`

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `session` | `NativeRuntimeSession` | Yes | Open native session. |
| `operation_id` | `int` | Yes | Operation id. |
| `frame_id` | `int` | Yes | Frame id. |
| `payload` | `bytes \| bytearray \| memoryview` | No | Submit payload. |
| `parent_operation_id` | `int \| None` | No | Parent operation. |
| `operation_group_id` | `int \| None` | No | Operation group. |
| `max_events` | `int \| None` | No | Maximum events processed by this poll. |
| `timeout_ms` | `int` | No | Maximum time the native role event poll may wait; `0` performs a non-blocking poll. |

| Returns |
|---|
| `NativeRuntimeResult` |

### Runtime control helpers

| Method | Message type |
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

Event pump helpers include `dispatch_events`, `dispatch_credit_updates`, `dispatch_result_hints`, `dispatch_structured_events`, `dispatch_tool_deltas`, and `dispatch_workflow_states`.

## `NativeRuntimeSession` Preview4 Frames

The session returned by `NativeClientConnection.open_session()` owns the high-level Preview4 send
surface. Applications use these methods instead of constructing frames with the codec functions:

| Method | Message |
|---|---|
| `cancel_operation(metadata, diagnostic=b"")`, `abort_operation(...)` | `CANCEL`, `ABORT` |
| `update_priority(metadata)`, `update_deadline(metadata)`, `expire_at(metadata)` | scheduling messages |
| `supersede(metadata, diagnostic=b"")`, `update_budget(metadata)` | `SUPERSEDE`, `BUDGET_UPDATE` |
| `negotiate_capabilities(metadata, body=b"")`, `degrade_profile(...)` | capability messages |
| `send_route_hint(metadata, body=b"")`, `send_execution_hint(...)` | routing messages |
| `send_trace_context(metadata, body=b"")` | `TRACE_CONTEXT` |
| `declare_object(metadata, body=b"")`, `reference_object(...)` | `OBJECT_DECLARE`, `OBJECT_REF` |
| `release_object(metadata, diagnostic=b"")` | `OBJECT_RELEASE` |
| `patch_object(metadata, delta, metadata_body=b"")` | `OBJECT_PATCH` |
| `send_object_delta(metadata, delta, metadata_body=b"")` | `OBJECT_DELTA` |
| `reference_cache(metadata, body=b"")`, `report_cache_miss(...)` | cache reference/miss |
| `invalidate_cache(metadata)` | `CACHE_INVALIDATE` |

Every method returns `None`, validates declared lengths, and performs one coarse call to the
Rust-owned runtime. The underlying role-neutral frame-send primitive is internal to the SDK and is
not exposed on `NativeRuntimeSession`.

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
| `operation_id`        | `int`                                          |      Yes | Non-zero `u64` lifecycle id, independent from `frame_id`.                |
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
