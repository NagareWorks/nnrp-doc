# Rust SDK Overview

`nnrp-core` is the Rust implementation of the NNRP protocol. `nnrp-ffi` exposes a C ABI surface for cross-language binding work.

## Current Status (Preview3)

| Module | Status |
|---|---|
| Protocol version, wire codecs, message types, and core errors | ✅ Preview3 core implemented |
| Connection/session lifecycle, flow control, cache/schema, recovery, operation model | ✅ Preview3 core implemented |
| Rust-generated conformance fixtures and adapter execution | ✅ Preview3 core implemented |
| FFI value handles, buffer views, callback/polling events, error families | ✅ ABI surface implemented |
| Client API (`NnrpClient`, `NnrpClientSession`) | 🚧 Runtime not implemented yet |
| Server API (`NnrpServer`, `NnrpServerSession`) | 🚧 Runtime not implemented yet |
| Runtime-backed FFI client / server entrypoints | 🚧 Depends on Rust runtime |
| WASM exports (`NnrpWasmClient`, `NnrpWasmSession`) | 🔶 Preview3 planned |

## Toolchain Requirements

- Rust ≥ 1.75 (stable)
- tokio 1.x (planned for the client/server runtime)
- WASM target: `wasm32-unknown-unknown` + wasm-pack

## Contents

- [Quick Start](./quick-start)
- **API Reference**: [Core Types](./api/core) · [FFI / Native](./api/ffi) · [Client](./api/client) · [Server](./api/server) · [WASM Exports](./api/wasm)
