# Python — Server

Server API is defined in the `nnrp.server` package.

## Import

```python
from nnrp.server import (
    ServerProfile,
    ServerSession,
    ClientHelloContext,
    ReceivedSubmit,
    accept_server_session,
)
```

---

## `ServerProfile`

Server configuration (`@dataclass`, mutable).

| Field | Type | Default | Description |
|---|---|---|---|
| `max_concurrent_frames` | `int` | `1` | Max concurrent frames in-flight |
| `enable_cache` | `bool` | `True` | Enable cache negotiation |
| `max_sections` | `int` | `16` | Max tensor sections per frame |
| `max_body_bytes` | `int` | `33554432` | Max body bytes per frame (32 MB) |

---

## `ClientHelloContext`

Client handshake context (`@dataclass(frozen=True, slots=True)`).

| Field | Type | Description |
|---|---|---|
| `packet` | `NnrpPacket` | Raw `CLIENT_HELLO` packet |
| `metadata` | `ClientHelloMetadata` | Parsed handshake metadata |
| `auth_block` | `bytes` | Client auth block (validated by application) |
| `control_extensions` | `tuple[ControlExtensionEntry, ...]` | Handshake extension entries |

## `ReceivedSubmit`

Received and parsed frame submission (`@dataclass(frozen=True, slots=True)`).

| Field | Type | Description |
|---|---|---|
| `packet` | `NnrpPacket` | Raw `FRAME_SUBMIT` packet |
| `metadata` | `FrameSubmitMetadata` | Parsed frame metadata |
| `request` | `SubmitRequest` | Structured submit request |
| `tensor_body` | `TensorBodyView \| None` | Tensor body view (`None` if no tensor payload) |

---

## `ServerSession`

Established server session (`@dataclass(slots=True)`).

### Fields

| Field | Type | Description |
|---|---|---|
| `connection` | `NnrpQuicConnection \| NnrpTcpConnection` | Underlying transport connection |
| `transport_id` | `TransportId` | Current transport type |
| `hello` | `ClientHelloContext` | Handshake context |
| `session_id` | `int` | Session ID |
| `active_model_name` | `str` | Active model name (empty string by default) |
| `server_profile` | `ServerProfile` | Server configuration |

### `receive_submit`

```python
async def receive_submit(
    self,
    timeout: float | None = None,
) -> ReceivedSubmit:
    """
    Wait for and receive the next FRAME_SUBMIT packet.

    Raises:
        ValueError: Non-FRAME_SUBMIT message received, session_id mismatch,
                    or unsupported wire_format.
        asyncio.TimeoutError: If timeout is not None and expires.
    """
```

### `send_result`

```python
async def send_result(
    self,
    *,
    frame_id: int,
    tile_ids: tuple[int, ...] = (),
    sections: tuple[TensorSectionData, ...] = (),
    typed_payloads: tuple[TypedPayload, ...] = (),
    result_flags: ResultFlags = ResultFlags.NONE,
    active_profile_id: int = 0,
    inference_ms: int = 0,
    queue_ms: int = 0,
    server_total_ms: int = 0,
    status_code: int = 0,
    tile_index_mode: TileIndexMode = TileIndexMode.RAW_U16,
    tile_base_id: int = 0,
    result_class: ResultClass = ResultClass.COMPLETE,
    applied_budget_policy: BudgetPolicy = BudgetPolicy.NONE,
    reused_frame_id: int = 0,
    covered_tile_count: int | None = None,
    dropped_tile_count: int = 0,
    payload_kind_bitmap: PayloadKind = PayloadKind.TENSOR,
    payload_frame_count: int = 0,
    flags: HeaderFlags = HeaderFlags.NONE,
    view_id: int = 0,
    route_id: int = 0,
    trace_id: int = 0,
) -> int:
    """
    Push a frame result to the client.
    Returns total bytes sent.
    covered_tile_count defaults to len(tile_ids) if None.
    """
```

---

## `accept_server_session`

```python
async def accept_server_session(
    listener_or_connection: ServerListener | ServerConnection,
    profile: ServerProfile,
    *,
    model_name: str = "",
    extra_extensions: tuple[ControlExtensionEntry, ...] = (),
    auth_validator: Callable[[bytes], bool] | None = None,
) -> ServerSession:
    """
    Accept a new connection, complete handshake, return ServerSession.
    If auth_validator returns False, sends ERROR and closes connection.
    """
```

---

## Example

```python
import asyncio
from nnrp.server import ServerProfile, accept_server_session
from nnrp.adapters import serve_quic

async def handle(session):
    while True:
        received = await session.receive_submit()
        await session.send_result(
            frame_id=received.metadata.frame_id,
            sections=run_inference(received.request),
            result_class=ResultClass.COMPLETE,
        )

async def main():
    profile = ServerProfile(max_concurrent_frames=4)
    async with serve_quic("0.0.0.0", 4433, config=server_config) as listener:
        while True:
            session = await accept_server_session(listener, profile)
            asyncio.create_task(handle(session))

asyncio.run(main())
```
