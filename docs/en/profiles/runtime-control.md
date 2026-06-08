# Runtime Control Profiles

Runtime control profiles are standard NNRP profiles. They define the small control-plane frames and
runtime-object references that let hosts coordinate cancellation, priority, deadlines, partial
results, backpressure, cache references, route hints, and trace context without wrapping those
signals in JSON or another application protocol.

These profiles are part of the standard profile registry, alongside `tensor` and `token`.
Implementations must not treat them as private extension names.

## Profile Registry

| `profile_id` | Profile               | Scope                                                                                                                   |
| ------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `0x0100`     | `runtime.control`     | Operation control frames, scheduling updates, pressure signals, route hints, trace context, and drop reasons.           |
| `0x0101`     | `runtime.object`      | Runtime object declaration, object references, object deltas, release semantics, cost metadata, and ownership metadata. |
| `0x0102`     | `cache.reference`     | Cache references, cache misses, invalidation, lease anchors, reuse scope, and miss diagnostics.                         |
| `0x0103`     | `coding.agent`        | Subagent dispatch hints, tool artifact routing, task cancellation, and execution preferences.                           |
| `0x0104`     | `multimodal.artifact` | Typed image, audio, video, document, and tool artifacts with partial result streams.                                    |
| `0x0105`     | `render.runtime`      | Frame deadlines, partial region results, supersession, render-stage trace context, and drop reasons.                    |

## Frame Type Registry

Preview4 control and object frames extend the NNRP/1 message type registry. The common header stays
the same 40-byte header; each frame below defines its own fixed metadata layout.

| Code   | Frame                    | Direction        | Profile           | Fixed metadata                                              |
| ------ | ------------------------ | ---------------- | ----------------- | ----------------------------------------------------------- |
| `0x30` | `CANCEL`                 | C -> S or S -> C | `runtime.control` | [`Control Request Metadata`](#control-request-metadata)     |
| `0x31` | `ABORT`                  | C -> S or S -> C | `runtime.control` | [`Control Request Metadata`](#control-request-metadata)     |
| `0x32` | `PRIORITY_UPDATE`        | C -> S or S -> C | `runtime.control` | [`Scheduling Metadata`](#scheduling-metadata)               |
| `0x33` | `DEADLINE`               | C -> S or S -> C | `runtime.control` | [`Scheduling Metadata`](#scheduling-metadata)               |
| `0x34` | `EXPIRE_AT`              | C -> S or S -> C | `runtime.control` | [`Scheduling Metadata`](#scheduling-metadata)               |
| `0x35` | `SUPERSEDE`              | C -> S or S -> C | `runtime.control` | [`Supersede Metadata`](#supersede-metadata)                 |
| `0x36` | `BUDGET_UPDATE`          | C -> S or S -> C | `runtime.control` | [`Budget Metadata`](#budget-metadata)                       |
| `0x37` | `PROGRESS`               | S -> C or C -> S | `runtime.control` | [`Progress Metadata`](#progress-metadata)                   |
| `0x38` | `PARTIAL_RESULT`         | S -> C or C -> S | `runtime.control` | [`Partial Result Metadata`](#partial-result-metadata)       |
| `0x39` | `BACKPRESSURE`           | C -> S or S -> C | `runtime.control` | [`Pressure Metadata`](#pressure-metadata)                   |
| `0x3A` | `CREDIT_UPDATE`          | C -> S or S -> C | `runtime.control` | [`Pressure Metadata`](#pressure-metadata)                   |
| `0x3B` | `CAPABILITY_NEGOTIATION` | C -> S or S -> C | `runtime.control` | [`Capability Metadata`](#capability-metadata)               |
| `0x3C` | `DEGRADE_PROFILE`        | C -> S or S -> C | `runtime.control` | [`Capability Metadata`](#capability-metadata)               |
| `0x3D` | `ROUTE_HINT`             | C -> S or S -> C | `runtime.control` | [`Route Hint Metadata`](#route-hint-metadata)               |
| `0x3E` | `EXECUTION_HINT`         | C -> S or S -> C | `runtime.control` | [`Route Hint Metadata`](#route-hint-metadata)               |
| `0x3F` | `TRACE_CONTEXT`          | C -> S or S -> C | `runtime.control` | [`Trace Context Metadata`](#trace-context-metadata)         |
| `0x40` | `RESULT_DROP_REASON`     | C -> S or S -> C | `runtime.control` | [`Result Drop Metadata`](#result-drop-metadata)             |
| `0x41` | `OBJECT_DECLARE`         | C -> S or S -> C | `runtime.object`  | [`Object Descriptor Metadata`](#object-descriptor-metadata) |
| `0x42` | `OBJECT_REF`             | C -> S or S -> C | `runtime.object`  | [`Object Reference Metadata`](#object-reference-metadata)   |
| `0x43` | `OBJECT_RELEASE`         | C -> S or S -> C | `runtime.object`  | [`Object Release Metadata`](#object-release-metadata)       |
| `0x44` | `OBJECT_PATCH`           | C -> S or S -> C | `runtime.object`  | [`Object Delta Metadata`](#object-delta-metadata)           |
| `0x45` | `OBJECT_DELTA`           | C -> S or S -> C | `runtime.object`  | [`Object Delta Metadata`](#object-delta-metadata)           |
| `0x46` | `CACHE_REFERENCE`        | C -> S or S -> C | `cache.reference` | [`Cache Reference Metadata`](#cache-reference-metadata)     |
| `0x47` | `CACHE_MISS`             | C -> S or S -> C | `cache.reference` | [`Cache Miss Metadata`](#cache-miss-metadata)               |

`CACHE_INVALIDATE` keeps its existing NNRP/1 message type and gains the `cache.reference` capability
requirement when used as part of this profile.

## Capability Tokens

| Capability token               | Frames                                              |
| ------------------------------ | --------------------------------------------------- |
| `control.cancel_abort`         | `CANCEL`, `ABORT`                                   |
| `control.supersede`            | `SUPERSEDE`                                         |
| `control.priority_update`      | `PRIORITY_UPDATE`                                   |
| `control.deadline_expire`      | `DEADLINE`, `EXPIRE_AT`                             |
| `control.progress_partial`     | `PROGRESS`, `PARTIAL_RESULT`                        |
| `control.credit_backpressure`  | `BACKPRESSURE`, `CREDIT_UPDATE`                     |
| `control.capability_costs`     | `CAPABILITY_NEGOTIATION`, `DEGRADE_PROFILE`         |
| `control.route_execution_hint` | `ROUTE_HINT`, `EXECUTION_HINT`                      |
| `control.trace_context`        | `TRACE_CONTEXT`                                     |
| `control.result_drop_reason`   | `RESULT_DROP_REASON`                                |
| `object.lifecycle`             | `OBJECT_DECLARE`, `OBJECT_REF`, `OBJECT_RELEASE`    |
| `object.delta`                 | `OBJECT_PATCH`, `OBJECT_DELTA`                      |
| `object.cost`                  | Object descriptor cost fields                       |
| `object.ownership`             | Object descriptor ownership fields                  |
| `cache.reference`              | `CACHE_REFERENCE`, `CACHE_MISS`, `CACHE_INVALIDATE` |

## Control Request Metadata

| Offset | Field              | Type  | Required | Meaning                                                    |
| ------ | ------------------ | ----- | -------- | ---------------------------------------------------------- |
| `0`    | `operation_id`     | `u64` | Yes      | Target operation. `0` means session-level control.         |
| `8`    | `control_sequence` | `u64` | Yes      | Monotonic sequence within the sender.                      |
| `16`   | `reason_code`      | `u16` | Yes      | Machine-readable cancel or abort reason.                   |
| `18`   | `source_role`      | `u8`  | Yes      | `client`, `server`, `runtime`, or `subagent`.              |
| `19`   | `flags`            | `u8`  | Yes      | Bit `0`: cooperative allowed; bit `1`: hard abort allowed. |
| `20`   | `diagnostic_bytes` | `u32` | No       | Optional diagnostic body length.                           |
| `24`   | `reserved`         | `u64` | Yes      | Must be zero.                                              |

## Scheduling Metadata

| Offset | Field              | Type  | Required                     | Meaning                                                 |
| ------ | ------------------ | ----- | ---------------------------- | ------------------------------------------------------- |
| `0`    | `operation_id`     | `u64` | Yes                          | Target operation.                                       |
| `8`    | `control_sequence` | `u64` | Yes                          | Monotonic sequence within the sender.                   |
| `16`   | `priority_class`   | `u16` | For `PRIORITY_UPDATE`        | New priority class.                                     |
| `18`   | `priority_delta`   | `i16` | No                           | Relative priority adjustment.                           |
| `20`   | `deadline_unix_ms` | `u64` | For `DEADLINE` / `EXPIRE_AT` | Absolute deadline or expiration timestamp.              |
| `28`   | `flags`            | `u32` | Yes                          | Bit `0`: discard stale work; bit `1`: emit drop reason. |

## Supersede Metadata

| Offset | Field              | Type  | Required | Meaning                                     |
| ------ | ------------------ | ----- | -------- | ------------------------------------------- |
| `0`    | `old_operation_id` | `u64` | Yes      | Operation whose late result may be dropped. |
| `8`    | `new_operation_id` | `u64` | Yes      | Replacement operation.                      |
| `16`   | `control_sequence` | `u64` | Yes      | Monotonic sequence within the sender.       |
| `24`   | `drop_reason_code` | `u16` | Yes      | Usually `superseded`.                       |
| `26`   | `flags`            | `u16` | Yes      | Bit `0`: abort old operation immediately.   |
| `28`   | `diagnostic_bytes` | `u32` | No       | Optional diagnostic body length.            |

## Budget Metadata

| Offset | Field                    | Type  | Required | Meaning                                           |
| ------ | ------------------------ | ----- | -------- | ------------------------------------------------- |
| `0`    | `operation_id`           | `u64` | Yes      | Target operation or `0` for session-level budget. |
| `8`    | `compute_budget_units`   | `u64` | No       | Runtime-defined compute budget.                   |
| `16`   | `memory_budget_bytes`    | `u64` | No       | Memory budget.                                    |
| `24`   | `bandwidth_budget_bytes` | `u64` | No       | Transport budget.                                 |
| `32`   | `token_budget`           | `u32` | No       | Token budget when applicable.                     |
| `36`   | `flags`                  | `u32` | Yes      | Bit `0`: replace; bit `1`: increment.             |

## Progress Metadata

| Offset | Field               | Type  | Required | Meaning                                         |
| ------ | ------------------- | ----- | -------- | ----------------------------------------------- |
| `0`    | `operation_id`      | `u64` | Yes      | Operation being reported.                       |
| `8`    | `progress_sequence` | `u64` | Yes      | Monotonic progress sequence.                    |
| `16`   | `stage_code`        | `u16` | Yes      | Profile-defined stage.                          |
| `18`   | `percent_x100`      | `u16` | No       | `0..10000`; `0xffff` means unknown.             |
| `20`   | `object_id`         | `u64` | No       | Runtime object attached to this progress event. |
| `28`   | `body_bytes`        | `u32` | No       | Optional progress payload length.               |

## Partial Result Metadata

| Offset | Field             | Type  | Required | Meaning                                              |
| ------ | ----------------- | ----- | -------- | ---------------------------------------------------- |
| `0`    | `operation_id`    | `u64` | Yes      | Operation being reported.                            |
| `8`    | `result_sequence` | `u64` | Yes      | Monotonic result sequence.                           |
| `16`   | `object_id`       | `u64` | No       | Referenced runtime object.                           |
| `24`   | `delta_sequence`  | `u64` | No       | Object delta sequence.                               |
| `32`   | `body_bytes`      | `u32` | No       | Inline body length.                                  |
| `36`   | `flags`           | `u32` | Yes      | Bit `0`: final partial; bit `1`: object ref present. |

## Pressure Metadata

| Offset | Field             | Type  | Required            | Meaning                                                        |
| ------ | ----------------- | ----- | ------------------- | -------------------------------------------------------------- |
| `0`    | `scope_id`        | `u64` | Yes                 | Session or operation scope.                                    |
| `8`    | `credit_window`   | `u64` | For `CREDIT_UPDATE` | New send window.                                               |
| `16`   | `pressure_level`  | `u16` | For `BACKPRESSURE`  | `none`, `soft`, or `hard`.                                     |
| `18`   | `pressure_reason` | `u16` | No                  | Machine-readable reason.                                       |
| `20`   | `retry_after_ms`  | `u32` | No                  | Sender should wait before sending more.                        |
| `24`   | `flags`           | `u32` | Yes                 | Bit `0`: applies to connection; bit `1`: applies to operation. |
| `28`   | `reserved`        | `u32` | Yes                 | Must be zero.                                                  |

## Capability Metadata

| Offset | Field              | Type  | Required | Meaning                                                |
| ------ | ------------------ | ----- | -------- | ------------------------------------------------------ |
| `0`    | `profile_id`       | `u16` | Yes      | Profile being negotiated.                              |
| `2`    | `capability_count` | `u16` | Yes      | Number of capability entries in the body.              |
| `4`    | `cost_model_id`    | `u16` | No       | Cost model used by the body entries.                   |
| `6`    | `preference_rank`  | `u16` | No       | Lower value means stronger preference.                 |
| `8`    | `limit_bytes`      | `u64` | No       | Aggregate byte limit for the negotiated profile.       |
| `16`   | `limit_units`      | `u64` | No       | Aggregate compute or token limit.                      |
| `24`   | `body_bytes`       | `u32` | Yes      | Capability entry body length.                          |
| `28`   | `flags`            | `u32` | Yes      | Bit `0`: hard requirement; bit `1`: downgrade allowed. |

## Route Hint Metadata

| Offset | Field              | Type  | Required | Meaning                                    |
| ------ | ------------------ | ----- | -------- | ------------------------------------------ |
| `0`    | `operation_id`     | `u64` | Yes      | Operation being routed.                    |
| `8`    | `route_id`         | `u32` | No       | Preferred route.                           |
| `12`   | `executor_class`   | `u16` | No       | Runtime-defined executor class.            |
| `14`   | `affinity_class`   | `u16` | No       | Locality or placement hint.                |
| `16`   | `deadline_unix_ms` | `u64` | No       | Route-level deadline.                      |
| `24`   | `body_bytes`       | `u32` | No       | Optional hint body length.                 |
| `28`   | `flags`            | `u32` | Yes      | Bit `0`: must honor; bit `1`: best effort. |

## Trace Context Metadata

| Offset | Field            | Type  | Required | Meaning                                                        |
| ------ | ---------------- | ----- | -------- | -------------------------------------------------------------- |
| `0`    | `trace_id`       | `u64` | Yes      | Trace identifier, mirrored in the common header when possible. |
| `8`    | `span_id`        | `u64` | Yes      | Current span.                                                  |
| `16`   | `parent_span_id` | `u64` | No       | Parent span.                                                   |
| `24`   | `stage_code`     | `u16` | No       | Profile-defined stage.                                         |
| `26`   | `flags`          | `u16` | Yes      | Bit `0`: sampled; bit `1`: error.                              |
| `28`   | `body_bytes`     | `u32` | No       | Optional trace attribute body length.                          |

## Result Drop Metadata

| Offset | Field              | Type  | Required | Meaning                                                                                                          |
| ------ | ------------------ | ----- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `0`    | `operation_id`     | `u64` | Yes      | Dropped operation or result.                                                                                     |
| `8`    | `result_sequence`  | `u64` | No       | Dropped result sequence.                                                                                         |
| `16`   | `drop_reason_code` | `u16` | Yes      | `deadline_expired`, `superseded`, `peer_cancelled`, `backpressure`, `capability_mismatch`, or `budget_exceeded`. |
| `18`   | `source_role`      | `u8`  | Yes      | Source of the decision.                                                                                          |
| `19`   | `flags`            | `u8`  | Yes      | Bit `0`: final; bit `1`: retryable.                                                                              |
| `20`   | `diagnostic_bytes` | `u32` | No       | Optional diagnostic body length.                                                                                 |
| `24`   | `reserved`         | `u64` | Yes      | Must be zero.                                                                                                    |

## Object Descriptor Metadata

| Offset | Field                  | Type  | Required | Meaning                                                                                    |
| ------ | ---------------------- | ----- | -------- | ------------------------------------------------------------------------------------------ |
| `0`    | `object_id`            | `u64` | Yes      | Runtime object identity.                                                                   |
| `8`    | `object_kind`          | `u16` | Yes      | Tensor, token block, image tile, feature map, tool result, trace segment, or opaque bytes. |
| `10`   | `producer_role`        | `u8`  | Yes      | Producer role.                                                                             |
| `11`   | `consumer_role`        | `u8`  | Yes      | Intended consumer role.                                                                    |
| `12`   | `session_id`           | `u32` | Yes      | Owning session.                                                                            |
| `16`   | `byte_size`            | `u64` | Yes      | Object size.                                                                               |
| `24`   | `compute_cost_units`   | `u32` | No       | Runtime-defined compute cost.                                                              |
| `28`   | `memory_location_hint` | `u16` | No       | Host memory, device memory, shared memory, or remote memory.                               |
| `30`   | `ownership_hint`       | `u16` | Yes      | Producer-owned, consumer-owned, session-owned, or borrowed.                                |
| `32`   | `lifetime_hint_ms`     | `u32` | No       | Suggested lifetime.                                                                        |
| `36`   | `metadata_bytes`       | `u32` | No       | Optional object metadata body length.                                                      |
| `40`   | `reserved`             | `u64` | Yes      | Must be zero.                                                                              |

## Object Reference Metadata

| Offset | Field            | Type  | Required | Meaning                                                       |
| ------ | ---------------- | ----- | -------- | ------------------------------------------------------------- |
| `0`    | `object_id`      | `u64` | Yes      | Referenced object.                                            |
| `8`    | `operation_id`   | `u64` | No       | Operation using the object.                                   |
| `16`   | `object_version` | `u64` | No       | Version or generation.                                        |
| `24`   | `offset`         | `u64` | No       | Referenced byte or region offset.                             |
| `32`   | `length`         | `u64` | No       | Referenced byte or region length.                             |
| `40`   | `flags`          | `u32` | Yes      | Bit `0`: borrowed; bit `1`: mutable; bit `2`: region present. |
| `44`   | `metadata_bytes` | `u32` | No       | Optional reference metadata body length.                      |

## Object Release Metadata

| Offset | Field              | Type  | Required | Meaning                                                                |
| ------ | ------------------ | ----- | -------- | ---------------------------------------------------------------------- |
| `0`    | `object_id`        | `u64` | Yes      | Released object.                                                       |
| `8`    | `operation_id`     | `u64` | No       | Operation that no longer needs the object.                             |
| `16`   | `release_reason`   | `u16` | Yes      | Completed, cancelled, expired, replaced, invalidated, or owner closed. |
| `18`   | `source_role`      | `u8`  | Yes      | Releasing side.                                                        |
| `19`   | `flags`            | `u8`  | Yes      | Bit `0`: final release; bit `1`: invalidates dependents.               |
| `20`   | `diagnostic_bytes` | `u32` | No       | Optional diagnostic body length.                                       |
| `24`   | `reserved`         | `u64` | Yes      | Must be zero.                                                          |

## Object Delta Metadata

| Offset | Field            | Type  | Required | Meaning                                                              |
| ------ | ---------------- | ----- | -------- | -------------------------------------------------------------------- |
| `0`    | `object_id`      | `u64` | Yes      | Patched object.                                                      |
| `8`    | `delta_sequence` | `u64` | Yes      | Monotonic delta sequence for the object.                             |
| `16`   | `region_offset`  | `u64` | No       | Region offset.                                                       |
| `24`   | `region_bytes`   | `u32` | No       | Region length.                                                       |
| `28`   | `delta_bytes`    | `u32` | Yes      | Delta payload length.                                                |
| `32`   | `flags`          | `u32` | Yes      | Bit `0`: replaces region; bit `1`: compressed; bit `2`: final delta. |
| `36`   | `metadata_bytes` | `u32` | No       | Optional delta metadata body length.                                 |

## Cache Reference Metadata

| Offset | Field                | Type  | Required | Meaning                                                  |
| ------ | -------------------- | ----- | -------- | -------------------------------------------------------- |
| `0`    | `cache_key_hi`       | `u64` | Yes      | High 64 bits of cache identity.                          |
| `8`    | `cache_key_lo`       | `u64` | Yes      | Low 64 bits of cache identity.                           |
| `16`   | `profile_id`         | `u16` | Yes      | Profile that defines interpretation.                     |
| `18`   | `reuse_scope`        | `u16` | Yes      | Operation, session, connection, or global.               |
| `20`   | `lease_id`           | `u64` | No       | Lease anchor.                                            |
| `28`   | `producer_trace_id`  | `u64` | No       | Trace ID of producer.                                    |
| `36`   | `expiration_hint_ms` | `u32` | No       | Expiration hint.                                         |
| `40`   | `metadata_bytes`     | `u32` | No       | Optional metadata body length.                           |
| `44`   | `flags`              | `u32` | Yes      | Bit `0`: lease required; bit `1`: body fallback present. |

## Cache Miss Metadata

| Offset | Field              | Type  | Required | Meaning                                                                    |
| ------ | ------------------ | ----- | -------- | -------------------------------------------------------------------------- |
| `0`    | `cache_key_hi`     | `u64` | Yes      | High 64 bits of cache identity.                                            |
| `8`    | `cache_key_lo`     | `u64` | Yes      | Low 64 bits of cache identity.                                             |
| `16`   | `miss_reason`      | `u16` | Yes      | Not found, expired, invalidated, schema mismatch, or producer unavailable. |
| `18`   | `profile_id`       | `u16` | No       | Profile that rejected interpretation.                                      |
| `20`   | `diagnostic_bytes` | `u32` | No       | Optional diagnostic body length.                                           |
| `24`   | `reserved`         | `u64` | Yes      | Must be zero.                                                              |

## Conformance Requirement

Wire-level conformance must exercise these profiles by exchanging NNRP frames directly. SDK adapter
manifests can help generate scenarios, but they do not replace direct client/server wire checks.
