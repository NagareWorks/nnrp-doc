# Python — Client

Client API is defined in the `nnrp.client` package.

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
