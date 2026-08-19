---
prev:
  text: Runtime Control Value Registries
  link: /en/profiles/runtime-control/value-registries/
next:
  text: Runtime Object and Cache Metadata
  link: /en/profiles/runtime-control/object-cache-frames/
---

# Runtime Control Frame Metadata

This page defines fixed metadata for the `runtime.control` frames. Multi-value fields use the
[Runtime Control Value Registries](./value-registries).

## Control Request Metadata

Used by `CANCEL` and `ABORT`.

| Offset | Field              | Type  | Required | Meaning                                            |
| ------ | ------------------ | ----- | -------- | -------------------------------------------------- |
| `0`    | `operation_id`     | `u64` | Yes      | Target operation. `0` means session-level control. |
| `8`    | `control_sequence` | `u64` | Yes      | Monotonic sequence within the sender.              |
| `16`   | `reason_code`      | `u16` | Yes      | See `reason_code` in the value registries.         |
| `18`   | `source_role`      | `u8`  | Yes      | See role codes in the value registries.            |
| `19`   | `flags`            | `u8`  | Yes      | See flag masks in the value registries.            |
| `20`   | `diagnostic_bytes` | `u32` | No       | Optional diagnostic body length.                   |
| `24`   | `reserved`         | `u64` | Yes      | Must be zero.                                      |

## Scheduling Metadata

Used by `PRIORITY_UPDATE`, `DEADLINE`, and `EXPIRE_AT`.

| Offset | Field              | Type  | Required                     | Meaning                                    |
| ------ | ------------------ | ----- | ---------------------------- | ------------------------------------------ |
| `0`    | `operation_id`     | `u64` | Yes                          | Target operation.                          |
| `8`    | `control_sequence` | `u64` | Yes                          | Monotonic sequence within the sender.      |
| `16`   | `priority_class`   | `u16` | For `PRIORITY_UPDATE`        | New priority class.                        |
| `18`   | `priority_delta`   | `i16` | No                           | Relative priority adjustment.              |
| `20`   | `deadline_unix_ms` | `u64` | For `DEADLINE` / `EXPIRE_AT` | Non-zero absolute Unix deadline or expiration timestamp in milliseconds; `0` is invalid/unset. |
| `28`   | `flags`            | `u32` | Yes                          | See flag masks in the value registries.    |

## Supersede Metadata

Used by `SUPERSEDE`.

| Offset | Field              | Type  | Required | Meaning                                         |
| ------ | ------------------ | ----- | -------- | ----------------------------------------------- |
| `0`    | `old_operation_id` | `u64` | Yes      | Operation whose late result may be dropped.     |
| `8`    | `new_operation_id` | `u64` | Yes      | Replacement operation.                          |
| `16`   | `control_sequence` | `u64` | Yes      | Monotonic sequence within the sender.           |
| `24`   | `drop_reason_code` | `u16` | Yes      | See `drop_reason_code` in the value registries. |
| `26`   | `flags`            | `u16` | Yes      | See flag masks in the value registries.         |
| `28`   | `diagnostic_bytes` | `u32` | No       | Optional diagnostic body length.                |

## Budget Metadata

Used by `BUDGET_UPDATE`.

| Offset | Field                    | Type  | Required | Meaning                                           |
| ------ | ------------------------ | ----- | -------- | ------------------------------------------------- |
| `0`    | `operation_id`           | `u64` | Yes      | Target operation or `0` for session-level budget. |
| `8`    | `compute_budget_units`   | `u64` | No       | Compute units under the negotiated cost model.    |
| `16`   | `memory_budget_bytes`    | `u64` | No       | Memory budget.                                    |
| `24`   | `bandwidth_budget_bytes` | `u64` | No       | Transport budget.                                 |
| `32`   | `token_budget`           | `u32` | No       | Token budget when applicable.                     |
| `36`   | `flags`                  | `u32` | Yes      | See flag masks in the value registries.           |

## Progress Metadata

Used by `PROGRESS`.

| Offset | Field               | Type  | Required | Meaning                                         |
| ------ | ------------------- | ----- | -------- | ----------------------------------------------- |
| `0`    | `operation_id`      | `u64` | Yes      | Operation being reported.                       |
| `8`    | `progress_sequence` | `u64` | Yes      | Monotonic progress sequence.                    |
| `16`   | `stage_code`        | `u16` | Yes      | See `stage_code` in the value registries.       |
| `18`   | `percent_x100`      | `u16` | No       | `0..10000`; `0xffff` means unknown.             |
| `20`   | `object_id`         | `u64` | No       | Runtime object attached to this progress event. |
| `28`   | `body_bytes`        | `u32` | No       | Optional progress payload length.               |

## Partial Result Metadata

Used by `PARTIAL_RESULT`.

| Offset | Field             | Type  | Required | Meaning                                 |
| ------ | ----------------- | ----- | -------- | --------------------------------------- |
| `0`    | `operation_id`    | `u64` | Yes      | Operation being reported.               |
| `8`    | `result_sequence` | `u64` | Yes      | Monotonic result sequence.              |
| `16`   | `object_id`       | `u64` | No       | Referenced runtime object.              |
| `24`   | `delta_sequence`  | `u64` | No       | Object delta sequence.                  |
| `32`   | `body_bytes`      | `u32` | No       | Inline body length.                     |
| `36`   | `flags`           | `u32` | Yes      | See flag masks in the value registries. |

## Pressure Metadata

Used by `BACKPRESSURE` and `CREDIT_UPDATE`.

| Offset | Field             | Type  | Required            | Meaning                                        |
| ------ | ----------------- | ----- | ------------------- | ---------------------------------------------- |
| `0`    | `scope_id`        | `u64` | Yes                 | Session or operation scope.                    |
| `8`    | `credit_window`   | `u64` | For `CREDIT_UPDATE` | New send window.                               |
| `16`   | `pressure_level`  | `u16` | For `BACKPRESSURE`  | See `pressure_level` in the value registries.  |
| `18`   | `pressure_reason` | `u16` | No                  | See `pressure_reason` in the value registries. |
| `20`   | `retry_after_ms`  | `u32` | No                  | Sender should wait before sending more.        |
| `24`   | `flags`           | `u32` | Yes                 | See flag masks in the value registries.        |
| `28`   | `reserved`        | `u32` | Yes                 | Must be zero.                                  |

## Capability Metadata

Used by `CAPABILITY_NEGOTIATION` and `DEGRADE_PROFILE`.

| Offset | Field              | Type  | Required | Meaning                                      |
| ------ | ------------------ | ----- | -------- | -------------------------------------------- |
| `0`    | `profile_id`       | `u16` | Yes      | Profile being negotiated.                    |
| `2`    | `capability_count` | `u16` | Yes      | Number of capability entries in the body.    |
| `4`    | `cost_model_id`    | `u16` | No       | See `cost_model_id` in the value registries. |
| `6`    | `preference_rank`  | `u16` | No       | Lower value means stronger preference.       |
| `8`    | `limit_bytes`      | `u64` | No       | Aggregate byte limit for the profile.        |
| `16`   | `limit_units`      | `u64` | No       | Aggregate compute or token limit.            |
| `24`   | `body_bytes`       | `u32` | Yes      | Capability entry body length.                |
| `28`   | `flags`            | `u32` | Yes      | See flag masks in the value registries.      |

## Route Hint Metadata

Used by `ROUTE_HINT` and `EXECUTION_HINT`.

| Offset | Field              | Type  | Required | Meaning                                       |
| ------ | ------------------ | ----- | -------- | --------------------------------------------- |
| `0`    | `operation_id`     | `u64` | Yes      | Operation being routed.                       |
| `8`    | `route_id`         | `u32` | No       | Preferred route.                              |
| `12`   | `executor_class`   | `u16` | No       | See `executor_class` in the value registries. |
| `14`   | `affinity_class`   | `u16` | No       | See `affinity_class` in the value registries. |
| `16`   | `deadline_unix_ms` | `u64` | No       | Route-level deadline.                         |
| `24`   | `body_bytes`       | `u32` | No       | Optional hint body length.                    |
| `28`   | `flags`            | `u32` | Yes      | See flag masks in the value registries.       |

## Trace Context Metadata

Used by `TRACE_CONTEXT`.

| Offset | Field            | Type  | Required | Meaning                                                        |
| ------ | ---------------- | ----- | -------- | -------------------------------------------------------------- |
| `0`    | `trace_id`       | `u64` | Yes      | Trace identifier, mirrored in the common header when possible. |
| `8`    | `span_id`        | `u64` | Yes      | Current span.                                                  |
| `16`   | `parent_span_id` | `u64` | No       | Parent span.                                                   |
| `24`   | `stage_code`     | `u16` | No       | See `stage_code` in the value registries.                      |
| `26`   | `flags`          | `u16` | Yes      | See flag masks in the value registries.                        |
| `28`   | `body_bytes`     | `u32` | No       | Optional trace attribute body length.                          |

`TRACE_CONTEXT` has two frozen correlation scopes:

- `header.frame_id == 0` updates session-scoped trace context.
- A non-zero `header.frame_id` updates the operation bound to that submitted frame. The frame id
  MUST name an active operation and MUST equal the `FRAME_SUBMIT` frame id recorded for that
  operation.

The metadata intentionally does not repeat `operation_id`. A role-level SDK accepts an optional
operation identity and resolves it through the active `operation_id` / `frame_id` pair before
encoding the common header. It MUST NOT allocate an unrelated frame id for `TRACE_CONTEXT`.
Receivers MUST reject a non-zero unknown or mismatched frame id. When the common-header `trace_id`
is non-zero, it MUST equal `TraceContextMetadata.trace_id`.

## Result Drop Metadata

Used by `RESULT_DROP_REASON`.

| Offset | Field              | Type  | Required | Meaning                                         |
| ------ | ------------------ | ----- | -------- | ----------------------------------------------- |
| `0`    | `operation_id`     | `u64` | Yes      | Dropped operation or result.                    |
| `8`    | `result_sequence`  | `u64` | No       | Dropped result sequence.                        |
| `16`   | `drop_reason_code` | `u16` | Yes      | See `drop_reason_code` in the value registries. |
| `18`   | `source_role`      | `u8`  | Yes      | See role codes in the value registries.         |
| `19`   | `flags`            | `u8`  | Yes      | See flag masks in the value registries.         |
| `20`   | `diagnostic_bytes` | `u32` | No       | Optional diagnostic body length.                |
| `24`   | `reserved`         | `u64` | Yes      | Must be zero.                                   |

## Recoverable Error Metadata

Used by `ERROR_RECOVERABLE`.

| Offset | Field                | Type  | Required | Meaning                                             |
| ------ | -------------------- | ----- | -------- | --------------------------------------------------- |
| `0`    | `error_code`         | `u32` | Yes      | Error code in the active error registry.            |
| `4`    | `error_scope`        | `u32` | Yes      | Connection, session, or frame scope.                |
| `8`    | `recovery_action`    | `u16` | Yes      | See `reason_code` in the value registries.          |
| `10`   | `source_role`        | `u8`  | Yes      | See role codes in the value registries.             |
| `11`   | `flags`              | `u8`  | Yes      | See flag masks in the value registries.             |
| `12`   | `retry_after_ms`     | `u32` | No       | Suggested retry delay; `0` means no explicit delay. |
| `16`   | `related_session_id` | `u32` | No       | Related session identifier.                         |
| `20`   | `related_frame_id`   | `u32` | No       | Related frame or operation identifier low bits.     |
| `24`   | `related_view_id`    | `u32` | No       | Related view identifier.                            |
| `28`   | `diagnostic_bytes`   | `u32` | No       | Optional diagnostic body length.                    |

## Retry After Metadata

Used by `RETRY_AFTER`.

| Offset | Field              | Type  | Required | Meaning                                           |
| ------ | ------------------ | ----- | -------- | ------------------------------------------------- |
| `0`    | `scope_id`         | `u64` | Yes      | Session or operation scope; `0` means connection. |
| `8`    | `control_sequence` | `u64` | Yes      | Monotonic sequence within the sender.             |
| `16`   | `retry_after_ms`   | `u32` | Yes      | Minimum retry delay in milliseconds.              |
| `20`   | `jitter_ms`        | `u32` | No       | Optional jitter window in milliseconds.           |
| `24`   | `reason_code`      | `u16` | Yes      | See `reason_code` in the value registries.        |
| `26`   | `source_role`      | `u8`  | Yes      | See role codes in the value registries.           |
| `27`   | `flags`            | `u8`  | Yes      | See flag masks in the value registries.           |
| `28`   | `diagnostic_bytes` | `u32` | No       | Optional diagnostic body length.                  |
