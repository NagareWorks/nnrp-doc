# Runtime Control Profiles (Preview4 Baseline)

This page tracks the preview4 protocol baseline that moves NNRP beyond a token-only profile. The
capability tokens, frame-family names, runner modes, transport enums, and target-manifest fields
below are the frozen surface for SDK bring-up; later canonical vectors add byte examples and
interoperability assertions.

## Profile families

| Profile | Scope | Primary users |
| --- | --- | --- |
| `runtime.control` | Cancellation, priority, deadlines, progress, backpressure, trace, and result drop diagnostics. | All runtimes that schedule work across a session. |
| `runtime.object` | Object declaration, references, deltas, releases, lifetime, cost, and ownership. | Heavy artifact, tensor, image, and multimodal pipelines. |
| `coding.agent` | Subagent dispatch, tool-call artifacts, route hints, execution hints, and cancellation policy. | AI coding agents and local subagent orchestration. |
| `multimodal.artifact` | Typed image, audio, video, document, and tool artifacts with partial result streams. | Multimodal tools and assistant runtimes. |
| `render.runtime` | Frame deadlines, partial region results, supersession, trace stages, and drop reasons. | Neural rendering and interactive runtime services. |
| `cache.reference` | Cache references, cache misses, invalidation, and optional lease metadata. | Workloads with measured reuse. |

## Control frame catalog

| Capability token | Frame family | Required behavior |
| --- | --- | --- |
| `control.cancel_abort` | `CANCEL`, `ABORT` | Stop work by operation ID and report whether termination was cooperative or forced. |
| `control.supersede` | `SUPERSEDE` | Link a replacement operation to the superseded operation and mark late results droppable. |
| `control.priority_update` | `PRIORITY_UPDATE` | Update priority after admission without reopening the session. |
| `control.deadline_expire` | `DEADLINE`, `EXPIRE_AT` | Drop or downgrade work that can no longer produce a useful result. |
| `control.progress_partial` | `PROGRESS`, `PARTIAL_RESULT` | Emit progress and partial artifacts before the final result. |
| `control.credit_backpressure` | `BACKPRESSURE`, `CREDIT_UPDATE` | Change send windows and report pressure without out-of-band throttling. |
| `control.capability_costs` | `CAPABILITY_NEGOTIATION` | Declare support together with costs, preferences, limits, and downgrade behavior. |
| `control.route_execution_hint` | `ROUTE_HINT`, `EXECUTION_HINT` | Carry scheduler hints without requiring JSON/protobuf wrappers. |
| `control.cache_reference` | `CACHE_REFERENCE`, `CACHE_MISS`, `CACHE_INVALIDATE` | Use cache references only when the profile can define identity and invalidation. |
| `control.trace_context` | `TRACE_CONTEXT` | Propagate correlation IDs and stage timing across frames. |
| `control.result_drop_reason` | `RESULT_DROP_REASON` | Explain dropped work with machine-readable reasons. |
| `control.degrade_profile` | `DEGRADE_PROFILE` | Negotiate a cheaper or more compatible profile when the preferred path is unavailable. |
| `control.budget_update` | `BUDGET_UPDATE` | Update compute, token, memory, or bandwidth budgets during a session. |
| `control.retry_after` | `ERROR_RECOVERABLE`, `RETRY_AFTER` | Distinguish retryable pressure from terminal protocol failure. |

## Runtime object catalog

| Capability token | Frame family | Required behavior |
| --- | --- | --- |
| `object.lifecycle` | `OBJECT_DECLARE`, `OBJECT_REF`, `OBJECT_RELEASE` | Name runtime objects, reference them in operations, and release them explicitly. |
| `object.delta` | `OBJECT_PATCH`, `OBJECT_DELTA` | Send changed regions or state deltas without resending the full object. |
| `object.cost` | object metadata | Declare size, compute cost, preferred storage, and lifetime hints. |
| `object.ownership` | object metadata | Declare whether the producer, consumer, or session owns release responsibility. |

## Conformance impact

Preview4 wire-level conformance must test these profiles by exchanging frames directly. Adapter
declarations remain useful, but they are not enough to prove that client/server semantics match when
different SDKs communicate over the wire.
