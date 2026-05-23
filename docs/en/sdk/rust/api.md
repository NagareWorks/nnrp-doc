# Rust — Frozen API

The Rust SDK (`nnrp-rs`) workspace contains three crates. Preview3 currently has the protocol core, conformance fixtures, and a stable FFI ABI surface. The usable client/server runtime is still tracked as follow-up work.

| Group | Crate | Description | Status |
|---|---|---|---|
| [Core Types](./api/core) | `nnrp-core` | Wire codecs, validation, lifecycle, cache/schema, recovery, conformance baseline | ✅ Preview3 core implemented |
| [FFI / Native](./api/ffi) | `nnrp-ffi` | Value handles, buffer views, callback/polling events, error families | ✅ ABI surface implemented |
| [Client (Preview3)](./api/client) | runtime crate / `nnrp-core` consumer | Async client API | 🚧 Runtime not implemented |
| [Server (Preview3)](./api/server) | runtime crate / `nnrp-core` consumer | Async server API | 🚧 Runtime not implemented |
| [WASM Exports (Preview3)](./api/wasm) | `nnrp-ffi` | WebAssembly export interface | 🚧 Planned |

## Workspace Info

| Property | Value |
|---|---|
| Workspace | `nnrp-rs` |
| Version | `1.0.0-preview.2` |
| Min Rust | `1.82` |
| Core dep | `thiserror = "2.0"` |

```toml
[dependencies]
nnrp-core = "1.0.0-preview.2"

# FFI integration (C#/Python callers)
nnrp-ffi = "1.0.0-preview.2"
```

## Current Boundary

The current FFI functions are ABI and lifecycle primitives. They are not a networked client/server runtime yet. Real `connect`, `listen`, `accept`, session pumps, submit/result streams, and runtime-backed FFI entrypoints are the next Rust SDK milestone.

## Rust-specific expectations

1. Ownership and borrowing rules must be reflected clearly in public types.
2. Async stream or channel-based receive flow should stay explicit.
3. Public crates, feature flags, and result types should remain stable during the Preview3 integration window.
