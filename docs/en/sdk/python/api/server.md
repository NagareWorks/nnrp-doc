# Python — Server API

The server API starts at session acceptance: accept a transport connection, receive frame submits,
send results or drops, then close. Message and packet pages remain the low-level reference.

## Imports

```python
from nnrp.server import (
    ServerProfile,
    ServerSession,
    ReceivedSubmit,
    accept_server_session,
)
```

## Server Workflow

1. Create a [`ServerProfile`](#serverprofile).
2. Open a listener with a transport adapter, such as `serve_tcp` or `serve_quic`.
3. Call [`accept_server_session`](#accept-server-session) for each accepted connection.
4. Loop on [`ServerSession.receive_submit`](#serversession-receive-submit).
5. Send one response per frame with [`send_result`](#serversession-send-result) or
   [`send_result_drop`](#serversession-send-result-drop).
6. Close the session when the peer disconnects or the application rejects further work.

## `accept_server_session`

Accepts a connection, validates `CLIENT_HELLO`, sends `SERVER_HELLO_ACK`, and returns an active
[`ServerSession`](#serversession).

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `listener_or_connection` | `ServerListener \| ServerConnection` | Yes | Open transport | Listener or accepted connection from a transport adapter. |
| `profile` | [`ServerProfile`](#serverprofile) | Yes | Mutable config object | Server capabilities and limits. |
| `model_name` | `str` | No | Defaults to `""` | Active model name returned in the handshake. |
| `extra_extensions` | `tuple[ControlExtensionEntry, ...]` | No | Defaults to empty | Extra control extensions attached to `SERVER_HELLO_ACK`. |
| `auth_validator` | `Callable[[bytes], bool] \| None` | No | Synchronous predicate | Rejects connections when it returns `False`. |

| Returns | Raises |
|---|---|
| [`ServerSession`](#serversession) | Transport errors, auth rejection, malformed handshake, or capability rejection. |

```python
session = await accept_server_session(
    listener,
    ServerProfile(max_concurrent_frames=4),
    model_name="render-v1",
    auth_validator=validate_token,
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
4. `auth_validator` is synchronous; do not perform database or network I/O inside it.
:::
