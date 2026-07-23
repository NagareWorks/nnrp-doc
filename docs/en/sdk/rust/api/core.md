# Rust — Core Types

`nnrp-core` is the canonical Rust source for NNRP/1 Preview4 protocol semantics. It owns wire
constants, fixed-layout metadata, profile registries, runtime-control frames, object/cache metadata,
validation, and reusable lifecycle state machines.

## Dependency

```toml
[dependencies]
nnrp-core = "1.0.0-preview.4.4"
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
| Operation identity | `operation_id: u64` is non-zero and independent from the common-header `frame_id: u32`. |
| Priority and deadline | Provides scheduling hints without forcing JSON/protobuf control envelopes. |
| Object/cache hints | Allows transports and runtimes to coordinate large payload references. |

The canonical 72-byte offsets are frozen in
[Data Plane and Operation Identity](/en/protocol/v1/data-plane). Rust must encode
`tile_index_bytes` at offset 32 and `operation_id` at offset 40.

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

Every Rust cache type uses the same `CacheObjectId` identity:

```rust
pub struct CacheObjectId {
    pub cache_namespace: u32,
    pub cache_key_hi: u64,
    pub cache_key_lo: u64,
    pub object_kind: CacheObjectKind,
}
```

`CachePutMetadata`, `CacheAckMetadata`, `CacheInvalidateMetadata`, `CacheReferenceMetadata`,
`CacheMissMetadata`, and `ObjectReferenceBlock` expose the same `cache_namespace: u32`,
`cache_key_hi: u64`, and `cache_key_lo: u64` fields. The fixed layouts are frozen in
[Cache Capabilities and Leases](/en/protocol/v1/cache-and-lease) and
[Runtime Object and Cache Metadata](/en/profiles/runtime-control/object-cache-frames).

### `CacheLease`

`CacheLease` is the validated local lease value. It is not a wire payload or an FFI handle.

| Rust field | Type | Protocol field |
|---|---|---|
| `object_id` | `CacheObjectId` | `object_id` |
| `object_version` | `u64` | `object_version` |
| `lease_id` | `u64` | `lease_id` |
| `owner_scope` | `CacheLeaseOwnerScope` | `owner_scope` |
| `owner_id` | `u64` | `owner_id` |
| `granted_at_ms` | `u64` | `granted_at_ms` |
| `ttl_ms` | `u32` | `ttl_ms` |

`CacheLeaseOwnerScope` is `Connection = 0`, `Session = 1`, or `Operation = 2`.
Use `expires_at_ms`, `validate_live_at`, and `validate_version` instead of duplicating lease arithmetic in an application.

## Common Pitfalls

::: warning
1. Do not reassign numeric message, profile, schema, object-kind, or error values in SDK-local code.
2. Do not put transport behavior in `nnrp-core`; use `nnrp-runtime` and provider crates.
3. Do not tunnel Preview4 control semantics through ad hoc JSON when a compact control frame already exists.
:::
