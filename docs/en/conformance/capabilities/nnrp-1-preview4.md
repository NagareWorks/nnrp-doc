# nnrp-1-preview4 Capability Catalog

This page corresponds to `nnrp-conformance/protocol/nnrp-1-preview4/`. Preview4 focuses on
runtime orchestration: control frames, runtime objects, cache references, IPC/WebSocket transports,
and wire-level interoperability cases.

Use these tokens only in `conformance/nnrp-1-preview4.capabilities.json`. A token claim means the
implementation accepts the mandatory cases selected by that token and any combination rule listed
below.

## Mandatory control capabilities

| Token | Layer | Status reach | Combination rule | Meaning |
| --- | --- | --- | --- | --- |
| `control.cancel_abort` | L1 | mandatory | Usually with `control.result_drop_reason`, `control.trace_context`. | Cancel or abort an operation by id and emit a typed terminal state. |
| `control.result_drop_reason` | L1 | mandatory / experimental | Used by cancel, deadline, supersede, and late-result flows. | Mark why a result was dropped, including cancelled, aborted, expired, and superseded states. |
| `control.trace_context` | L1 | mandatory | Usually with `control.cancel_abort`, `control.result_drop_reason`. | Preserve end-to-end trace context for segmented timing and diagnosis. |
| `control.priority_update` | L1 | mandatory | Usually with `control.deadline_expire`, `control.result_drop_reason`. | Dynamically update operation priority so schedulers can reorder unfinished work. |
| `control.deadline_expire` | L1 | mandatory | Usually with `control.priority_update`, `control.result_drop_reason`. | Declare task deadlines or expiry times so stale work can be stopped. |
| `control.progress_partial` | L1 | mandatory | Usually with `control.credit_backpressure`. | Return progress and partial results before terminal completion. |
| `control.credit_backpressure` | L1 | mandatory | Usually with `control.progress_partial`. | Signal accepted concurrency and data volume with credit updates and backpressure. |
| `control.capability_costs` | L1 | mandatory | none | Negotiate capability cost, preference, limit, and downgrade metadata. |

## Runtime object and cache capabilities

| Token | Layer | Status reach | Combination rule | Meaning |
| --- | --- | --- | --- | --- |
| `object.lifecycle` | L1 | mandatory | Used with `object.cost`, `object.ownership`, and `object.delta`. | Declare runtime objects, reference them in operations, and release ownership explicitly. |
| `object.cost` | L1 | mandatory | Usually with `object.lifecycle`, `object.ownership`. | Declare compute, memory, bandwidth, or lifetime cost for runtime objects. |
| `object.ownership` | L1 | mandatory | Usually with `object.lifecycle`, `object.cost`. | Fix ownership transfer, release, and invalidation semantics. |
| `object.delta` | L1 | mandatory | Usually with `object.lifecycle`. | Send object patches or deltas without resending the full runtime object. |
| `cache.reference` | L1 | optional | none | Use cache references, misses, and invalidation only where identity is well-defined. |

## Scheduling and degradation capabilities

| Token | Layer | Status reach | Combination rule | Meaning |
| --- | --- | --- | --- | --- |
| `control.route_execution_hint` | L1 | optional | none | Carry route and execution hints for runtime or subagent scheduling without heavy wrappers. |
| `control.degrade_profile` | L1 | optional | Usually with `control.budget_update`. | Negotiate a cheaper execution profile during a session. |
| `control.budget_update` | L1 | optional | Usually with `control.degrade_profile`. | Update compute, token, memory, or bandwidth budgets during a session. |
| `control.supersede` | L1 | experimental | Usually with `control.result_drop_reason`. | Replace obsolete operations while preserving trace continuity and droppable late-result semantics. |
| `control.retry_after` | L1 | experimental | none | Distinguish retryable pressure from terminal failure and carry retry-after timing. |

## Wire-level conformance

Preview4 also ships a separate wire-level target manifest for tests where the runner directly acts
as client, server, or proxy. Those cases are not adapter-local unit tests: they exercise frame order,
terminal states, transport binding, and evidence capture at the protocol boundary.

Use the [manifest generator](../capability-manifest-generator) when you need to create both the
protocol capability manifest and the wire target manifest for a repository.
