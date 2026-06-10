# Rust SDK

`nnrp-rs` is the canonical Rust implementation of NNRP/1 Preview4. It owns the wire model,
runtime-control profiles, object/cache metadata, transport provider interfaces, native FFI ABI,
browser WASM primitives, and conformance support used by downstream SDKs.

## Package Map

| Package | Boundary | Read first |
|---|---|---|
| `nnrp-core` | Protocol constants, wire codecs, metadata structs, profile registries, validation, runtime-control and object/cache models | [Core Types](./api/core) |
| `nnrp-runtime` | Transport-neutral async client/server session runtime | [Client API](./api/client), [Server API](./api/server) |
| `nnrp-transport-provider` | Provider registry, policy, probe scoring, and selection | [API Overview](./api#transport-provider-boundary) |
| `nnrp-transport-tcp` | TCP transport implementation | [Quick Start](./quick-start) |
| `nnrp-transport-quic` | Quinn/Rustls QUIC transport implementation | [API Overview](./api#transport-provider-boundary) |
| `nnrp-transport-ipc` | Unix domain socket / Windows named pipe transport implementation | [API Overview](./api#transport-provider-boundary) |
| `nnrp-transport-websocket` | Native Rust WebSocket transport implementation for binary NNRP frames | [API Overview](./api#transport-provider-boundary) |
| `nnrp-ffi` | C ABI and transport-scoped native artifact packaging | [FFI / Native](./api/ffi) |
| `nnrp-wasm` | Browser WASM primitives and generated TypeScript declarations | [WASM](./api/wasm) |
| `nnrp-conformance` | Rust-backed adapter, wire conformance, and benchmark helpers | [Conformance](/en/conformance/) |

## How To Choose A Path

| Goal | Use |
|---|---|
| Build a native Rust client or server | `nnrp-runtime` plus one or more `nnrp-transport-*` packages |
| Let runtime choose among installed transports | `nnrp-transport-provider` with registered TCP/QUIC/IPC/WebSocket providers |
| Bind Python, C#, Unity, or another native host | `nnrp-ffi` release artifacts |
| Ship browser protocol primitives | `nnrp-wasm`; browser transport lifecycle stays in the JS/TS SDK |
| Check semantic compatibility | `nnrp-conformance` wire and adapter suites |

## Current Status

Preview4 adds runtime-control frames, object/cache-reference frames, IPC and WebSocket transports,
transport-scoped native artifacts, browser WASM primitives, and wire-level conformance support. The
Rust runtime remains transport-neutral: client/server session behavior lives in `nnrp-runtime`, while
each transport crate owns its own networking implementation.

Start with [Quick Start](./quick-start), then use the [API Overview](./api) to jump into the exact
surface you need.
