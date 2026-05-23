# Rust — Frozen API

The Rust SDK (`nnrp-rs`) workspace contains four crates. Preview3 now includes the protocol core, async TCP client/server runtime, conformance fixtures, and the FFI ABI surface for cross-language bindings.

| Group | Crate | Description | Status |
|---|---|---|---|
| [Core Types](./api/core) | `nnrp-core` | Wire codecs, validation, lifecycle, cache/schema, recovery, conformance baseline | ✅ Preview3 core implemented |
| [Client (Preview3)](./api/client) | `nnrp-runtime` | `NnrpClient`, `NnrpClientSession`, event receive, submit/cancel/patch/migrate/close | ✅ TCP runtime implemented |
| [Server (Preview3)](./api/server) | `nnrp-runtime` | `NnrpServer`, `NnrpServerSession`, accept/receive/send/flow/close | ✅ TCP runtime implemented |
| Transport provider | `nnrp-transport-provider` / `nnrp-transport-tcp` | Provider registry, native library detection, policy resolver, TCP provider | ✅ Implemented |
| [FFI / Native](./api/ffi) | `nnrp-ffi` | Value handles, buffer views, callback/polling events, client/server handle ABI | ✅ Implemented |
| [WASM Exports (Preview3)](./api/wasm) | `nnrp-ffi` | WebAssembly export interface | 🚧 Planned |

## Workspace Info

| Property | Value |
|---|---|
| Workspace | `nnrp-rs` |
| Version | `1.0.0-preview.2` |
| Min Rust | `1.82` |
| Runtime deps | `tokio = "1"`, `async-trait = "0.1"` |

```toml
[dependencies]
nnrp-core = "1.0.0-preview.2"
nnrp-runtime = "1.0.0-preview.2"
nnrp-transport-provider = "1.0.0-preview.2"
nnrp-transport-tcp = "1.0.0-preview.2"

# FFI integration (C#/Python/Unity callers)
nnrp-ffi = "1.0.0-preview.2"
```

## Build Targets

| Target | Output | Use |
|---|---|---|
| `--lib` | `libnnrp_core.rlib` / `libnnrp_runtime.rlib` | Rust dependencies |
| `--lib --crate-type=cdylib` | `nnrp_ffi.dll` / `.so` / `.dylib` | C#/Python/Unity/Node native FFI integration |
| `--target wasm32-unknown-unknown` | raw `nnrp_ffi.wasm` | Low-level WASM compile target; the browser SDK still needs wasm-bindgen plus a JS/TS wrapper |

## Current Boundary

`nnrp-runtime` currently ships a built-in TCP client/server session runtime and exposes `FramedTransport` / `FramedListener` slots for external TCP/QUIC providers. `connect_quic` / `bind_quic` still do not choose a TLS or QUIC implementation for callers; use `from_transport` / `from_listener` to inject a concrete provider.

The FFI layer exposes client/server handles, sessions, operations, and event ABI. It is the low-level control surface for bindings and does not expose Rust async objects or socket pointers directly.

Native link libraries fit C#/Python/Unity and Node.js backend native-addon scenarios. Browsers cannot load `.dll` / `.so` / `.dylib`, so the future JS/TS browser SDK must use a WASM package plus WebSocket/WebTransport transport adapters.

## Rust-specific expectations

1. Ownership and borrowing rules must be reflected clearly in public types.
2. Async receive flow stays explicit: clients use `await_event` / `await_result`; servers use `receive_*`.
3. Public crates, feature flags, and result types should remain stable during the Preview3 integration window.
