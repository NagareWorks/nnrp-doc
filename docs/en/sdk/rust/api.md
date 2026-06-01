# Rust — Frozen API

The Rust SDK (`nnrp-rs`) workspace contains the protocol core, runtime, transport providers, FFI/native packaging, WASM primitives, and conformance crates. Preview3 now includes the protocol core, async TCP client/server runtime, the default QUIC provider, conformance fixtures, and the FFI ABI / WASM primitive surface for cross-language bindings.

Start with [Client](./api/client) or [Server](./api/server) for application code. Core, FFI, and
WASM pages are reference material for linked parameter and packaging details.

| Group | Crate | Description | Status |
|---|---|---|---|
| [Core Types](./api/core) | `nnrp-core` | Wire codecs, validation, lifecycle, cache/schema, recovery, conformance baseline | ✅ Preview3 core implemented |
| [Client (Preview3)](./api/client) | `nnrp-runtime` | `NnrpClient`, `NnrpClientSession`, event receive, submit/cancel/patch/migrate/close | ✅ TCP runtime and QUIC provider path implemented |
| [Server (Preview3)](./api/server) | `nnrp-runtime` | `NnrpServer`, `NnrpServerSession`, accept/receive/send/flow/close | ✅ TCP runtime and QUIC provider path implemented |
| Transport provider | `nnrp-transport-provider` / `nnrp-transport-tcp` / `nnrp-transport-quic` | Provider registry, native library detection, policy resolver, probe score selection, TCP provider, Quinn/Rustls QUIC provider | ✅ Implemented |
| [FFI / Native](./api/ffi) | `nnrp-ffi` | Value handles, buffer views, callback/polling events, client/server handle ABI, native artifact packaging | ✅ Implemented |
| [WASM Exports (Preview3)](./api/wasm) | `nnrp-wasm` | wasm-bindgen JSON primitives, probe scoring, transport selection, `.d.ts` / `.wasm` packaging | ✅ Primitive implemented |

## Workspace Info

| Property | Value |
|---|---|
| Workspace | `nnrp-rs` |
| Version | `1.0.0-preview.3.1` |
| Min Rust | `1.82` |
| Runtime deps | `tokio = "1"`, `async-trait = "0.1"` |

```toml
[dependencies]
nnrp-core = "1.0.0-preview.3.1"
nnrp-runtime = "1.0.0-preview.3.1"
nnrp-transport-provider = "1.0.0-preview.3.1"
nnrp-transport-tcp = "1.0.0-preview.3.1"
nnrp-transport-quic = "1.0.0-preview.3.1"
nnrp-wasm = "1.0.0-preview.3.1"

# FFI integration (C#/Python/Unity callers)
nnrp-ffi = "1.0.0-preview.3.1"
```

## Build Targets

| Target | Output | Use |
|---|---|---|
| `--lib` | `libnnrp_core.rlib` / `libnnrp_runtime.rlib` | Rust dependencies |
| `python scripts/package_native_artifacts.py` | Windows/Linux/macOS/Android dynamic libraries, iOS static libraries, `include/nnrp/*.h` + manifest | C#/Python/Unity/Node native FFI integration |
| `python scripts/package_wasm_primitives.py` | `nnrp_wasm.wasm` + `nnrp_wasm.d.ts` + manifest | Browser/Node WASM primitives wrapped by `nnrp-js` |

## Current Boundary

`nnrp-runtime` currently ships a built-in TCP client/server session runtime and exposes `FramedTransport` / `FramedListener` slots for external TCP/QUIC providers. `nnrp-transport-quic` is a standalone provider package that uses Quinn/Rustls by default for out-of-the-box QUIC connect, listen, and certificate configuration helpers. Platform QUIC, native-addon, or WASM-facing backends can still register their real backend with `QuicProvider::backend_descriptor` and inject it through `from_transport` / `from_listener`.

The FFI layer exposes client/server handles, sessions, operations, and event ABI. It is the low-level control surface for bindings and does not expose Rust async objects or socket pointers directly.

Native link libraries fit C#/Python/Unity and Node.js backend native-addon scenarios. `nnrp-rs` publishes multi-platform native artifacts, WASM primitives, and the `include/nnrp/nnrp.h` C ABI entrypoint; `nnrp-js` should probe native link libraries first in Node.js and fall back to WASM when native loading is unavailable. Browsers cannot load `.dll` / `.so` / `.dylib`, so the JavaScript/TypeScript browser SDK must use the `nnrp-wasm` primitive package plus WebSocket/WebTransport transport adapters.

## Rust-specific expectations

1. Ownership and borrowing rules must be reflected clearly in public types.
2. Async receive flow stays explicit: clients use `await_event` / `await_result`; servers use `receive_*`.
3. Public crates, feature flags, and result types should remain stable during the Preview3 integration window.
4. Code blocks should be usage examples; method details belong in method-level parameter tables.
