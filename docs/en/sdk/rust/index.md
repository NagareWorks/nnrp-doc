# Rust SDK Overview

`nnrp-rs` is the Rust workspace for NNRP. It currently contains `nnrp-core`, `nnrp-runtime`, `nnrp-transport-provider`, `nnrp-transport-tcp`, `nnrp-transport-quic`, `nnrp-ffi`, `nnrp-wasm`, and `nnrp-conformance`. Preview3 now includes the protocol core, TCP client/server runtime, transport provider registry, FFI handle/event ABI, WASM primitives, and conformance fixtures.

## Current Status (Preview3)

| Module | Status |
|---|---|
| Protocol version, wire codecs, message types, and core errors | ✅ Preview3 core implemented |
| Connection/session lifecycle, flow control, cache/schema, recovery, operation model | ✅ Preview3 core implemented |
| Rust-generated conformance fixtures and adapter execution | ✅ Preview3 core implemented |
| Client API (`NnrpClient`, `NnrpClientSession`) | ✅ TCP runtime implemented |
| Server API (`NnrpServer`, `NnrpServerSession`) | ✅ TCP runtime implemented |
| Transport provider registry / policy resolver | ✅ TCP provider, QUIC provider slot, local/remote capability intersection, and probe score selection implemented |
| FFI value handles, buffer views, callback/polling events, error families | ✅ ABI surface implemented |
| Runtime-backed FFI client / server entrypoints | ✅ Handle/event ABI connected |
| QUIC runtime binding | 🔶 Transport/listener/provider slots exposed, concrete provider not frozen |
| WASM primitive package (probe / transport selection) | ✅ `nnrp-wasm` implemented; full JS/TS SDK remains in `nnrp-js` |

## Toolchain Requirements

- Rust ≥ 1.82 (stable)
- tokio 1.x
- WASM target: `wasm32-unknown-unknown`

## Contents

- [Quick Start](./quick-start)
- **API Reference**: [Core Types](./api/core) · [FFI / Native](./api/ffi) · [Client](./api/client) · [Server](./api/server) · [WASM Exports](./api/wasm)
