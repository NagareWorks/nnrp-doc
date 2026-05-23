# Rust SDK Overview

`nnrp-rs` is the Rust workspace for NNRP. It currently contains `nnrp-core`, `nnrp-runtime`, `nnrp-ffi`, and `nnrp-conformance`. Preview3 now includes the protocol core, TCP client/server runtime, FFI handle/event ABI, and conformance fixtures.

## Current Status (Preview3)

| Module | Status |
|---|---|
| Protocol version, wire codecs, message types, and core errors | ✅ Preview3 core implemented |
| Connection/session lifecycle, flow control, cache/schema, recovery, operation model | ✅ Preview3 core implemented |
| Rust-generated conformance fixtures and adapter execution | ✅ Preview3 core implemented |
| Client API (`NnrpClient`, `NnrpClientSession`) | ✅ TCP runtime implemented |
| Server API (`NnrpServer`, `NnrpServerSession`) | ✅ TCP runtime implemented |
| FFI value handles, buffer views, callback/polling events, error families | ✅ ABI surface implemented |
| Runtime-backed FFI client / server entrypoints | ✅ Handle/event ABI connected |
| QUIC runtime binding | 🔶 Transport/listener slots exposed, concrete provider not frozen |
| WASM exports (`NnrpWasmClient`, `NnrpWasmSession`) | 🔶 Preview3 planned |

## Toolchain Requirements

- Rust ≥ 1.82 (stable)
- tokio 1.x
- WASM target: `wasm32-unknown-unknown` + wasm-pack (planned)

## Contents

- [Quick Start](./quick-start)
- **API Reference**: [Core Types](./api/core) · [FFI / Native](./api/ffi) · [Client](./api/client) · [Server](./api/server) · [WASM Exports](./api/wasm)
