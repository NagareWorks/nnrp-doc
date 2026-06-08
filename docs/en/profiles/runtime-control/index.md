---
prev:
  text: Token Payload Frame
  link: /en/profiles/token/payload-frame/
next:
  text: Runtime Control Value Registries
  link: /en/profiles/runtime-control/value-registries/
---

# Runtime Control Profiles

Runtime control profiles are standard NNRP profiles. They define compact control-plane frames and
runtime-object references for cancellation, priority, deadlines, partial results, backpressure,
cache references, route hints, and trace context without wrapping those signals in JSON or another
application protocol.

These profiles are part of the standard profile registry, alongside `tensor` and `token`.
Implementations must not treat them as private extension names.

## Reading Path

1. Start with [Value Registries](./value-registries) for frozen codes, roles, object kinds, cache
   scopes, and flag masks.
2. Continue with [Control Frame Metadata](./control-frames) for cancellation, scheduling,
   backpressure, route hints, trace context, and drop reasons.
3. Finish with [Object and Cache Metadata](./object-cache-frames) for runtime object declarations,
   object references, object deltas, releases, and cache references.

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

| Code   | Frame                    | Direction        | Profile           | Fixed metadata                                                                 |
| ------ | ------------------------ | ---------------- | ----------------- | ------------------------------------------------------------------------------ |
| `0x30` | `CANCEL`                 | C -> S or S -> C | `runtime.control` | [Control Request Metadata](./control-frames#control-request-metadata)          |
| `0x31` | `ABORT`                  | C -> S or S -> C | `runtime.control` | [Control Request Metadata](./control-frames#control-request-metadata)          |
| `0x32` | `PRIORITY_UPDATE`        | C -> S or S -> C | `runtime.control` | [Scheduling Metadata](./control-frames#scheduling-metadata)                    |
| `0x33` | `DEADLINE`               | C -> S or S -> C | `runtime.control` | [Scheduling Metadata](./control-frames#scheduling-metadata)                    |
| `0x34` | `EXPIRE_AT`              | C -> S or S -> C | `runtime.control` | [Scheduling Metadata](./control-frames#scheduling-metadata)                    |
| `0x35` | `SUPERSEDE`              | C -> S or S -> C | `runtime.control` | [Supersede Metadata](./control-frames#supersede-metadata)                      |
| `0x36` | `BUDGET_UPDATE`          | C -> S or S -> C | `runtime.control` | [Budget Metadata](./control-frames#budget-metadata)                            |
| `0x37` | `PROGRESS`               | S -> C or C -> S | `runtime.control` | [Progress Metadata](./control-frames#progress-metadata)                        |
| `0x38` | `PARTIAL_RESULT`         | S -> C or C -> S | `runtime.control` | [Partial Result Metadata](./control-frames#partial-result-metadata)            |
| `0x39` | `BACKPRESSURE`           | C -> S or S -> C | `runtime.control` | [Pressure Metadata](./control-frames#pressure-metadata)                        |
| `0x3A` | `CREDIT_UPDATE`          | C -> S or S -> C | `runtime.control` | [Pressure Metadata](./control-frames#pressure-metadata)                        |
| `0x3B` | `CAPABILITY_NEGOTIATION` | C -> S or S -> C | `runtime.control` | [Capability Metadata](./control-frames#capability-metadata)                    |
| `0x3C` | `DEGRADE_PROFILE`        | C -> S or S -> C | `runtime.control` | [Capability Metadata](./control-frames#capability-metadata)                    |
| `0x3D` | `ROUTE_HINT`             | C -> S or S -> C | `runtime.control` | [Route Hint Metadata](./control-frames#route-hint-metadata)                    |
| `0x3E` | `EXECUTION_HINT`         | C -> S or S -> C | `runtime.control` | [Route Hint Metadata](./control-frames#route-hint-metadata)                    |
| `0x3F` | `TRACE_CONTEXT`          | C -> S or S -> C | `runtime.control` | [Trace Context Metadata](./control-frames#trace-context-metadata)              |
| `0x40` | `RESULT_DROP_REASON`     | C -> S or S -> C | `runtime.control` | [Result Drop Metadata](./control-frames#result-drop-metadata)                  |
| `0x41` | `OBJECT_DECLARE`         | C -> S or S -> C | `runtime.object`  | [Object Descriptor Metadata](./object-cache-frames#object-descriptor-metadata) |
| `0x42` | `OBJECT_REF`             | C -> S or S -> C | `runtime.object`  | [Object Reference Metadata](./object-cache-frames#object-reference-metadata)   |
| `0x43` | `OBJECT_RELEASE`         | C -> S or S -> C | `runtime.object`  | [Object Release Metadata](./object-cache-frames#object-release-metadata)       |
| `0x44` | `OBJECT_PATCH`           | C -> S or S -> C | `runtime.object`  | [Object Delta Metadata](./object-cache-frames#object-delta-metadata)           |
| `0x45` | `OBJECT_DELTA`           | C -> S or S -> C | `runtime.object`  | [Object Delta Metadata](./object-cache-frames#object-delta-metadata)           |
| `0x46` | `CACHE_REFERENCE`        | C -> S or S -> C | `cache.reference` | [Cache Reference Metadata](./object-cache-frames#cache-reference-metadata)     |
| `0x47` | `CACHE_MISS`             | C -> S or S -> C | `cache.reference` | [Cache Miss Metadata](./object-cache-frames#cache-miss-metadata)               |
| `0x48` | `ERROR_RECOVERABLE`      | C -> S or S -> C | `runtime.control` | [Recoverable Error Metadata](./control-frames#recoverable-error-metadata)      |
| `0x49` | `RETRY_AFTER`            | C -> S or S -> C | `runtime.control` | [Retry After Metadata](./control-frames#retry-after-metadata)                  |

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
| `control.recoverable_error`    | `ERROR_RECOVERABLE`, `RETRY_AFTER`                  |
| `object.lifecycle`             | `OBJECT_DECLARE`, `OBJECT_REF`, `OBJECT_RELEASE`    |
| `object.delta`                 | `OBJECT_PATCH`, `OBJECT_DELTA`                      |
| `object.cost`                  | Object descriptor cost fields                       |
| `object.ownership`             | Object descriptor ownership fields                  |
| `cache.reference`              | `CACHE_REFERENCE`, `CACHE_MISS`, `CACHE_INVALIDATE` |
