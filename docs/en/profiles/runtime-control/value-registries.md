---
prev:
  text: Runtime Control Profiles
  link: /en/profiles/runtime-control/
next:
  text: Runtime Control Frame Metadata
  link: /en/profiles/runtime-control/control-frames/
---

# Runtime Control Value Registries

All multi-value fields in runtime control fixed metadata use the registries in this page. Values
outside the listed standard ranges are invalid unless the field explicitly names a private/vendor
range. Private/vendor values are not valid in mandatory conformance scenarios.

Receivers MUST reject fixed metadata that sets a reserved flag bit, uses a reserved enum value, or
sets a `reserved` field to a non-zero value.

## Role Codes

| Value        | Name                 | Meaning                                             |
| ------------ | -------------------- | --------------------------------------------------- |
| `0x00`       | `unspecified`        | Only valid when the role field is optional.         |
| `0x01`       | `client`             | Client-side SDK, caller, or browser endpoint.       |
| `0x02`       | `server`             | Server-side SDK or service endpoint.                |
| `0x03`       | `runtime`            | Runtime host or local execution engine.             |
| `0x04`       | `subagent`           | Agent worker or delegated execution unit.           |
| `0x05`       | `tool`               | Tool host or tool executor.                         |
| `0x06`       | `scheduler`          | Scheduler, router, or admission controller.         |
| `0x07`       | `conformance_runner` | Wire-level conformance runner.                      |
| `0x08..0x7f` | Reserved             | Reserved for future standard role codes.            |
| `0x80..0xff` | Private/vendor       | Private extension range; excluded from conformance. |

## Reason And Stage Codes

| Field              | Value            | Name                     | Meaning                                       |
| ------------------ | ---------------- | ------------------------ | --------------------------------------------- |
| `reason_code`      | `0x0000`         | `unspecified`            | Generic reason.                               |
| `reason_code`      | `0x0001`         | `user_cancelled`         | User or caller cancelled the work.            |
| `reason_code`      | `0x0002`         | `superseded`             | Replaced by a newer operation.                |
| `reason_code`      | `0x0003`         | `deadline_expired`       | Deadline or expiration timestamp passed.      |
| `reason_code`      | `0x0004`         | `budget_exceeded`        | Compute, memory, bandwidth, or token budget.  |
| `reason_code`      | `0x0005`         | `dependency_failed`      | Required dependency failed.                   |
| `reason_code`      | `0x0006`         | `transport_closing`      | Transport is closing.                         |
| `reason_code`      | `0x0007`         | `shutdown`               | Runtime or service shutdown.                  |
| `reason_code`      | `0x0008`         | `conformance_injection`  | Injected by conformance runner.               |
| `drop_reason_code` | `0x0000`         | `none`                   | No drop reason.                               |
| `drop_reason_code` | `0x0001`         | `deadline_expired`       | Dropped after deadline.                       |
| `drop_reason_code` | `0x0002`         | `superseded`             | Dropped because a newer operation superseded. |
| `drop_reason_code` | `0x0003`         | `peer_cancelled`         | Dropped after peer cancellation.              |
| `drop_reason_code` | `0x0004`         | `backpressure`           | Dropped due to pressure policy.               |
| `drop_reason_code` | `0x0005`         | `capability_mismatch`    | Required capability was unavailable.          |
| `drop_reason_code` | `0x0006`         | `budget_exceeded`        | Budget exceeded.                              |
| `drop_reason_code` | `0x0007`         | `object_invalidated`     | Referenced object was invalidated.            |
| `drop_reason_code` | `0x0008`         | `transport_closed`       | Transport closed before result delivery.      |
| `drop_reason_code` | `0x0009`         | `conformance_injection`  | Injected by conformance runner.               |
| `stage_code`       | `0x0000`         | `unspecified`            | Stage not specified.                          |
| `stage_code`       | `0x0001`         | `queued`                 | Accepted into a queue.                        |
| `stage_code`       | `0x0002`         | `admitted`               | Admitted for execution.                       |
| `stage_code`       | `0x0003`         | `input_received`         | Required input has arrived.                   |
| `stage_code`       | `0x0004`         | `preprocessing`          | Pre-processing input.                         |
| `stage_code`       | `0x0005`         | `executing`              | Main execution is running.                    |
| `stage_code`       | `0x0006`         | `waiting_dependency`     | Waiting for dependency or upstream result.    |
| `stage_code`       | `0x0007`         | `producing_partial`      | Producing partial results.                    |
| `stage_code`       | `0x0008`         | `finalizing`             | Finalizing output.                            |
| `stage_code`       | `0x0009`         | `completed`              | Completed normally.                           |
| `stage_code`       | `0x000a`         | `dropped`                | Result or operation was dropped.              |
| `stage_code`       | `0x000b`         | `failed`                 | Execution failed.                             |
| Any listed field   | `0x000c..0x00ff` | Reserved                 | Reserved for future standard values.          |
| `stage_code`       | `0x0100..0x7fff` | Profile-standard stages  | Standard stages owned by a specific profile.  |
| Any listed field   | `0x8000..0xffff` | Private/vendor extension | Private extension range; excluded from tests. |

## Pressure, Cost, Route, Object, And Cache Codes

| Field                  | Value                  | Name                     | Meaning                                       |
| ---------------------- | ---------------------- | ------------------------ | --------------------------------------------- |
| `pressure_level`       | `0x0000`               | `none`                   | No active pressure.                           |
| `pressure_level`       | `0x0001`               | `soft`                   | Sender should slow down.                      |
| `pressure_level`       | `0x0002`               | `hard`                   | Sender must stop or wait for credit.          |
| `pressure_level`       | `0x0003`               | `paused`                 | Scope is paused until further notice.         |
| `pressure_reason`      | `0x0000`               | `unspecified`            | Generic pressure reason.                      |
| `pressure_reason`      | `0x0001`               | `receiver_queue_full`    | Receiver queue is full.                       |
| `pressure_reason`      | `0x0002`               | `sender_queue_full`      | Sender queue is full.                         |
| `pressure_reason`      | `0x0003`               | `memory_pressure`        | Memory pressure.                              |
| `pressure_reason`      | `0x0004`               | `bandwidth_pressure`     | Bandwidth pressure.                           |
| `pressure_reason`      | `0x0005`               | `compute_pressure`       | Compute capacity pressure.                    |
| `pressure_reason`      | `0x0006`               | `deadline_pressure`      | Deadline or freshness pressure.               |
| `pressure_reason`      | `0x0007`               | `fairness_policy`        | Fairness policy throttled the scope.          |
| `pressure_reason`      | `0x0008`               | `conformance_injection`  | Injected by conformance runner.               |
| `cost_model_id`        | `0x0000`               | `unspecified`            | Cost model not specified.                     |
| `cost_model_id`        | `0x0001`               | `bytes_only`             | Cost entries are byte counts.                 |
| `cost_model_id`        | `0x0002`               | `compute_units`          | Cost entries are compute units.               |
| `cost_model_id`        | `0x0003`               | `token_units`            | Cost entries are token units.                 |
| `cost_model_id`        | `0x0004`               | `memory_bytes`           | Cost entries are memory byte budgets.         |
| `cost_model_id`        | `0x0005`               | `bandwidth_bytes`        | Cost entries are bandwidth byte budgets.      |
| `cost_model_id`        | `0x0006`               | `weighted_units`         | Cost entries use negotiated weighted units.   |
| `executor_class`       | `0x0000`               | `unspecified`            | Executor class not specified.                 |
| `executor_class`       | `0x0001`               | `local_runtime`          | Local runtime executor.                       |
| `executor_class`       | `0x0002`               | `remote_runtime`         | Remote runtime executor.                      |
| `executor_class`       | `0x0003`               | `gpu_worker`             | GPU worker.                                   |
| `executor_class`       | `0x0004`               | `cpu_worker`             | CPU worker.                                   |
| `executor_class`       | `0x0005`               | `subagent`               | Agent worker.                                 |
| `executor_class`       | `0x0006`               | `tool_host`              | Tool host.                                    |
| `executor_class`       | `0x0007`               | `model_server`           | Model server.                                 |
| `executor_class`       | `0x0008`               | `render_worker`          | Render worker.                                |
| `affinity_class`       | `0x0000`               | `none`                   | No affinity requested.                        |
| `affinity_class`       | `0x0001`               | `same_process`           | Prefer same process.                          |
| `affinity_class`       | `0x0002`               | `same_host`              | Prefer same host.                             |
| `affinity_class`       | `0x0003`               | `same_gpu`               | Prefer same GPU.                              |
| `affinity_class`       | `0x0004`               | `same_numa`              | Prefer same NUMA node.                        |
| `affinity_class`       | `0x0005`               | `same_region`            | Prefer same region.                           |
| `affinity_class`       | `0x0006`               | `storage_local`          | Prefer local storage.                         |
| `object_kind`          | `0x0000`               | `unspecified`            | Object kind not specified.                    |
| `object_kind`          | `0x0001`               | `tensor`                 | Tensor or tensor shard.                       |
| `object_kind`          | `0x0002`               | `token_block`            | Token block.                                  |
| `object_kind`          | `0x0003`               | `image_tile`             | Image or render tile.                         |
| `object_kind`          | `0x0004`               | `feature_map`            | Feature map.                                  |
| `object_kind`          | `0x0005`               | `tool_result`            | Tool result artifact.                         |
| `object_kind`          | `0x0006`               | `trace_segment`          | Trace segment artifact.                       |
| `object_kind`          | `0x0007`               | `opaque_bytes`           | Opaque byte object.                           |
| `object_kind`          | `0x0008`               | `document_chunk`         | Document chunk.                               |
| `object_kind`          | `0x0009`               | `audio_chunk`            | Audio chunk.                                  |
| `object_kind`          | `0x000a`               | `video_chunk`            | Video chunk.                                  |
| `object_kind`          | `0x000b`               | `route_plan`             | Route plan artifact.                          |
| `object_kind`          | `0x000c`               | `cache_manifest`         | Cache manifest artifact.                      |
| `memory_location_hint` | `0x0000`               | `unspecified`            | Location not specified.                       |
| `memory_location_hint` | `0x0001`               | `host_memory`            | Host memory.                                  |
| `memory_location_hint` | `0x0002`               | `device_memory`          | Device memory.                                |
| `memory_location_hint` | `0x0003`               | `shared_memory`          | Shared memory.                                |
| `memory_location_hint` | `0x0004`               | `remote_memory`          | Remote memory.                                |
| `memory_location_hint` | `0x0005`               | `mmap_file`              | Memory-mapped file.                           |
| `memory_location_hint` | `0x0006`               | `object_store`           | External object store.                        |
| `ownership_hint`       | `0x0000`               | `unspecified`            | Ownership not specified.                      |
| `ownership_hint`       | `0x0001`               | `producer_owned`         | Producer retains ownership.                   |
| `ownership_hint`       | `0x0002`               | `consumer_owned`         | Consumer takes ownership.                     |
| `ownership_hint`       | `0x0003`               | `session_owned`          | Session owns object lifecycle.                |
| `ownership_hint`       | `0x0004`               | `borrowed`               | Borrowed reference.                           |
| `ownership_hint`       | `0x0005`               | `transfer_on_ref`        | Ownership transfers on reference.             |
| `ownership_hint`       | `0x0006`               | `release_on_drop`        | Release when result is dropped.               |
| `release_reason`       | `0x0000`               | `completed`              | Normal release after completion.              |
| `release_reason`       | `0x0001`               | `cancelled`              | Released after cancellation.                  |
| `release_reason`       | `0x0002`               | `expired`                | Released after expiration.                    |
| `release_reason`       | `0x0003`               | `replaced`               | Released because replaced.                    |
| `release_reason`       | `0x0004`               | `invalidated`            | Released due to invalidation.                 |
| `release_reason`       | `0x0005`               | `owner_closed`           | Owner closed.                                 |
| `release_reason`       | `0x0006`               | `lease_expired`          | Lease expired.                                |
| `release_reason`       | `0x0007`               | `conformance_injection`  | Injected by conformance runner.               |
| `reuse_scope`          | `0x0000`               | `operation`              | Reuse within one operation.                   |
| `reuse_scope`          | `0x0001`               | `session`                | Reuse within one session.                     |
| `reuse_scope`          | `0x0002`               | `connection`             | Reuse within one connection.                  |
| `reuse_scope`          | `0x0003`               | `global`                 | Reuse across connections.                     |
| `reuse_scope`          | `0x0004`               | `tenant`                 | Reuse within one tenant.                      |
| `reuse_scope`          | `0x0005`               | `profile`                | Reuse within one profile namespace.           |
| `miss_reason`          | `0x0000`               | `unknown`                | Unknown miss reason.                          |
| `miss_reason`          | `0x0001`               | `not_found`              | Cache key was not found.                      |
| `miss_reason`          | `0x0002`               | `expired`                | Entry expired.                                |
| `miss_reason`          | `0x0003`               | `invalidated`            | Entry was invalidated.                        |
| `miss_reason`          | `0x0004`               | `schema_mismatch`        | Entry schema or profile did not match.        |
| `miss_reason`          | `0x0005`               | `producer_unavailable`   | Producer or owner is unavailable.             |
| `miss_reason`          | `0x0006`               | `lease_required`         | Lease was required but missing.               |
| `miss_reason`          | `0x0007`               | `permission_denied`      | Access denied.                                |
| Any listed field       | First unused..`0x7fff` | Reserved                 | Reserved for future standard values.          |
| Any listed field       | `0x8000..0xffff`       | Private/vendor extension | Private extension range; excluded from tests. |

## Flag Masks

| Metadata layout           | Field   | Valid mask   | Defined bits                                                         |
| ------------------------- | ------- | ------------ | -------------------------------------------------------------------- |
| Control Request Metadata  | `flags` | `0x03`       | bit `0`: cooperative allowed; bit `1`: hard abort allowed.           |
| Scheduling Metadata       | `flags` | `0x00000003` | bit `0`: discard stale work; bit `1`: emit drop reason.              |
| Supersede Metadata        | `flags` | `0x0001`     | bit `0`: abort old operation immediately.                            |
| Budget Metadata           | `flags` | `0x00000003` | bit `0`: replace; bit `1`: increment.                                |
| Partial Result Metadata   | `flags` | `0x00000003` | bit `0`: final partial; bit `1`: object ref present.                 |
| Pressure Metadata         | `flags` | `0x00000003` | bit `0`: applies to connection; bit `1`: applies to operation.       |
| Capability Metadata       | `flags` | `0x00000003` | bit `0`: hard requirement; bit `1`: downgrade allowed.               |
| Route Hint Metadata       | `flags` | `0x00000003` | bit `0`: must honor; bit `1`: best effort.                           |
| Trace Context Metadata    | `flags` | `0x0003`     | bit `0`: sampled; bit `1`: error.                                    |
| Result Drop Metadata      | `flags` | `0x03`       | bit `0`: final; bit `1`: retryable.                                  |
| Object Reference Metadata | `flags` | `0x00000007` | bit `0`: borrowed; bit `1`: mutable; bit `2`: region present.        |
| Object Release Metadata   | `flags` | `0x03`       | bit `0`: final release; bit `1`: invalidates dependents.             |
| Object Delta Metadata     | `flags` | `0x00000007` | bit `0`: replaces region; bit `1`: compressed; bit `2`: final delta. |
| Cache Reference Metadata  | `flags` | `0x00000003` | bit `0`: lease required; bit `1`: body fallback present.             |
