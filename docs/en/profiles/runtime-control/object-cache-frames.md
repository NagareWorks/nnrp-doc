---
prev:
  text: Runtime Control Frame Metadata
  link: /en/profiles/runtime-control/control-frames/
next:
  text: SDKs
  link: /en/sdk/
---

# Runtime Object and Cache Metadata

This page defines fixed metadata for `runtime.object` and `cache.reference` frames. Multi-value
fields use the [Runtime Control Value Registries](./value-registries).

## Object Descriptor Metadata

Used by `OBJECT_DECLARE`.

| Offset | Field                  | Type  | Required | Meaning                                             |
| ------ | ---------------------- | ----- | -------- | --------------------------------------------------- |
| `0`    | `object_id`            | `u64` | Yes      | Runtime object identity.                            |
| `8`    | `object_kind`          | `u16` | Yes      | See `object_kind` in the value registries.          |
| `10`   | `producer_role`        | `u8`  | Yes      | See role codes in the value registries.             |
| `11`   | `consumer_role`        | `u8`  | Yes      | See role codes in the value registries.             |
| `12`   | `session_id`           | `u32` | Yes      | Owning session.                                     |
| `16`   | `byte_size`            | `u64` | Yes      | Object size.                                        |
| `24`   | `compute_cost_units`   | `u32` | No       | Compute units under the negotiated cost model.      |
| `28`   | `memory_location_hint` | `u16` | No       | See `memory_location_hint` in the value registries. |
| `30`   | `ownership_hint`       | `u16` | Yes      | See `ownership_hint` in the value registries.       |
| `32`   | `lifetime_hint_ms`     | `u32` | No       | Suggested lifetime.                                 |
| `36`   | `metadata_bytes`       | `u32` | No       | Optional object metadata body length.               |
| `40`   | `reserved`             | `u64` | Yes      | Must be zero.                                       |

## Object Reference Metadata

Used by `OBJECT_REF`.

| Offset | Field            | Type  | Required | Meaning                                  |
| ------ | ---------------- | ----- | -------- | ---------------------------------------- |
| `0`    | `object_id`      | `u64` | Yes      | Referenced object.                       |
| `8`    | `operation_id`   | `u64` | No       | Operation using the object.              |
| `16`   | `object_version` | `u64` | No       | Version or generation.                   |
| `24`   | `offset`         | `u64` | No       | Referenced byte or region offset.        |
| `32`   | `length`         | `u64` | No       | Referenced byte or region length.        |
| `40`   | `flags`          | `u32` | Yes      | See flag masks in the value registries.  |
| `44`   | `metadata_bytes` | `u32` | No       | Optional reference metadata body length. |

## Object Release Metadata

Used by `OBJECT_RELEASE`.

| Offset | Field              | Type  | Required | Meaning                                       |
| ------ | ------------------ | ----- | -------- | --------------------------------------------- |
| `0`    | `object_id`        | `u64` | Yes      | Released object.                              |
| `8`    | `operation_id`     | `u64` | No       | Operation that no longer needs the object.    |
| `16`   | `release_reason`   | `u16` | Yes      | See `release_reason` in the value registries. |
| `18`   | `source_role`      | `u8`  | Yes      | See role codes in the value registries.       |
| `19`   | `flags`            | `u8`  | Yes      | See flag masks in the value registries.       |
| `20`   | `diagnostic_bytes` | `u32` | No       | Optional diagnostic body length.              |
| `24`   | `reserved`         | `u64` | Yes      | Must be zero.                                 |

## Object Delta Metadata

Used by `OBJECT_PATCH` and `OBJECT_DELTA`.

| Offset | Field            | Type  | Required | Meaning                                  |
| ------ | ---------------- | ----- | -------- | ---------------------------------------- |
| `0`    | `object_id`      | `u64` | Yes      | Patched object.                          |
| `8`    | `delta_sequence` | `u64` | Yes      | Monotonic delta sequence for the object. |
| `16`   | `region_offset`  | `u64` | No       | Region offset.                           |
| `24`   | `region_bytes`   | `u32` | No       | Region length.                           |
| `28`   | `delta_bytes`    | `u32` | Yes      | Delta payload length.                    |
| `32`   | `flags`          | `u32` | Yes      | See flag masks in the value registries.  |
| `36`   | `metadata_bytes` | `u32` | No       | Optional delta metadata body length.     |

## Cache Reference Metadata

Used by `CACHE_REFERENCE`.

| Offset | Field                | Type  | Required | Meaning                                    |
| ------ | -------------------- | ----- | -------- | ------------------------------------------ |
| `0`    | `cache_namespace`    | `u32` | Yes      | Namespace of the canonical cache identity. |
| `4`    | `profile_id`         | `u16` | Yes      | Profile that defines interpretation.       |
| `6`    | `reuse_scope`        | `u16` | Yes      | See `reuse_scope` in the value registries. |
| `8`    | `cache_key_hi`       | `u64` | Yes      | High 64 bits of cache identity.            |
| `16`   | `cache_key_lo`       | `u64` | Yes      | Low 64 bits of cache identity.             |
| `24`   | `lease_id`           | `u64` | No       | Lease anchor.                              |
| `32`   | `producer_trace_id`  | `u64` | No       | Trace ID of producer.                      |
| `40`   | `expiration_hint_ms` | `u32` | No       | Expiration hint.                           |
| `44`   | `metadata_bytes`     | `u32` | No       | Optional metadata body length.             |
| `48`   | `flags`              | `u32` | Yes      | See flag masks in the value registries.    |
| `52`   | `reserved`           | `u32` | Yes      | Must be zero.                              |

## Cache Miss Metadata

Used by `CACHE_MISS`.

| Offset | Field              | Type  | Required | Meaning                                    |
| ------ | ------------------ | ----- | -------- | ------------------------------------------ |
| `0`    | `cache_namespace`  | `u32` | Yes      | Namespace of the canonical cache identity. |
| `4`    | `profile_id`       | `u16` | No       | Profile that rejected interpretation.      |
| `6`    | `miss_reason`      | `u16` | Yes      | See `miss_reason` in the value registries. |
| `8`    | `cache_key_hi`     | `u64` | Yes      | High 64 bits of cache identity.            |
| `16`   | `cache_key_lo`     | `u64` | Yes      | Low 64 bits of cache identity.             |
| `24`   | `diagnostic_bytes` | `u32` | No       | Optional diagnostic body length.           |
| `28`   | `reserved`         | `u32` | Yes      | Must be zero.                              |

## Local SDK Cache Policy Contract

SDKs expose a local `CachePolicyOptions` value so applications must opt into cache reuse explicitly.
This value is not a wire payload, is never serialized automatically, and does not perform an implicit
lookup. Applications and profiles remain responsible for emitting `CACHE_REFERENCE`, `CACHE_MISS`,
and `CACHE_INVALIDATE` frames.

| Semantic field | Type | Default | Validation |
| --- | --- | --- | --- |
| `enabled` | `bool` | `false` | When `true`, `reuse_scope` is required. |
| `reuse_scope` | optional `CacheReuseScope` | none | Must be absent when `enabled` is `false`. |
| `expiration_hint_ms` | `u64` | `0` | Must be zero when `enabled` is `false`; SDKs narrow explicitly when writing a `u32` wire hint. |
| `invalidation_reason` | `CachePolicyInvalidationReason` | `explicit` | Local reason propagated only when the application emits an invalidation. |

`CachePolicyInvalidationReason` has the frozen semantic members `explicit`, `dependency_invalidated`,
`lease_expired`, `version_mismatch`, and `schema_mismatch`. Language bindings use their conventional
casing but must preserve these meanings. Disabled policy values must not carry a reuse scope or a
non-zero expiration hint.

## Conformance Requirement

Wire-level conformance must exercise these profiles by exchanging NNRP frames directly. SDK adapter
manifests can help generate scenarios, but they do not replace direct client/server wire checks.
