# Python — Message Types

Message metadata classes and builder functions are in `nnrp.core.messages.control` and `nnrp.core.messages.data`, re-exported through `nnrp.core`.

## Import

```python
from nnrp.core import (
    ClientHelloMetadata, ServerHelloAckMetadata,
    SessionPatchMetadata, SessionPatchAckMetadata,
    FlowUpdateMetadata, ResultHintMetadata,
    TransportProbeMetadata, TransportProbeAckMetadata,
    SessionMigrateMetadata, SessionMigrateAckMetadata,
    CachePutMetadata, CacheAckMetadata, CacheInvalidateMetadata,
    ErrorMetadata, ControlExtensionEntry,
    ClientHelloTransportPolicyExtension, ServerHelloAckTransportPolicyExtension,
    ClientHelloLossToleranceExtension, ServerHelloAckLossToleranceExtension,
    ClientHelloPayloadCapabilitiesExtension, ServerHelloAckPayloadCapabilitiesExtension,
    FrameSubmitMetadata, ResultPushMetadata,
    build_frame_submit_packet, build_result_push_packet,
    build_result_drop_packet, build_frame_cancel_packet,
    build_ping_packet, build_pong_packet,
    build_flow_update_packet, build_result_hint_packet,
    unpack_tensor_body, unpack_tile_index_block,
    unpack_control_extension_block,
)
```

---

## Control Message Metadata

All control message metadata classes implement `.pack() -> bytes` and `@classmethod .unpack(data: bytes) -> Self`.

### `ClientHelloMetadata`

| Field | Type | Description |
|---|---|---|
| `session_id` | `int` | Client-assigned session ID |
| `max_views` | `int` | Max concurrent views |
| `enable_cache` | `bool` | Enable server-side cache |
| `payload_kind_mask` | `PayloadKind` | Supported payload type mask |

### `ServerHelloAckMetadata`

| Field | Type | Description |
|---|---|---|
| `session_id` | `int` | Server-confirmed session ID |
| `transport_id` | `TransportId` | Selected transport |
| `enable_cache` | `bool` | Cache enabled by server |
| `max_cache_entries` | `int` | Max cache entries |
| `max_cache_bytes` | `int` | Max cache bytes |
| `payload_kind_mask` | `PayloadKind` | Server supported payload types |

### `SessionPatchMetadata`

| Field | Type | Description |
|---|---|---|
| `patch_fields` | `SessionPatchField` | Fields to update (bitmask) |
| `target_cadence` | `int` | Target frame rate |
| `quality_tier` | `int` | Quality tier |
| `active_lane_mask` | `int` | Active view mask |
| `preferred_codec` | `int` | Preferred codec ID |
| `preferred_compression` | `int` | Preferred compression level |

### `SessionPatchAckMetadata`

| Field | Type | Description |
|---|---|---|
| `patch_fields` | `SessionPatchField` | Successfully applied fields |
| `status` | `SessionPatchAckStatus` | Application status |
| `reject_reason` | `SessionPatchRejectReason` | Reject reason (only valid on rejection) |

### `ErrorMetadata`

| Field | Type | Description |
|---|---|---|
| `error_code` | `ErrorCode` | Error code |
| `error_scope` | `ErrorScope` | Error scope |
| `session_id` | `int` | Related session ID |
| `frame_id` | `int` | Related frame ID |

### `FlowUpdateMetadata`

| Field | Type | Description |
|---|---|---|
| `scope_kind` | `FlowUpdateScopeKind` | Update scope |
| `update_reason` | `FlowUpdateReason` | Update reason |
| `backpressure_level` | `FlowUpdateBackpressureLevel` | Backpressure level |
| `connection_credit` | `int` | Connection-level credit delta |
| `session_credit` | `int` | Session-level credit delta |
| `operation_credit` | `int` | Operation-level credit delta |
| `operation_id` | `int` | Target operation ID |
| `retry_after_ms` | `int` | Suggested retry delay (ms) |
| `credit_epoch` | `int` | Credit epoch (anti-reorder) |
| `flags` | `FlowUpdateFlags` | Flags |

### `ResultHintMetadata`

| Field | Type | Description |
|---|---|---|
| `budget_policy` | `ResultHintBudgetPolicy` | Suggested budget policy |
| `congestion_state` | `ResultHintCongestionState` | Current congestion state |
| `reason` | `ResultHintReason` | Hint reason |
| `frame_id` | `int` | Related frame ID |
| `queue_depth` | `int` | Current queue depth |
| `estimated_wait_ms` | `int` | Estimated wait time (ms) |

---

## Data Message Metadata

### `FrameSubmitMetadata`

| Field | Type | Description |
|---|---|---|
| `input_profile` | `InputProfile` | Input data format |
| `submit_mode` | `SubmitMode` | Submission mode |
| `budget_policy` | `BudgetPolicy` | Allowed degradation policy |
| `payload_kind_bitmap` | `PayloadKind` | Payload type bitmask |
| `tile_count` | `int` | Total tile count |
| `section_count` | `int` | Tensor section count |
| `inference_budget_ms` | `int` | Max inference budget (ms) |
| `deadline_ms` | `int` | Absolute deadline (ms) |

### `ResultPushMetadata`

| Field | Type | Description |
|---|---|---|
| `result_class` | `ResultClass` | Result completeness class |
| `result_flags` | `ResultFlags` | Result flags |
| `applied_budget_policy` | `BudgetPolicy` | Actual applied degradation policy |
| `active_profile_id` | `int` | Inference profile ID used |
| `inference_ms` | `int` | Inference time (ms) |
| `queue_ms` | `int` | Queue wait time (ms) |
| `server_total_ms` | `int` | Total server time (ms) |
| `status_code` | `int` | Status code |
| `tile_index_mode` | `TileIndexMode` | Tile index encoding |
| `covered_tile_count` | `int` | Covered tile count |
| `dropped_tile_count` | `int` | Dropped tile count |
| `reused_frame_id` | `int` | Reused frame ID (for `STALE_REUSE`) |
| `payload_kind_bitmap` | `PayloadKind` | Actual payload types present |
| `payload_frame_count` | `int` | Non-tensor payload frame count |

---

## Control Extension Types

```python
@dataclass(frozen=True, slots=True)
class ControlExtensionEntry:
    type_id: int
    flags: ControlExtensionFlags
    payload: bytes
```

| Class | Direction | Description |
|---|---|---|
| `ClientHelloTransportPolicyExtension` | C→S | Client declares transport policy preference |
| `ServerHelloAckTransportPolicyExtension` | S→C | Server confirms transport policy |
| `ClientHelloLossToleranceExtension` | C→S | Client declares loss tolerance |
| `ServerHelloAckLossToleranceExtension` | S→C | Server confirms loss tolerance |
| `ClientHelloPayloadCapabilitiesExtension` | C→S | Client declares supported payload types |
| `ServerHelloAckPayloadCapabilitiesExtension` | S→C | Server confirms payload capabilities |

---

## Packet Builder Functions

```python
def build_frame_submit_packet(session_id: int, frame_id: int, *, ...) -> NnrpPacket: ...
def build_result_push_packet(session_id: int, frame_id: int, *, ...) -> NnrpPacket: ...
def build_result_push_mixed_packet(...) -> NnrpPacket: ...
def build_result_push_typed_payload_packet(...) -> NnrpPacket: ...
def build_result_drop_packet(session_id: int, frame_id: int, *, ...) -> NnrpPacket: ...
def build_frame_cancel_packet(session_id: int, frame_id: int, *, ...) -> NnrpPacket: ...
def build_ping_packet(session_id: int, *, frame_id: int = 0, ...) -> NnrpPacket: ...
def build_pong_packet(session_id: int, *, frame_id: int = 0, ...) -> NnrpPacket: ...
def build_flow_update_packet(session_id: int, *, metadata: FlowUpdateMetadata, ...) -> NnrpPacket: ...
def build_result_hint_packet(session_id: int, *, metadata: ResultHintMetadata, ...) -> NnrpPacket: ...
```

---

## Unpack Utility Functions

```python
def unpack_tensor_body(body: bytes, section_count: int) -> TensorBodyView: ...
def unpack_tile_index_block(body: bytes, mode: TileIndexMode) -> tuple[int, ...]: ...
def unpack_control_extension_block(payload: bytes) -> tuple[ControlExtensionEntry, ...]: ...
def unpack_inline_object_blocks(body: bytes) -> ...: ...
def unpack_object_reference_blocks(body: bytes) -> tuple[ObjectReferenceBlock, ...]: ...
def unpack_typed_payload_frames(body: bytes) -> ...: ...
def unpack_body(packet: NnrpPacket) -> ...: ...
def validate_frame_submit_body(packet: NnrpPacket, metadata: FrameSubmitMetadata) -> None: ...
```
