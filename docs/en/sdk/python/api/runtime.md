# Runtime Control & Objects

Python Preview 4 APIs expose the same runtime-control and object-reference wire model as the Rust
core. SDK implementations must keep these names and field spellings stable for NNRP/1.

Use this page when you need cancellation, priority changes, progress streaming, partial results,
runtime object references, cache references, or WebSocket binary frame helpers.

## Import

```python
from nnrp import MessageType
from nnrp.runtime import (
    decode_runtime_control_metadata,
    decode_runtime_object_metadata,
    decode_websocket_binary_frame,
    decode_websocket_binary_frame_batch,
    encode_runtime_control_metadata,
    encode_runtime_object_metadata,
    encode_websocket_binary_frame,
)
from nnrp.runtime.types import (
    ProgressMetadata,
    RuntimeFrameHeader,
)
```

## `encode_runtime_control_metadata`

Encodes one Preview 4 control metadata object.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `message_type` | [`MessageType`](./enums.md#messagetypeintenum) | Yes | One of `CANCEL`, `ABORT`, `PRIORITY_UPDATE`, `DEADLINE`, `EXPIRE_AT`, `SUPERSEDE`, `BUDGET_UPDATE`, `PROGRESS`, `PARTIAL_RESULT`, `BACKPRESSURE`, `CREDIT_UPDATE`, `CAPABILITY_NEGOTIATION`, `DEGRADE_PROFILE`, `ROUTE_HINT`, `EXECUTION_HINT`, `TRACE_CONTEXT`, `RESULT_DROP_REASON`, `ERROR_RECOVERABLE`, or `RETRY_AFTER`. |
| `metadata` | [Runtime control metadata](#runtime-control-metadata) | Yes | Metadata object matching `message_type`. |
| `tail` | `bytes` | No | Extension bytes, diagnostic bytes, progress body, or partial-result body required by `metadata`. |

| Returns |
|---|
| `bytes` |

```python
payload = encode_runtime_control_metadata(
    MessageType.PROGRESS,
    ProgressMetadata(operation_id=42, progress_sequence=1, stage_code=2, percent_x100=2500, object_id=0, body_bytes=0),
)
```

## `decode_runtime_control_metadata`

Decodes one Preview 4 control metadata payload.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `message_type` | [`MessageType`](./enums.md#messagetypeintenum) | Yes | Message type that selected the metadata layout. |
| `payload` | `bytes` | Yes | Metadata bytes plus the declared tail. |

| Returns |
|---|
| `DecodedRuntimeControlMetadata` with `metadata` and `tail` |

## `encode_runtime_object_metadata`

Encodes object, object-reference, object-delta, cache-reference, and cache-miss metadata.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `message_type` | [`MessageType`](./enums.md#messagetypeintenum) | Yes | One of `OBJECT_DECLARE`, `OBJECT_REF`, `OBJECT_RELEASE`, `OBJECT_PATCH`, `OBJECT_DELTA`, `CACHE_REFERENCE`, or `CACHE_MISS`. |
| `metadata` | [Runtime object metadata](#runtime-object-metadata) | Yes | Metadata object matching `message_type`. |
| `tail` | `bytes` | No | Extension bytes, diagnostics, or delta payload declared by `metadata`. |

| Returns |
|---|
| `bytes` |

## `decode_runtime_object_metadata`

Decodes one runtime object or cache metadata payload.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `message_type` | [`MessageType`](./enums.md#messagetypeintenum) | Yes | Message type that selected the metadata layout. |
| `payload` | `bytes` | Yes | Metadata bytes plus the declared tail. |

| Returns |
|---|
| `DecodedRuntimeObjectMetadata` with `metadata` and `tail` |

## High-Level Runtime Frame Contract

The codec functions above are advanced protocol helpers. Normal applications send Preview4 frames
through the named methods on `NativeRuntimeSession` or `NativeRuntimeServerSession`; they do not
encode payloads, select message types, or call `control()` themselves.

The SDK validates each metadata/message pairing, encodes the complete payload, and performs one
coarse native call behind those named methods. That role-neutral frame-send primitive is an internal
binding boundary and is not part of the public session API. Protocol extensions add a typed metadata
model and a named SDK method instead of exposing raw frame construction to applications.

## `NativeRuntimeFrameEvent`

Runtime-frame polling returns a decoded `NativeRuntimeFrameEvent`, not a raw control code and byte
buffer. Its frozen fields are `type`, `message_type`, `metadata`, `body`, `diagnostic`,
`metadata_body`, `delta`, `connection`, `session`, `operation`, `frame_id`, and
`native_diagnostic`. Fields that do not apply to a message contain `b""`.

`type` uses the kebab-case names from the JavaScript runtime event table. `metadata` is the matching
typed metadata object. Object patch and delta events split their tail into `metadata_body` and
`delta`; all other declared tails are exposed as `body` or `diagnostic`. Bindings copy and release
the native owned payload before returning the event.

`NativeRuntimeEvent.to_runtime_frame()` returns a `NativeRuntimeFrameEvent` for Preview4 runtime
frames and `None` for submit/result/lifecycle events. `NativeRuntimeConnection.poll_runtime_frames()`
and `iter_runtime_frames()` skip non-runtime events and return the decoded type directly.

## `encode_websocket_binary_frame`

Builds the binary frame used by the WebSocket transport.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `header` | [`RuntimeFrameHeader`](#runtimeframeheader) | Yes | Header fields except `meta_len` and `body_len`; the helper derives both lengths from the buffers. |
| `metadata` | `bytes` | No | Metadata payload. |
| `body` | `bytes` | No | Body payload. |

| Returns |
|---|
| `bytes` |

## `decode_websocket_binary_frame`

Splits one WebSocket binary frame into header, metadata slice, and body slice.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `frame` | `bytes` | Yes | One complete WebSocket binary message. |

| Returns |
|---|
| `DecodedRuntimeFrame` |

## `decode_websocket_binary_frame_batch`

Decodes concatenated binary frames from local buffers and conformance fixtures.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `batch` | `bytes` | Yes | Concatenated frames. |
| `limit` | `int` | No | Maximum decoded frames; `0` means no limit. |

| Returns |
|---|
| `list[DecodedRuntimeFrame]` |

## Runtime Control Metadata

All integer fields are unsigned unless the field name says otherwise.

### `ControlRequestMetadata`

| Field | Type | Description |
|---|---|---|
| `operation_id` | `int` | Operation affected by `CANCEL` or `ABORT`. |
| `control_sequence` | `int` | Monotonic control sequence in the operation scope. |
| `reason_code` | `int` | Application reason code. |
| `source_role` | [`RuntimeRole`](#runtimerole) | Sender role. |
| `flags` | `int` | Bit flags. |
| `diagnostic_bytes` | `int` | Declared diagnostic tail length. |

### `SchedulingMetadata`

| Field | Type | Description |
|---|---|---|
| `operation_id` | `int` | Operation to reschedule. |
| `control_sequence` | `int` | Monotonic control sequence. |
| `priority_class` | `int` | Absolute priority class. |
| `priority_delta` | `int` | Signed priority delta. |
| `deadline_unix_ms` | `int` | Unix deadline in milliseconds. |
| `flags` | `int` | Bit flags. |

### Control Metadata Field Map

| Type | Message types | Frozen fields |
|---|---|---|
| `SupersedeMetadata` | `SUPERSEDE` | `old_operation_id`, `new_operation_id`, `control_sequence`, `drop_reason_code`, `flags`, `diagnostic_bytes` |
| `BudgetMetadata` | `BUDGET_UPDATE` | `operation_id`, `compute_budget_units`, `memory_budget_bytes`, `bandwidth_budget_bytes`, `token_budget`, `flags` |
| `ProgressMetadata` | `PROGRESS` | `operation_id`, `progress_sequence`, `stage_code`, `percent_x100`, `object_id`, `body_bytes` |
| `PartialResultMetadata` | `PARTIAL_RESULT` | `operation_id`, `result_sequence`, `object_id`, `delta_sequence`, `body_bytes`, `flags` |
| `PressureMetadata` | `BACKPRESSURE`, `CREDIT_UPDATE` | `scope_id`, `credit_window`, `pressure_level`, `pressure_reason`, `retry_after_ms`, `flags` |
| `CapabilityMetadata` | `CAPABILITY_NEGOTIATION`, `DEGRADE_PROFILE` | `profile_id`, `capability_count`, `cost_model_id`, `preference_rank`, `limit_bytes`, `limit_units`, `body_bytes`, `flags` |
| `RouteHintMetadata` | `ROUTE_HINT`, `EXECUTION_HINT` | `operation_id`, `route_id`, `executor_class`, `affinity_class`, `deadline_unix_ms`, `body_bytes`, `flags` |
| `TraceContextMetadata` | `TRACE_CONTEXT` | `trace_id`, `span_id`, `parent_span_id`, `stage_code`, `flags`, `body_bytes` |
| `ResultDropReasonMetadata` | `RESULT_DROP_REASON` | `operation_id`, `result_sequence`, `drop_reason_code`, `source_role`, `flags`, `diagnostic_bytes` |
| `RecoverableErrorMetadata` | `ERROR_RECOVERABLE` | `error_code`, `error_scope`, `recovery_action`, `source_role`, `flags`, `retry_after_ms`, `related_session_id`, `related_frame_id`, `related_view_id`, `diagnostic_bytes` |
| `RetryAfterMetadata` | `RETRY_AFTER` | `scope_id`, `control_sequence`, `retry_after_ms`, `jitter_ms`, `reason_code`, `source_role`, `flags`, `diagnostic_bytes` |

## Runtime Object Metadata

| Type | Message types | Frozen fields |
|---|---|---|
| `ObjectDescriptorMetadata` | `OBJECT_DECLARE` | `object_id`, `object_kind`, `producer_role`, `consumer_role`, `session_id`, `byte_size`, `compute_cost_units`, `memory_location_hint`, `ownership_hint`, `lifetime_hint_ms`, `metadata_bytes` |
| `ObjectReferenceMetadata` | `OBJECT_REF` | `object_id`, `operation_id`, `object_version`, `offset`, `length`, `flags`, `metadata_bytes` |
| `ObjectReleaseMetadata` | `OBJECT_RELEASE` | `object_id`, `operation_id`, `release_reason`, `source_role`, `flags`, `diagnostic_bytes` |
| `ObjectDeltaMetadata` | `OBJECT_PATCH`, `OBJECT_DELTA` | `object_id`, `delta_sequence`, `region_offset`, `region_bytes`, `delta_bytes`, `flags`, `metadata_bytes` |
| `CacheReferenceMetadata` | `CACHE_REFERENCE` | `cache_key_hi`, `cache_key_lo`, `profile_id`, `reuse_scope`, `lease_id`, `producer_trace_id`, `expiration_hint_ms`, `metadata_bytes`, `flags` |
| `CacheMissMetadata` | `CACHE_MISS` | `cache_key_hi`, `cache_key_lo`, `miss_reason`, `profile_id`, `diagnostic_bytes` |

## Runtime Enums

### `RuntimeObjectKind`

`UNSPECIFIED`, `TENSOR`, `TOKEN_BLOCK`, `IMAGE_TILE`, `FEATURE_MAP`, `TOOL_RESULT`, `TRACE_SEGMENT`, `OPAQUE_BYTES`, `DOCUMENT_CHUNK`, `AUDIO_CHUNK`, `VIDEO_CHUNK`, `ROUTE_PLAN`, `CACHE_MANIFEST`.

### `RuntimeRole`

`UNSPECIFIED`, `CLIENT`, `SERVER`, `RUNTIME`, `SUBAGENT`, `TOOL`, `SCHEDULER`, `CONFORMANCE_RUNNER`.

### Object and cache enums

| Enum | Members |
|---|---|
| `MemoryLocationHint` | `UNSPECIFIED`, `HOST_MEMORY`, `DEVICE_MEMORY`, `SHARED_MEMORY`, `REMOTE_MEMORY`, `MMAP_FILE`, `OBJECT_STORE` |
| `OwnershipHint` | `UNSPECIFIED`, `PRODUCER_OWNED`, `CONSUMER_OWNED`, `SESSION_OWNED`, `BORROWED`, `TRANSFER_ON_REF`, `RELEASE_ON_DROP` |
| `ObjectReleaseReason` | `COMPLETED`, `CANCELLED`, `EXPIRED`, `REPLACED`, `INVALIDATED`, `OWNER_CLOSED`, `LEASE_EXPIRED`, `CONFORMANCE_INJECTION` |
| `CacheReuseScope` | `OPERATION`, `SESSION`, `CONNECTION`, `GLOBAL`, `TENANT`, `PROFILE` |
| `CacheMissReason` | `UNKNOWN`, `NOT_FOUND`, `EXPIRED`, `INVALIDATED`, `SCHEMA_MISMATCH`, `PRODUCER_UNAVAILABLE`, `LEASE_REQUIRED`, `PERMISSION_DENIED` |

## `RuntimeFrameHeader`

| Field | Type | Description |
|---|---|---|
| `message_type` | [`MessageType`](./enums.md#messagetypeintenum) | Frame message type. |
| `flags` | [`HeaderFlags`](./enums.md#headerflagsintflag) | Header flags. |
| `session_id` | `int` | Session id. |
| `generation` | `int` | Session generation. |
| `frame_id` | `int` | Frame id. |
