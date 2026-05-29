# Python — Client

Client API is defined in the `nnrp.client` package.

For host-runtime integrations, prefer the high-level client/session API and the native runtime facades exported from `nnrp.native`. The low-level packet builders shown on this page remain public because they are useful for tests, diagnostics, and custom transport experiments.

## Import

```python
from nnrp.client import (
    ClientProfile, ClientDialPolicy, resolve_client_hello_transport_policy,
    ClientSession, ClientControlBootstrapSession,
    ClientTransportBootstrap, ClientTransportPlan,
    MigrationOutcome, MigrationTriggerMonitor,
    MigrationTriggerPolicy, MigrationTriggerSnapshot,
    PathHealthSample, Result, ResultRouter,
    SubmitRequest, TypedPayload,
    TransportProbeResult, TransportProbeSummary, TransportProbeSelection,
    bootstrap_client_transport, build_client_hello_packet,
    connect_client_control, connect_client_control_with_probe,
    connect_client_session, connect_client_session_with_probe,
    probe_client_transport, plan_client_transport,
)
```

---

## Configuration Types

### `ClientProfile`

Global client configuration (`@dataclass`, mutable).

| Field | Type | Default | Description |
|---|---|---|---|
| `max_views` | `int` | `1` | Max concurrent views |
| `enable_cache` | `bool` | `True` | Enable server-side cache negotiation |
| `max_cache_entries` | `int` | `256` | Max cache entries |
| `max_cache_bytes` | `int` | `8388608` | Max cache bytes (8 MB) |

### `ClientDialPolicy`

Transport policy at connection time (`@dataclass(frozen=True)`).

| Field | Type | Description |
|---|---|---|
| `selected_transport_id` | `TransportId` | Currently selected transport |
| `forced_transport_id` | `TransportId` | Forced transport (`UNSPECIFIED` = no force) |

```python
def to_client_hello_transport_policy(self) -> ClientHelloTransportPolicyExtension | None: ...
```

---

## Session Types

### `ClientSession`

Established client session for frame submission and result receive loops.

```python
async def submit(self, request: SubmitRequest, *, timeout: float | None = None) -> Result: ...
async def submit_nowait(self, request: SubmitRequest) -> None: ...
async def receive_result(self, *, timeout: float | None = None) -> Result: ...
async def patch_session(self, patch_fields: SessionPatchField, *, ...) -> SessionPatchAckMetadata: ...
async def close(self) -> None: ...
```

**Method Parameter Reference**

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `submit` | `request`: [`SubmitRequest`](#submitrequest); `timeout`: seconds (`None` = no timeout) | `Result` | Submit a frame and block until the result arrives; raises `asyncio.TimeoutError` on timeout |
| `submit_nowait` | `request`: [`SubmitRequest`](#submitrequest) | `None` | Non-blocking submit; results must be retrieved via `receive_result` |
| `receive_result` | `timeout`: seconds (`None` = no timeout) | `Result` | Await and return the next server-pushed result; pair with `ResultRouter` when submitting multiple in-flight frames |
| `patch_session` | `patch_fields`: [`SessionPatchField`](/en/sdk/python/api/enums#session-patch) bitmask (specifies which fields to update); `target_cadence`: target FPS (0 = unchanged); `quality_tier`: 0–255; `active_lane_mask`: active lane bitmask; `preferred_codec`; `preferred_compression` | `SessionPatchAckMetadata` | Dynamically adjust session parameters at runtime. **Only fields whose bit is set in `patch_fields` are applied** |
| `close` | — | `None` | Send `CLOSE` and shut down the underlying connection; call in a `finally` block |

> **`SubmitRequest` key fields**: `frame_id` (required, monotonically increasing or unique), `tile_ids` (changed tile ID tuple), `sections` ([`TensorSectionData`](/en/sdk/python/api/packet#tensorsectiondata) tuple), `input_profile` ([`InputProfile`](/en/sdk/python/api/enums#inputprofileintenum)), `submit_mode` (`INLINE` / `REFERENCE`), `budget_policy` ([`BudgetPolicy`](/en/sdk/python/api/enums#budgetpolicy-intflag) bitmask), `inference_budget_ms` (0 = unlimited).

### `ClientControlBootstrapSession`

Bootstrap session for completing `CLIENT_HELLO` / `SERVER_HELLO_ACK` exchange.

```python
async def bootstrap(
    self,
    profile: ClientProfile,
    dial_policy: ClientDialPolicy,
    *,
    auth_block: bytes = b"",
) -> "ServerHelloAckMetadata": ...
```

---

## Data Types

### `SubmitRequest`

Frame submit request (`@dataclass(frozen=True)`).

| Field | Type | Description |
|---|---|---|
| `frame_id` | `int` | Frame ID |
| `tile_ids` | `tuple[int, ...]` | Tile IDs to submit |
| `sections` | `tuple[TensorSectionData, ...]` | Tensor section data |
| `typed_payloads` | `tuple[TypedPayload, ...]` | Non-tensor payloads |
| `input_profile` | `InputProfile` | Input data format |
| `submit_mode` | `SubmitMode` | Submission mode |
| `budget_policy` | `BudgetPolicy` | Allowed degradation policy |
| `inference_budget_ms` | `int` | Inference budget (ms) |
| `deadline_ms` | `int` | Absolute deadline |

### `TypedPayload`

Non-tensor payload (token stream, audio, video, etc.).

| Field | Type | Description |
|---|---|---|
| `payload_kind` | `PayloadKind` | Payload type |
| `data` | `bytes` | Raw payload bytes |

### `Result`

Server-pushed inference result.

| Field | Type | Description |
|---|---|---|
| `packet` | `NnrpPacket` | Raw packet |
| `metadata` | `ResultPushMetadata` | Parsed result metadata |
| `sections` | `tuple[TensorSectionData, ...]` | Tensor sections |
| `typed_payloads` | `tuple[TypedPayload, ...]` | Non-tensor payload frames |

---

## Migration Types

### `MigrationOutcome`

| Value | Description |
|---|---|
| `SUCCESS` | Migration completed successfully |
| `FAILED` | Migration failed, session disconnected |
| `SKIPPED` | Migration conditions not met, skipped |

### `MigrationTriggerPolicy`

| Field | Type | Description |
|---|---|---|
| `min_rtt_improvement_ms` | `float` | Min RTT improvement required to trigger migration |
| `probe_interval_s` | `float` | Path probe interval (seconds) |
| `max_consecutive_failures` | `int` | Max consecutive failures before triggering migration |

---

## Connection Functions

### `connect_client_session`

```python
async def connect_client_session(
    connection: NnrpQuicConnection | NnrpTcpConnection,
    profile: ClientProfile,
    dial_policy: ClientDialPolicy,
    *,
    auth_block: bytes = b"",
) -> ClientSession: ...
```

### `connect_client_session_with_probe`

```python
async def connect_client_session_with_probe(
    connection: NnrpQuicConnection | NnrpTcpConnection,
    profile: ClientProfile,
    *,
    auth_block: bytes = b"",
) -> ClientSession: ...
```

### `connect_client_control`

```python
async def connect_client_control(
    connection: NnrpQuicConnection | NnrpTcpConnection,
) -> ClientControlBootstrapSession: ...
```

### `bootstrap_client_transport`

```python
async def bootstrap_client_transport(
    host: str,
    port: int,
    *,
    profile: ClientProfile,
    dial_policy: ClientDialPolicy,
    quic_config: QuicConfiguration | None = None,
    tcp_config: NnrpTcpClientConfiguration | None = None,
) -> ClientTransportBootstrap: ...
```

### `plan_client_transport`

```python
async def plan_client_transport(
    host: str,
    port: int,
    *,
    quic_config: QuicConfiguration | None = None,
    tcp_config: NnrpTcpClientConfiguration | None = None,
) -> ClientTransportPlan: ...
```

### `probe_client_transport`

```python
async def probe_client_transport(
    host: str,
    port: int,
    transport_id: TransportId,
    *,
    config: QuicConfiguration | NnrpTcpClientConfiguration | None = None,
) -> TransportProbeSummary: ...
```

### `build_client_hello_packet`

```python
def build_client_hello_packet(
    session_id: int,
    profile: ClientProfile,
    dial_policy: ClientDialPolicy,
    *,
    auth_block: bytes = b"",
    extra_extensions: tuple[ControlExtensionEntry, ...] = (),
) -> NnrpPacket: ...
```

---

## Typical Use Cases

### Case 1: Connect, Submit, Receive

```python
import asyncio
from nnrp.client import ClientProfile, dial_client, SubmitRequest
from nnrp import TransportPolicy, InputProfile, SubmitMode, BudgetPolicy, ResultClass
from nnrp.adapters.quic import create_quic_client_configuration

async def render_loop(host: str, port: int):
    config = create_quic_client_configuration(cafile="ca.pem")
    profile = ClientProfile(transport_policy=TransportPolicy.PREFER_QUIC)
    async with await dial_client(host, port, profile=profile, config=config) as session:
        frame_id = 0
        while True:
            tiles, tensor = capture_changed_tiles()
            request = SubmitRequest(
                frame_id=frame_id,
                tile_ids=tiles,
                sections=(tensor,),
                input_profile=InputProfile.CHANGED_TILES_LUMA,
                submit_mode=SubmitMode.INLINE,
                budget_policy=BudgetPolicy.ALLOW_PARTIAL,
                inference_budget_ms=8,
            )
            await session.submit_frame(request)
            result = await session.receive_result(frame_id=frame_id, timeout=0.05)
            if result.metadata.result_class == ResultClass.COMPLETE:
                display(result.sections)
            frame_id += 1
```

### Case 2: Responding to Backpressure

```python
from nnrp import ResultHintCongestionState

async def run_with_backpressure(session):
    paused = False

    async def monitor_hints():
        nonlocal paused
        async for hint in session.result_hints():
            paused = (hint.congestion_state == ResultHintCongestionState.SATURATED)

    asyncio.create_task(monitor_hints())
    frame_id = 0
    while True:
        if paused:
            await asyncio.sleep(0.016)
            continue
        await session.submit_frame(make_request(frame_id))
        frame_id += 1
```

---

## Common Pitfalls

::: warning
1. **Always close `ClientSession`** — use `async with` or `finally: await session.close()`. An unclosed session leaves the server-side resource alive until timeout.

2. **Do not `submit_frame` concurrently from multiple coroutines.** The send path is not concurrent-safe. Use a single sender coroutine and `ResultRouter` for fan-out of results.

3. **After `receive_result` times out, the frame ID slot is still held.** Call `session.discard_frame(frame_id)` to release it, or `ResultRouter` memory will grow unbounded.

4. **`SubmitRequest.deadline_ms` is an absolute Unix timestamp in milliseconds**, not a relative offset from now. Confusing it with `inference_budget_ms` (relative, in ms) is a common mistake.

5. **`TransportPolicy.FORCE_QUIC` hard-fails in TCP-only networks.** Use `PREFER_QUIC` in production so the SDK can fall back to TCP.
:::
