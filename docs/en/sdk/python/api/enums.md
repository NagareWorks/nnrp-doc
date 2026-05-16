# Python — Enums & Constants

Enums are spread across `nnrp.core.enums` and `nnrp.core.messages` submodules, unified re-exported through the top-level `nnrp` namespace.

## Import

```python
from nnrp import (
    MessageType, HeaderFlags, FrameClass, ErrorCode,
    TransportId, TransportPolicy, LossTolerance, PayloadKind,
    FlowUpdateScopeKind, FlowUpdateReason, FlowUpdateBackpressureLevel, FlowUpdateFlags,
    ResultHintBudgetPolicy, ResultHintCongestionState, ResultHintReason,
)
```

---

## Wire Format

### `WireFormat(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `CURRENT` | `0` | Only supported wire format (NNRP/1) |

---

## Message Types

### `MessageType(IntEnum)`

| Member | Value | Direction | Description |
|---|---|---|---|
| `CLIENT_HELLO` | `0x01` | C→S | Connection setup, carries client capability set |
| `SERVER_HELLO_ACK` | `0x02` | S→C | Handshake acknowledgement |
| `SESSION_PATCH` | `0x03` | C→S | Session parameter update request |
| `SESSION_PATCH_ACK` | `0x04` | S→C | Session parameter update result |
| `CLOSE` | `0x05` | Both | Graceful close |
| `ERROR` | `0x06` | Both | Protocol error notification |
| `FRAME_SUBMIT` | `0x10` | C→S | Submit a frame |
| `FRAME_CANCEL` | `0x11` | C→S | Cancel a frame |
| `RESULT_PUSH` | `0x12` | S→C | Push inference result |
| `RESULT_DROP` | `0x13` | S→C | Notify result dropped |
| `CACHE_PUT` | `0x14` | C→S | Store a cache object |
| `CACHE_ACK` | `0x15` | S→C | Cache store result |
| `CACHE_INVALIDATE` | `0x16` | C→S | Invalidate cache |
| `FLOW_UPDATE` | `0x17` | Both | Flow control window update |
| `RESULT_HINT` | `0x18` | S→C | Server hint (backpressure/queue state) |
| `TRANSPORT_PROBE` | `0x19` | Both | Transport path probe |
| `TRANSPORT_PROBE_ACK` | `0x1A` | Both | Path probe acknowledgement |
| `SESSION_MIGRATE` | `0x1B` | S→C | Session migration notification |
| `SESSION_MIGRATE_ACK` | `0x1C` | C→S | Session migration confirmation |
| `PING` | `0x20` | Both | Keep-alive probe |
| `PONG` | `0x21` | Both | Keep-alive response |

---

## Header Flags

### `HeaderFlags(IntFlag)`

| Member | Mask | Description |
|---|---|---|
| `NONE` | `0x00` | No flags |
| `ACK_REQUIRED` | `0x01` | Receiver must acknowledge |
| `CAN_DROP` | `0x02` | May be dropped under backpressure |
| `STALE` | `0x04` | Data is stale |
| `EOS` | `0x08` | End of stream |
| `RETRANSMIT` | `0x10` | Retransmitted packet |
| `KEYFRAME` | `0x20` | Keyframe |

---

## Frame Classification

### `FrameClass(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `KEYFRAME` | `0` | Complete keyframe |
| `DELTA` | `1` | Delta frame, depends on previous keyframe |
| `RETRANSMIT` | `2` | Retransmit frame |
| `DISCARDABLE` | `3` | May be skipped under high server load |

---

## Error Codes

### `ErrorCode(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `UNSUPPORTED_VERSION` | `0x0001` | Unsupported protocol version |
| `AUTH_FAILED` | `0x0002` | Authentication failed |
| `INVALID_STATE` | `0x0003` | Operation not allowed in current state |
| `MALFORMED_HEADER` | `0x0004` | Malformed header |
| `MALFORMED_BODY` | `0x0005` | Malformed body |
| `UNSUPPORTED_CAPABILITY` | `0x0006` | Unsupported capability |
| `LIMIT_EXCEEDED` | `0x0007` | Limit exceeded |
| `FRAME_EXPIRED` | `0x0008` | Frame expired (over latency budget) |
| `FRAME_CANCELLED` | `0x0009` | Frame cancelled by client |
| `CACHE_MISS` | `0x000A` | Cache object not found |
| `SERVER_BUSY` | `0x000B` | Server temporarily unable to process |
| `INTERNAL_ERROR` | `0x000C` | Server internal error |

---

## Error Scope

### `ErrorScope(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `CONNECTION` | `0` | Connection-level (fatal, requires reconnect) |
| `SESSION` | `1` | Session-level |
| `FRAME` | `2` | Frame-level (recoverable) |

---

## Transport & Connection

### `TransportId(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `UNSPECIFIED` | `0` | Unspecified, server chooses |
| `QUIC` | `1` | QUIC transport |
| `TCP` | `2` | TCP transport |

### `TransportPolicy(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `AUTO` | `0` | No preference, automatic selection |
| `PREFER_QUIC` | `1` | Prefer QUIC |
| `PREFER_TCP` | `2` | Prefer TCP |
| `FORCE_QUIC` | `3` | Force QUIC |
| `FORCE_TCP` | `4` | Force TCP |

### `LossTolerance(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `STRICT` | `0` | No packet loss allowed |
| `BEST_EFFORT` | `1` | Best effort |
| `LOW_LATENCY` | `2` | Low latency preferred, minor loss tolerated |
| `FIRE_AND_FORGET` | `3` | High loss tolerance |

### `ControlExtensionFlags(IntFlag)`

| Member | Mask | Description |
|---|---|---|
| `NONE` | `0x0000` | No flags |
| `CRITICAL` | `0x0001` | Critical extension; receiver must reject if unrecognized |

---

## Payload Types

### `PayloadKind(IntFlag)`

| Member | Mask | Description |
|---|---|---|
| `NONE` | `0x00` | None |
| `TENSOR` | `0x01` | Tensor payload (neural rendering) |
| `TOKEN_CHUNK` | `0x02` | Token stream chunk (LLM) |
| `AUDIO_CHUNK` | `0x04` | Audio chunk |
| `VIDEO_CHUNK` | `0x08` | Video chunk |
| `STRUCTURED_EVENT` | `0x10` | Structured event |
| `TOOL_DELTA` | `0x20` | Tool call delta |
| `OPAQUE_BYTES` | `0x40` | Opaque binary |

---

## Data-plane Enums

### `InputProfile(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `UNSPECIFIED` | `0` | Unspecified |
| `CHANGED_TILES_LUMA` | `1` | Luma data for changed tiles only |
| `DENSE_LUMA_FRAME` | `2` | Full-frame luma data |

### `TileIndexMode(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `DENSE_RANGE` | `0` | Dense contiguous range |
| `RAW_U16` | `1` | Raw uint16 list |
| `DELTA_U16` | `2` | Delta-encoded uint16 |
| `BITSET` | `3` | Bitset encoding |

### `TensorDType(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `FP16` | `0` | Half-precision float |
| `FP32` | `1` | Single-precision float |
| `FP8_E4M3` | `2` | FP8 E4M3 |
| `FP8_E5M2` | `3` | FP8 E5M2 |
| `INT8` | `4` | Signed 8-bit integer |
| `UINT8` | `5` | Unsigned 8-bit integer |
| `INT16` | `6` | Signed 16-bit integer |
| `UINT16` | `7` | Unsigned 16-bit integer |

### `SubmitMode(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `INLINE` | `0` | All objects inlined in body |
| `REFERENCE` | `1` | Objects referenced via cache keys |
| `MIXED` | `2` | Mix of inline and reference |

### `BudgetPolicy(IntFlag)`

| Member | Mask | Description |
|---|---|---|
| `NONE` | `0x00` | Strict; no degradation allowed |
| `ALLOW_PARTIAL` | `0x01` | Allow partial results |
| `ALLOW_STALE_REUSE` | `0x02` | Allow stale cache reuse |
| `ALLOW_DEGRADED` | `0x04` | Allow degraded quality |
| `ALLOW_DROP` | `0x08` | Allow dropping the frame |

### `ResultClass(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `COMPLETE` | `0` | Complete result |
| `PARTIAL` | `1` | Partial result |
| `STALE_REUSE` | `2` | Reused stale cached result |
| `DEGRADED` | `3` | Quality-degraded result |

### `ResultFlags(IntFlag)`

| Member | Mask | Description |
|---|---|---|
| `NONE` | `0x0000` | No flags |
| `STALE` | `0x0001` | Result from stale/cached data |
| `FALLBACK` | `0x0002` | Degraded fallback path used |
| `PARTIAL` | `0x0004` | Incomplete result |

---

## Cache Enums

### `CacheObjectKind(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `CAMERA_BLOCK` | `0x0001` | Camera parameter block |
| `TILE_INDEX_BLOCK` | `0x0002` | Tile index block (alias: `TILE_INDEX_TEMPLATE`) |
| `TENSOR_SECTION_TABLE` | `0x0003` | Tensor section table |
| `CODEC_TABLE` | `0x0004` | Codec auxiliary table (alias: `CODEC_AUX_BLOCK`) |
| `REUSABLE_RESULT_OBJECT` | `0x0005` | Reusable result (alias: `FALLBACK_RESOURCE`) |
| `PAYLOAD_LAYOUT_TEMPLATE` | `0x0006` | Payload layout template |
| `PROMPT_SEGMENT` | `0x0007` | Prompt segment (LLM) |
| `TOOL_SCHEMA` | `0x0008` | Tool schema |
| `STRUCTURED_EVENT_SCHEMA` | `0x0009` | Structured event schema |

### `CachePutFlags(IntFlag)`

| Member | Mask | Description |
|---|---|---|
| `NONE` | `0x00` | Default |
| `PINNED` | `0x01` | Pinned; exempt from LRU eviction |
| `REUSABLE` | `0x02` | Cross-frame reusable |

---

## Flow Control Enums

### `FlowUpdateScopeKind(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `CONNECTION` | `0` | Connection level |
| `SESSION` | `1` | Session level |
| `OPERATION` | `2` | Operation level |

### `FlowUpdateReason(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `GRANT` | `0` | Grant more credit |
| `REDUCE` | `1` | Reduce credit |
| `PAUSE` | `2` | Pause |
| `RESUME` | `3` | Resume |
| `CONGESTION` | `4` | Congestion notification |

### `FlowUpdateBackpressureLevel(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `NONE` | `0` | No backpressure |
| `SOFT` | `1` | Soft (advisory) |
| `HARD` | `2` | Hard (mandatory) |

### `FlowUpdateFlags(IntFlag)`

| Member | Mask | Description |
|---|---|---|
| `NONE` | `0x00` | None |
| `CREDIT_VALID` | `0x01` | Credit field is valid |
| `RETRY_AFTER_VALID` | `0x02` | `retry_after_ms` is valid |
| `BACKGROUND_ONLY` | `0x04` | Applies only to background operations |
| `DRAIN_IN_FLIGHT_ONLY` | `0x08` | Takes effect after in-flight ops drain |

---

## Result Hint Enums

### `ResultHintBudgetPolicy(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `NONE` | `0` | No suggestion |
| `FULL` | `1` | Use full budget |
| `PARTIAL` | `2` | Accept partial result |
| `STALE_REUSE` | `3` | Accept stale cache reuse |
| `DROP` | `4` | Client should drop the frame |

### `ResultHintCongestionState(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `NONE` | `0` | No congestion |
| `STEADY` | `1` | Steady state |
| `ELEVATED` | `2` | Elevated congestion |
| `SATURATED` | `3` | Severely saturated |

### `ResultHintReason(IntEnum)`

| Member | Value | Description |
|---|---|---|
| `NONE` | `0` | None |
| `QUEUE_FULL` | `1` | Queue is full |
| `SERVER_BUSY` | `2` | Server busy |
| `BUDGET_EXCEEDED` | `3` | Budget exceeded |
| `SUPERSEDED` | `4` | Superseded by later submit |

---

## Extension Type Constants

```python
# Control extension block type IDs (uint16)
CLIENT_HELLO_TRANSPORT_POLICY_EXTENSION     = 0x0101
SERVER_HELLO_ACK_TRANSPORT_POLICY_EXTENSION = 0x0102
CLIENT_HELLO_LOSS_TOLERANCE_EXTENSION       = 0x0103
SERVER_HELLO_ACK_LOSS_TOLERANCE_EXTENSION   = 0x0104
CLIENT_HELLO_PAYLOAD_CAPABILITIES_EXTENSION = 0x0105
SERVER_HELLO_ACK_PAYLOAD_CAPABILITIES_EXTENSION = 0x0106
```
