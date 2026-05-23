# Rust — Core Crate

The `nnrp-core` crate is the canonical Rust source for Preview3 protocol semantics. It contains wire codecs, fixed-layout metadata, enum/error baselines, lifecycle state machines, flow-control validation, cache/schema semantics, recovery validation, and operation state.

It does not contain the networked client/server runtime yet.

## Dependency

```toml
[dependencies]
nnrp-core = "1.0.0-preview.3.1"
```

## Implemented Preview3 Surface

| Area | Status |
|---|---|
| Common header, message types, header flags, protocol version | Implemented |
| Client/server hello, session open/ack/close, migration/probe metadata | Implemented |
| `FRAME_SUBMIT`, `RESULT_PUSH`, `RESULT_DROP`, body regions, object references | Implemented |
| Typed payload descriptors and payload-family boundary | Implemented |
| `FLOW_UPDATE`, result hints, priority, operation states, cancel scopes | Implemented |
| Cache put/ack/invalidate plus lease/version/dependency validation | Implemented |
| Schema/profile registry and token delta schema anchor | Implemented |
| Session-bound recovery and migration resume cursor validation | Implemented |

## Boundary

`nnrp-core` is host-neutral. It validates protocol behavior and exposes reusable state-machine primitives, but it does not open sockets, spawn async tasks, accept clients, or run a submit/result stream.

The usable Rust `NnrpClient` / `NnrpServer` APIs are tracked by the Rust runtime shard and should consume these core types rather than redefining protocol behavior.

## Common Pitfalls

::: warning
1. **Do not treat core lifecycle objects as a network runtime.** They are protocol state machines, not socket pumps.
2. **Do not add SDK-specific retry, cache, or schema semantics outside core.** Downstream SDKs should consume Rust-owned semantics.
3. **Do not change numeric enum/error/message assignments without updating conformance fixtures.**
:::
