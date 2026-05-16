# Rust SDK Overview

`nnrp-core` is the Rust implementation of the NNRP protocol. `nnrp-ffi` exposes a C ABI and WASM exports for cross-language and web use.

## Current Status (Preview3)

| Module | Status |
|---|---|
| Protocol version and base error types (`ProtocolVersion`, `NnrpError`) | ✅ Available (0.1.0) |
| FFI C ABI (`current_protocol_version`) | ✅ Available (0.1.0) |
| Full wire types (`NnrpHeader`, message types, etc.) | 🔶 Preview3 planned (0.3) |
| Client API (`NnrpClient`, `NnrpClientSession`) | 🔶 Preview3 planned (0.3) |
| Server API (`NnrpServer`, `NnrpServerSession`) | 🔶 Preview3 planned (0.3) |
| Full FFI client / server C ABI | 🔶 Preview3 planned |
| WASM exports (`NnrpWasmClient`, `NnrpWasmSession`) | 🔶 Preview3 planned |

## Toolchain Requirements

- Rust ≥ 1.75 (stable)
- tokio 1.x (async runtime)
- WASM target: `wasm32-unknown-unknown` + wasm-pack

## Contents

- [Quick Start](./quick-start)
- **API Reference**: [Core Types](./api/core) · [FFI / Native](./api/ffi) · [Client](./api/client) · [Server](./api/server) · [WASM Exports](./api/wasm)
