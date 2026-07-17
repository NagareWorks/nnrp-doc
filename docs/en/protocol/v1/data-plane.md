---
prev:
  text: Session and Operation Model
  link: /en/protocol/v1/operation-model/
next:
  text: Transport Strategy and Probing
  link: /en/protocol/v1/transport-strategy/
---

# Data Plane and Operation Identity

`FRAME_SUBMIT` creates one operation. The operation identity and frame identity are related but
not interchangeable:

- `operation_id: u64` is the stable lifecycle identity used by cancellation, scheduling,
  progress, partial results, route hints, object references, trace correlation, and drop reasons.
- `header.frame_id: u32` is the ordered data-plane work-unit identity used to correlate submit,
  terminal result, replay, and frame-oriented profile data.

An implementation MUST preserve the pair for the complete operation lifetime. It MUST NOT derive
`operation_id` from a local handle, truncate it to `frame_id`, or silently set the two values equal.
Opaque SDK/FFI handles are process-local resources and never become wire identities.

## `FRAME_SUBMIT` Metadata

Preview4 freezes the fixed metadata at 72 bytes:

| Offset | Field | Type | Rule |
|---:|---|---|---|
| 0 | `src_width` | `u16` | Tensor field; zero for non-tensor payloads. |
| 2 | `src_height` | `u16` | Tensor field; zero for non-tensor payloads. |
| 4 | `tile_width` | `u16` | Tensor field. |
| 6 | `tile_height` | `u16` | Tensor field. |
| 8 | `tile_count` | `u16` | Tensor field. |
| 10 | `section_count` | `u16` | Number of declared tensor sections. |
| 12 | `frame_class` | `u8` | Profile-defined frame class. |
| 13 | `input_profile` | `u8` | Standard input profile registry value. |
| 14 | `tile_index_mode` | `u8` | Tile-index encoding. |
| 15 | `reserved0` | `u8` | MUST be zero. |
| 16 | `latency_budget_ms` | `u16` | Submit latency budget. |
| 18 | `target_fps_x100` | `u16` | Optional frame-rate target. |
| 20 | `retry_of_frame` | `u32` | Prior frame identity, or zero. |
| 24 | `tile_base_id` | `u32` | First tile identity. |
| 28 | `camera_bytes` | `u32` | Declared camera block length. |
| 32 | `tile_index_bytes` | `u32` | Declared tile-index block length. |
| 36 | `reserved1` | `u32` | MUST be zero. |
| 40 | `operation_id` | `u64` | Non-zero lifecycle identity for this submit. |
| 48 | `reserved2` | `u32` | MUST be zero. |
| 52 | `submit_mode` | `u8` | `inline`, `reference`, or `mixed`. |
| 53 | `budget_policy` | `u8` | Frozen budget-policy bitmask. |
| 54 | `loss_tolerance_policy` | `u8` | Frame policy or `0xff` to inherit. |
| 55 | `reserved3` | `u8` | MUST be zero. |
| 56 | `object_ref_mask` | `u32` | Standard referenced-object slots. |
| 60 | `dependency_frame_id` | `u32` | Dependency frame, or zero. |
| 64 | `payload_kind_bitmap` | `u32` | Declared payload families. |
| 68 | `payload_frame_count` | `u16` | Number of typed payload frames. |
| 70 | `reserved4` | `u16` | MUST be zero. |

The `tile_index_bytes` field occupies bytes `32..35`. Bytes `36..39` are reserved; they do not
overlap the tile-index length. `operation_id` occupies bytes `40..47` and is part of every valid
Preview4 `FRAME_SUBMIT`.

## Runtime Correlation

1. A client allocates both identities before encoding the submit.
2. A server records both identities when it accepts the submit and binds them to its local
   operation handle.
3. Partial results and operation-scoped control frames use `operation_id` in fixed metadata.
4. Every operation-scoped message MUST carry the `header.frame_id` bound to its metadata
   `operation_id`; a receiver MUST reject an unknown operation or a mismatched pair.
5. `RESULT_PUSH` and `RESULT_DROP` retain `header.frame_id` correlation.
6. A terminal result releases lifecycle state only after the corresponding terminal event has
   been delivered or durably recorded.
