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
| `0`    | `cache_key_hi`       | `u64` | Yes      | High 64 bits of cache identity.            |
| `8`    | `cache_key_lo`       | `u64` | Yes      | Low 64 bits of cache identity.             |
| `16`   | `profile_id`         | `u16` | Yes      | Profile that defines interpretation.       |
| `18`   | `reuse_scope`        | `u16` | Yes      | See `reuse_scope` in the value registries. |
| `20`   | `lease_id`           | `u64` | No       | Lease anchor.                              |
| `28`   | `producer_trace_id`  | `u64` | No       | Trace ID of producer.                      |
| `36`   | `expiration_hint_ms` | `u32` | No       | Expiration hint.                           |
| `40`   | `metadata_bytes`     | `u32` | No       | Optional metadata body length.             |
| `44`   | `flags`              | `u32` | Yes      | See flag masks in the value registries.    |

## Cache Miss Metadata

Used by `CACHE_MISS`.

| Offset | Field              | Type  | Required | Meaning                                    |
| ------ | ------------------ | ----- | -------- | ------------------------------------------ |
| `0`    | `cache_key_hi`     | `u64` | Yes      | High 64 bits of cache identity.            |
| `8`    | `cache_key_lo`     | `u64` | Yes      | Low 64 bits of cache identity.             |
| `16`   | `miss_reason`      | `u16` | Yes      | See `miss_reason` in the value registries. |
| `18`   | `profile_id`       | `u16` | No       | Profile that rejected interpretation.      |
| `20`   | `diagnostic_bytes` | `u32` | No       | Optional diagnostic body length.           |
| `24`   | `reserved`         | `u64` | Yes      | Must be zero.                              |

## Conformance Requirement

Wire-level conformance must exercise these profiles by exchanging NNRP frames directly. SDK adapter
manifests can help generate scenarios, but they do not replace direct client/server wire checks.
