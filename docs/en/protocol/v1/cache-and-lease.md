# NNRP/1 Cache Capabilities and Leases

Caching is not a private runtime optimization trick. It is a public capability boundary that the protocol needs to describe explicitly.

## Where this fits in the protocol stack

```mermaid
flowchart LR
  subgraph Connection
    HELLO["CLIENT_HELLO / SERVER_HELLO_ACK\ndeclare cache capability limits"]
  end
  subgraph Session
    SOPEN["SESSION_OPEN / SESSION_OPEN_ACK\ndeclare lease TTL expectations"]
  end
  subgraph ControlPlane["Control Plane"]
    CPUT["CACHE_PUT\ninstall a long-lived object"]
    CACK["CACHE_ACK\nconfirm or reject"]
    CINV["CACHE_INVALIDATE\nevict the object"]
  end
  subgraph HotPath["Hot Path"]
    FS["FRAME_SUBMIT\ninline block or object reference"]
    RP["RESULT_PUSH\nresult may reference cached object"]
  end

  HELLO --> SOPEN --> CPUT --> CACK
  CPUT --> CINV
  SOPEN --> FS --> RP
```

During the handshake both sides negotiate a cache capability ceiling. When the session opens the host declares lease expectations. Long-lived objects are then installed via the control plane. Hot-path frames reference them by key instead of retransmitting the body.

## Canonical cache identity

NNRP/1 uses one cache identity in every control-plane and hot-path representation:

```text
(cache_namespace: u32, cache_key_hi: u64, cache_key_lo: u64)
```

The two key words form one opaque 128-bit value. Implementations must not truncate either word or derive a second, transport-local key. A namespace scopes allocation and bulk invalidation; it remains part of the identity even when the key is globally unique.

`CACHE_INVALIDATE` applies its fields as follows:

| Scope | Required identity fields | Fields that must be zero |
| --- | --- | --- |
| `whole_session` | None | `cache_namespace`, `cache_key_hi`, `cache_key_lo` |
| `namespace` | `cache_namespace` | `cache_key_hi`, `cache_key_lo` |
| `object_kind` | `cache_namespace`; `cache_key_hi` carries the `u32` object-kind code in its low 32 bits | High 32 bits of `cache_key_hi`, all of `cache_key_lo` |
| `object_key` | Full cache identity | None |

## Cache wire metadata

All integer fields are little-endian. Reserved fields must be zero when sent and rejected when nonzero.

### Object Reference Block

This 24-byte block appears in the hot-path object-reference region.

| Offset | Field | Type | Meaning |
| --- | --- | --- | --- |
| `0` | `object_kind` | `u16` | Cached object kind. |
| `2` | `ref_flags` | `u16` | Reference flags. |
| `4` | `cache_namespace` | `u32` | Cache namespace. |
| `8` | `cache_key_hi` | `u64` | High 64 bits of cache key. |
| `16` | `cache_key_lo` | `u64` | Low 64 bits of cache key. |

### Cache Put Metadata

| Offset | Field | Type | Meaning |
| --- | --- | --- | --- |
| `0` | `cache_namespace` | `u32` | Cache namespace. |
| `4` | `object_kind` | `u32` | Cached object kind. |
| `8` | `cache_key_hi` | `u64` | High 64 bits of cache key. |
| `16` | `cache_key_lo` | `u64` | Low 64 bits of cache key. |
| `24` | `ttl_ms` | `u32` | Requested lease TTL. |
| `28` | `object_bytes` | `u32` | Object body length. |
| `32` | `codec_bitmap` | `u32` | Permitted object codecs. |
| `36` | `flags` | `u32` | Put and renewal flags. |

### Cache Ack Metadata

| Offset | Field | Type | Meaning |
| --- | --- | --- | --- |
| `0` | `cache_namespace` | `u32` | Cache namespace. |
| `4` | `status` | `u32` | Acceptance status. |
| `8` | `cache_key_hi` | `u64` | High 64 bits of cache key. |
| `16` | `cache_key_lo` | `u64` | Low 64 bits of cache key. |
| `24` | `accepted_ttl_ms` | `u32` | Granted lease TTL. |
| `28` | `max_object_bytes` | `u32` | Receiver object-size ceiling. |
| `32` | `detail_code` | `u32` | Status detail. |
| `36` | `reserved` | `u32` | Must be zero. |

### Cache Invalidate Metadata

| Offset | Field | Type | Meaning |
| --- | --- | --- | --- |
| `0` | `invalidate_scope` | `u32` | Invalidation scope. |
| `4` | `cache_namespace` | `u32` | Namespace selector. |
| `8` | `cache_key_hi` | `u64` | High 64 bits of key or object-kind selector. |
| `16` | `cache_key_lo` | `u64` | Low 64 bits of key. |
| `24` | `reason_code` | `u32` | Invalidation reason. |
| `28` | `reserved` | `u32` | Must be zero. |

## Object lifecycle sequence

This shows a long-lived object going from installation to active reference and then expiry:

```mermaid
sequenceDiagram
  participant H as Host
  participant R as Runtime

  H->>R: CACHE_PUT(object_kind, namespace, key, body, lease_ttl_ms)
  R-->>H: CACHE_ACK(key, ready=true, actual_ttl_ms)

  note over H,R: hot-path reuse
  H->>R: FRAME_SUBMIT(..., object_ref_mask set)
  R-->>H: RESULT_PUSH(..., same object referenced)

  note over H,R: approaching expiry — host renews proactively
  H->>R: CACHE_PUT(same key, renew=true)
  R-->>H: CACHE_ACK(renewed, new_ttl_ms)

  note over H,R: object evicted or replaced
  R-->>H: CACHE_INVALIDATE(key, reason=evicted)
  note over H: fall back to inline block on next submit
```

## Why leases are necessary

"Can be cached" is not enough. An object pool without expiry creates three problems:

- The server cannot safely reclaim memory even when objects have not been used for a long time.
- The host does not know which objects are still valid and must worry about cache miss on every submit.
- When a model is updated or the context switches, stale objects have no clear decommission path.

Leases give every object a visible TTL and a renewal path so that both sides can act on protocol events rather than guessing from timeouts.

## What the public layer freezes vs what belongs to profiles

| Public layer (shared by all profiles) | Profile / Runtime private |
|---|---|
| Lease contract (TTL, renewal, expiry policy) | Object body byte layout |
| Object identity (kind, namespace, version) | KV-cache page encoding |
| Dependency relation semantics | GPU memory page layout |
| cache_miss / lease_expired / dependency_invalid errors | Model-private index structures |

## Best practices

**When to install**: Only put objects in the cache if they will actually be referenced multiple times. Single-use small blocks should be inlined. As a rule of thumb, objects larger than 1 KB that will be reused more than twice in the same session are worth caching.

**Choosing TTL**: Set `lease_ttl_hint_ms` to 20–30 % shorter than the expected session duration. If the session is expected to last 60 seconds, set TTL to 40 seconds and renew proactively while the object is still in use rather than reinstalling it after expiry.

**Handling invalidation**: When you receive `CACHE_INVALIDATE`, immediately mark the local reference invalid and switch back to an inline block on the next submit. Never assume the same key is still live.

**Version management**: When object content changes, use a new `cache_key` instead of overwriting the old one. This prevents the server and host from disagreeing about which version of content a key currently refers to.

**Observability**: Record `actual_ttl_ms` from every `CACHE_ACK`, the reason field from every `CACHE_INVALIDATE`, and the hit/miss ratio. These are the only stable signals for evaluating whether your caching strategy is working.

## Boundaries with other pages

1. Responsibility boundaries for connection, session, and operation — see "Session and Operation Model".
2. Fixed layout of descriptors and payloads — see "Typed Payload Descriptors" and the profile pages.
3. How schema becomes the standard extension mechanism — see the next page, "Schema / Profile Registry".
