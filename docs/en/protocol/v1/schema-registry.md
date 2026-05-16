# NNRP/1 Schema / Profile Registry

Typed payloads should not grow by endlessly appending new public enums. The registry separates "what the public layer freezes" from "how specific payloads extend the protocol".

## The problem without a registry vs the structure with one

Without a registry, every new payload family forces changes to the public layer:

```mermaid
flowchart LR
  subgraph Without["Without Registry (prone to drift)"]
    P1["tensor"] -->|hard-coded| CE["public layer enum\ngrows unboundedly"]
    P2["token"] -->|hard-coded| CE
    P3["new family\nrequires version bump"] -->|modifies public header| CE
  end
```

With a registry, the public layer is frozen and new payload families plug in through the registry:

```mermaid
flowchart LR
  subgraph With["With Registry (current contract)"]
    CL["Public layer\nconnection/session/flow/errors"] --> REG["Registry\nmanages profile identity\nand schema versions"]
    REG --> T["tensor profile\n(standard)"]
    REG --> TK["token profile\n(standard)"]
    REG --> SE["structured_event\n(future extensible)"]
    REG --> TD["tool_delta\n(future extensible)"]
  end
```

## Where the registry appears in the protocol exchange

```mermaid
sequenceDiagram
  participant H as Host
  participant R as Runtime

  H->>R: CLIENT_HELLO(supported_profiles=[tensor, token])
  R-->>H: SERVER_HELLO_ACK(accepted_profiles=[tensor, token])

  note over H,R: declare profile when opening a session
  H->>R: SESSION_OPEN(profile=tensor, schema_hint=v2)
  R-->>H: SESSION_OPEN_ACK(active_schema_id=X, active_schema_version=2)

  note over H,R: pre-install large schema into the cache for reuse
  H->>R: CACHE_PUT(object_kind=schema, schema_id=X, schema_version=2, body=...)
  R-->>H: CACHE_ACK(ready=true)

  note over H,R: hot path — descriptor references the installed schema
  H->>R: FRAME_SUBMIT(schema_ref=X:v2, payload_body=...)
  R-->>H: RESULT_PUSH(schema_ref=X:v2, result_body=...)

  note over H,R: schema version upgrade
  H->>R: CACHE_PUT(schema_id=X, schema_version=3, body=...)
  R-->>H: CACHE_ACK(ready=true)
  R-->>H: CACHE_INVALIDATE(schema_id=X, schema_version=2, reason=superseded)
```

## Public layer vs Registry responsibilities

| Public layer (shared by all profiles) | Registry / Profile private |
|---|---|
| connection / session / operation semantics | Profile logical identity and version |
| Flow control, budget, priority, error boundaries | How descriptor fields are interpreted |
| Cache / lease lifecycle for schema objects | Payload body format |
| schema_mismatch / schema_miss error types | Business-specific parameters and tool call bodies |

## Best practices

**Pre-install large schemas**: Schema definitions larger than a few hundred bytes should be pre-installed via `CACHE_PUT` at session start rather than inlined with every frame. Install once; all subsequent frames use `schema_ref`.

**Keep version identifiers stable**: `schema_id + schema_version` is the logical identity. `schema_hash` is only a consistency check. Do not use hash as identity — different receivers may compute different hashes for the same schema, causing false mismatch errors.

**Record the negotiated result**: The `active_schema_id` and `active_schema_version` fields in `SESSION_OPEN_ACK` are the ground truth for the current session's schema. Record them on the host side. When a mismatch occurs, check against this record before retrying.

**Install before switching**: Before the current schema is invalidated, pre-install the new version with `CACHE_PUT` and wait for `CACHE_ACK(ready=true)` before switching references in subsequent frames. This avoids a window where the old schema is gone but the new one is not yet ready.

**Extend with the registry, not the public header**: To support a new payload family, use the profile/schema registry extension path rather than adding constants to the public enum. Implementations that do not support the new family can then safely skip it rather than failing with a parse error.

## Boundaries with other pages

1. Fixed layout of the descriptor itself — see "Typed Payload Descriptors".
2. tensor / token specific field definitions — see the standard profile pages.
3. How cache and leases work — see the previous page "Cache Capabilities and Leases".
4. Expressing backpressure and priority across multiple sessions — see the next page "Flow Control and Priority".