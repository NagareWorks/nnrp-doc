# Rust — Core Types

`nnrp-core` is the canonical Rust source for NNRP/1 Preview4 protocol semantics. It owns wire
constants, fixed-layout metadata, profile registries, runtime-control frames, object/cache metadata,
validation, and reusable lifecycle state machines.

## Dependency

```toml
[dependencies]
nnrp-core = "1.0.0-preview.4.0"
```

## Boundary

`nnrp-core` does not open sockets or spawn async tasks. It defines and validates the protocol model
that `nnrp-runtime`, transport providers, FFI bindings, WASM helpers, and conformance suites reuse.

## Main Type Families

| Family | Examples | Used by |
|---|---|---|
| Protocol header and message ids | common header, message type, header flags, protocol version | all wire codecs |
| Session lifecycle | `SessionOpenMetadata`, `SessionCloseMetadata`, patch/migrate metadata | client/server runtime |
| Submit/result | `FrameSubmitMetadata`, `ResultPushMetadata`, result-drop metadata | request/result flow |
| Flow and scheduling | credit, backpressure, priority, deadline, expire-at metadata | runtime control |
| Runtime control | cancel/abort, progress, partial result, capability, route hint, trace context | Preview4 control profiles |
| Runtime object | object declare/ref/release/delta metadata | heavy transport and orchestration paths |
| Cache reference | cache reference/miss/invalidate metadata | cache-aware profiles and runtimes |
| Registry | profile ids, schema ids, payload families, object kinds | conformance and SDK validation |

## `FrameSubmitMetadata`

| Field Group | Description |
|---|---|
| Profile and schema | Selects which standard or application profile interprets the body. |
| Operation identity | Correlates submit, result, cancellation, and runtime feedback. |
| Priority and deadline | Provides scheduling hints without forcing JSON/protobuf control envelopes. |
| Object/cache hints | Allows transports and runtimes to coordinate large payload references. |

## `ResultPushMetadata`

| Field Group | Description |
|---|---|
| Correlation | Ties result bytes back to a submitted frame. |
| Status and timing | Carries completion state and timing hints. |
| Payload interpretation | Points to the profile/schema used for the result body. |

## Runtime-Control Metadata

The Rust metadata names mirror the wire profiles documented under
[Runtime Control Profiles](/en/profiles/runtime-control/).

| Control family | Purpose |
|---|---|
| Cancel / abort | Stop expired or obsolete work. |
| Priority / deadline / expire-at | Update scheduler decisions after submit. |
| Progress / partial result | Stream meaningful intermediate output. |
| Backpressure / credit | Coordinate producer and consumer pressure. |
| Capability / route hint | Exchange costs, preferences, limits, and execution hints. |
| Trace context / result-drop reason | Make end-to-end timing and dropped work explainable. |

## Object And Cache Metadata

| Family | Purpose |
|---|---|
| Object declare | Introduces a runtime object with kind, size, version, and lifetime hints. |
| Object ref | Refers to an existing object instead of resending bytes. |
| Object release | Releases ownership or lease state. |
| Object delta | Sends compact updates for an existing object. |
| Cache reference | Reports a reusable cached object. |
| Cache miss | Reports that a requested cache key is unavailable. |
| Cache invalidate | Invalidates stale object/cache state. |

## Common Pitfalls

::: warning
1. Do not reassign numeric message, profile, schema, object-kind, or error values in SDK-local code.
2. Do not put transport behavior in `nnrp-core`; use `nnrp-runtime` and provider crates.
3. Do not tunnel Preview4 control semantics through ad hoc JSON when a compact control frame already exists.
:::
