# Rust — Frozen API

The Rust SDK (`nnrp-rs`) workspace contains three crates. Currently published public API covers core types and the FFI layer; full client/server API is planned for Preview3.

| Group | Crate | Description | Status |
|---|---|---|---|
| [Core Types](./api/core) | `nnrp-core` | Protocol version, error types | ✅ Frozen |
| [FFI / Native](./api/ffi) | `nnrp-ffi` | C ABI exports, dll/so/wasm build targets | ✅ Frozen (basic) |
| [Client (Preview3)](./api/client) | `nnrp-core` | Async client API | 🚧 Planned |
| [Server (Preview3)](./api/server) | `nnrp-core` | Async server API | 🚧 Planned |
| [WASM Exports (Preview3)](./api/wasm) | `nnrp-ffi` | WebAssembly export interface | 🚧 Planned |

## Workspace Info

| Property | Value |
|---|---|
| Workspace | `nnrp-rs` |
| Version | `0.1.0` |
| Min Rust | `1.82` |
| Only dep | `thiserror = "2.0"` |

```toml
[dependencies]
nnrp-core = "0.1"

# FFI integration (C#/Python callers)
nnrp-ffi = { version = "0.1", features = ["cdylib"] }
```
3. Operation submission, stream receive, and cancellation.
4. Cache and schema lifecycle operations.
5. Stable error enums and shutdown semantics.

## Rust-specific expectations

1. Ownership and borrowing rules must be reflected clearly in public types.
2. Async stream or channel-based receive flow should stay explicit.
3. Public crates, feature flags, and result types should remain stable during the Preview3 integration window.