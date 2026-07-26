# Python — Server API

The server API starts at session acceptance: accept a transport connection, receive frame submits,
send results or drops, then close. Message and packet pages remain the low-level reference.

## Imports

```python
from nnrp import NativeTransportServerSecurity, TransportPolicy
from nnrp.server import (
    NativeServerAcceptOptions,
    NativeServerProviderRoute,
    ServerProfile,
    ServerSession,
    ServerSessionAcceptResolution,
    ReceivedSubmit,
    accept_server_connection,
    accept_server_session,
    listen_native_server,
)
```

## Server Workflow

Production hosts use the Rust-owned role path:

1. Call [`listen_native_server`](#listen-native-server) with an `nnrp://` or `nnrps://` application endpoint.
2. Call `NativeServer.accept()`; Rust accepts the carrier and completes the NNRP handshake.
3. Receive submit/control/object/cache events from the accepted `NativeRuntimeServerSession`.
4. Send progress, partial, terminal, drop, and trace output through that session.
5. Close the session and server context.

Packet transport helpers are reserved for diagnostics and custom carriers:

1. Create a [`ServerProfile`](#serverprofile).
2. Open a listener with a packet transport adapter, such as `serve_tcp` or `serve_quic`.
3. Call [`accept_server_session`](#accept-server-session) for each listener, or
   [`accept_server_connection`](#accept-server-connection) when a runtime already accepted the
   connection or prefetched the first control packet.
4. Loop on [`ServerSession.receive_submit`](#serversession-receive-submit).
5. Send one response per frame with [`send_result`](#serversession-send-result) or
   [`send_result_drop`](#serversession-send-result-drop).
6. Close the session when the peer disconnects or the application rejects further work.

## `listen_native_server`

Resolves all installed providers allowed by policy, opens their listener set atomically, transfers
each listener to its Rust server runtime, and returns one logical `NativeServer` context manager.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `endpoint` | `str \| NnrpEndpoint` | Yes | Local `nnrp://` or `nnrps://` application endpoint. |
| `provider_routes` | `Mapping[str, NativeServerProviderRoute] \| None` | No | Per-carrier bind locator and server-security configuration. |
| `transport_policy` | `TransportPolicy \| str \| int` | No | Provider selection policy; defaults to `auto`. |
| `options` | `NativeServerOptions \| None` | No | Native server id and generation. |
| `require_native` | `bool` | No | Production code sets `True`; missing native support is an error. |

`NativeServer.accept(options=None)` takes `NativeServerAcceptOptions` containing
`session_handle_id`, `session_generation`, and `timeout_ms`, and returns a carrier-backed
`NativeRuntimeServerSession`. It never creates a synthetic local submit.

`NativeServer.bound_provider_endpoints` is an immutable mapping from canonical transport name to the actual bound
`NativeTransportEndpoint`, including operating-system-assigned ports. A terminal provider-listener failure fails and
closes the complete logical server; rejecting one peer handshake affects only that accepted carrier.

```python
with listen_native_server(
    "nnrp://0.0.0.0:4433/runtime/default",
    transport_policy=TransportPolicy.FORCE_TCP,
) as server:
    session = server.accept(NativeServerAcceptOptions(timeout_ms=30_000))
```

## `NativeRuntimeServerSession` Preview4 Frames

`NativeRuntimeServerSession.active_transport_name` is the canonical transport name of the listener that accepted the
carrier. It matches the negotiated active transport and is not inferred from listener preference order.

Native server hosts use the same role-neutral runtime-frame ABI as clients. The server session
exposes these application-facing methods:

| Method | Message |
|---|---|
| `send_progress(metadata, body=b"")` | `PROGRESS` |
| `send_partial_result(metadata, body=b"")` | `PARTIAL_RESULT` |
| `send_backpressure(metadata)`, `send_credit_update(metadata)` | pressure messages |
| `send_result_drop_reason(metadata, diagnostic=b"")` | `RESULT_DROP_REASON` |
| `send_trace_context(metadata, body=b"")` | `TRACE_CONTEXT` |
| `send_recoverable_error(metadata, diagnostic=b"")`, `send_retry_after(...)` | recovery messages |
| `declare_object`, `reference_object`, `release_object` | object lifecycle messages |
| `patch_object`, `send_object_delta` | object update messages |
| `reference_cache`, `report_cache_miss`, `invalidate_cache` | cache messages |

`poll_runtime_frames()` and `iter_runtime_frames()` return the decoded
[`NativeRuntimeFrameEvent`](./runtime#nativeruntimeframeevent). No application-facing server method
accepts a raw `control_code`.

### `NativeRuntimeServerSession.poll_event`

```python
def poll_event(self, *, timeout_ms: int = 0) -> NativeRuntimeEvent | None: ...
```

Returns the next submit, control, runtime-object, cache, recovery, or close event in wire order, or
`None` when the bounded wait completes without an event. This is the application-facing single-event
receive contract. `poll_events(max_events=..., timeout_ms=...)` is the coarse native batch surface used
by adapters, conformance, and throughput-sensitive dispatch loops; it does not change event order.

### `NativeRuntimeServerSession.receive_submit`

```python
def receive_submit(
    self,
    *,
    timeout_ms: int = 0,
    max_events: int = 1,
) -> NativeRuntimeServerOperation: ...
```

The returned operation exposes the wire identities and decoded request without exposing an FFI
buffer:

| Field | Type | Description |
|---|---|---|
| `operation_id` | `int` | Non-zero wire operation identity from `FRAME_SUBMIT`. |
| `frame_id` | `int` | Wire frame identity from the packet header. |
| `metadata` | `FrameSubmitMetadata` | Decoded submit metadata. |
| `body` | `bytes` | Owned application body after the fixed metadata prefix. |

### `NativeRuntimeServerOperation.send_result`

```python
def send_result(
    self,
    metadata: ResultPushMetadata,
    body: bytes = b"",
) -> None: ...
```

The SDK validates and packs `ResultPushMetadata` together with `body`, then performs one coarse
native call. Callers never prepend serialized metadata or pass an FFI-shaped result payload.

## `accept_server_session`

Accepts a connection, validates `CLIENT_HELLO`, sends `SERVER_HELLO_ACK`, and returns an active
[`ServerSession`](#serversession).

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `listener` | `ServerListener` | Yes | Open listener | QUIC/TCP listener. |
| `session_id` | `int \| None` | No | Defaults to the requested id | Server-assigned or overridden session id. |
| `active_model_name` | `str` | No | Defaults to `""` | Retained on `ServerSession.active_model_name`; not written into the `SERVER_HELLO_ACK` body. |
| `server_profile` | [`ServerProfile`](#serverprofile) | No | Defaults to `ServerProfile()` | Server capabilities and limits. |
| `timeout` | `float` | No | Seconds, default `10.0` | Accept and handshake receive timeout. |
| `session_resolver` | `Callable[[ClientHelloContext], ServerSessionAcceptResolution \| Awaitable[...]] \| None` | No | Defaults to `None` | Resolves the final `session_id` and `active_model_name` after parsing `CLIENT_HELLO`. |

| Returns | Raises |
|---|---|
| [`ServerSession`](#serversession) | Transport errors, auth rejection, malformed handshake, or capability rejection. |

```python
session = await accept_server_session(
    listener,
    server_profile=ServerProfile(max_concurrent_frames=4),
    active_model_name="render-v1",
)
```

## `accept_server_connection`

Runs the server-side handshake on an already accepted transport connection. Use this entrypoint when
a runtime owns the accept loop, handles `TRANSPORT_PROBE` first, or has already prefetched the first
control packet.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `connection` | `ServerConnection` | Yes | Accepted connection | One already accepted carrier connection. |
| `first_packet` | `NnrpPacket \| None` | No | Defaults to `None` | Prefetched `CLIENT_HELLO`; when omitted the SDK reads it. |
| `session_id` | `int \| None` | No | Defaults to the requested id | Used when `session_resolver` is not provided. |
| `active_model_name` | `str` | No | Defaults to `""` | Application-visible model name retained on `ServerSession`. |
| `server_profile` | [`ServerProfile`](#serverprofile) | No | Defaults to `ServerProfile()` | Server capabilities and limits. |
| `timeout` | `float` | No | Seconds, default `10.0` | Handshake receive timeout. |
| `session_resolver` | `Callable[[ClientHelloContext], ServerSessionAcceptResolution \| Awaitable[...]] \| None` | No | Defaults to `None` | Resolves the server session from the parsed `CLIENT_HELLO`. |

Both `accept_server_connection` and `accept_server_session` construct `SERVER_HELLO_ACK` inside the
SDK. The SDK writes a `control_extension_block` into the ACK body, including at least the
transport policy ack extension that declares `active_transport_id`. `control_extension_bytes` must
match the ACK body length; application model names, runtime session ids, or other business state
must not be encoded into the ACK body.

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

## `ServerSession`

An established server-side session.

### `ServerSession.receive_submit`

Receives the next `FRAME_SUBMIT` and parses it into a structured request.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `timeout` | `float \| None` | No | Seconds; `None` disables timeout | Maximum wait for a submit frame. |

| Returns | Raises |
|---|---|
| [`ReceivedSubmit`](#receivedsubmit) | `asyncio.TimeoutError`, malformed packet, session mismatch, unsupported wire format. |

```python
received = await session.receive_submit(timeout=30.0)
```

### `ServerSession.send_result`

Pushes an inference result for a received frame.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `frame_id` | `int` | Yes | Frame id from [`ReceivedSubmit`](#receivedsubmit) | Correlates the result with the client request. |
| `tile_ids` | `tuple[int, ...]` | No | Defaults to empty | Result tile ids. |
| `sections` | `tuple[TensorSectionData, ...]` | No | Defaults to empty | Tensor result sections. |
| `typed_payloads` | `tuple[TypedPayload, ...]` | No | Defaults to empty | Non-tensor result payloads. |
| `result_class` | [`ResultClass`](./enums#resultclassintenum) | No | Defaults to `COMPLETE` | Completeness classification. |
| `applied_budget_policy` | [`BudgetPolicy`](./enums#budgetpolicy-intflag) | No | Defaults to `NONE` | Actual degradation policy applied by the server. |
| `inference_ms` | `int` | No | Milliseconds | Model execution time. |
| `queue_ms` | `int` | No | Milliseconds | Queue wait time. |
| `server_total_ms` | `int` | No | Milliseconds | Total server-side time. |
| `status_code` | `int` | No | Application-defined | Result status detail. |
| `trace_id` | `int` | No | `0..2^64-1` | Trace id echoed in the packet header. |

| Returns | Raises |
|---|---|
| `int` total bytes sent | Serialization or transport errors. |

```python
await session.send_result(
    frame_id=received.metadata.frame_id,
    sections=run_inference(received.request),
    result_class=ResultClass.COMPLETE,
)
```

### `ServerSession.send_result_drop`

Notifies the client that a submitted frame will not produce a result.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `frame_id` | `int` | Yes | Submitted frame id | Frame to drop. |
| `reason` | `int` | No | Application-defined | Drop reason code when supported by the current message shape. |

| Returns | Raises |
|---|---|
| `int` total bytes sent | Serialization or transport errors. |

```python
if queue_is_full:
    await session.send_result_drop(frame_id=received.metadata.frame_id)
```

### `ServerSession.send_flow_update`

Sends backpressure or credit information to the client.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `metadata` | `FlowUpdateMetadata` | Yes | See [message types](./messages) | Flow-control metadata to serialize. |

| Returns | Raises |
|---|---|
| `int` total bytes sent | Serialization or transport errors. |

```python
await session.send_flow_update(flow_update_metadata)
```

### `ServerSession.close`

Closes the server session and transport.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | No parameters. |

| Returns | Raises |
|---|---|
| `None` | Transport close errors. |

```python
await session.close()
```

## Core Types

### `ServerProfile`

Server-side capabilities and limits.

| Field | Type | Default | Description |
|---|---|---|---|
| `max_concurrent_frames` | `int` | `1` | Advertised in-flight frame limit. |
| `enable_cache` | `bool` | `True` | Enables cache negotiation. |
| `max_sections` | `int` | `16` | Maximum tensor sections per frame. |
| `max_body_bytes` | `int` | `33554432` | Maximum request body size. |

### `ReceivedSubmit`

Parsed frame submission.

| Field | Type | Description |
|---|---|---|
| `packet` | [`NnrpPacket`](./packet#nnrppacket) | Raw `FRAME_SUBMIT` packet. |
| `metadata` | `FrameSubmitMetadata` | Parsed frame metadata. |
| `request` | [`SubmitRequest`](./client#submitrequest) | Structured submit request. |
| `tensor_body` | `TensorBodyView \| None` | Parsed tensor body view when present. |

### `ClientHelloContext`

Handshake context retained on the server session.

| Field | Type | Description |
|---|---|---|
| `packet` | [`NnrpPacket`](./packet#nnrppacket) | Raw `CLIENT_HELLO` packet. |
| `metadata` | `ClientHelloMetadata` | Parsed handshake metadata. |
| `auth_block` | `bytes` | Application-defined auth payload. |
| `control_extensions` | `tuple[ControlExtensionEntry, ...]` | Handshake extensions. |

### `ServerSessionAcceptResolution`

Return value for `session_resolver`.

| Field | Type | Description |
|---|---|---|
| `session_id` | `int` | Final wire session id accepted by the server. |
| `active_model_name` | `str` | Application-visible active model name; it is not encoded into the ACK body. |

## Example

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

## Common Pitfalls

::: warning
1. Do not run blocking inference inside the receive coroutine; use an executor or worker pool.
2. Every accepted frame needs a result or a drop. Silent drops leave clients waiting.
3. `ServerProfile.max_concurrent_frames` is a protocol limit, not a full application scheduler.
4. Runtime integrations should not construct `SERVER_HELLO_ACK` manually; use
   `accept_server_connection(first_packet=...)` when the first packet has already been read.
:::
