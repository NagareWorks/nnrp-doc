# Python SDK Overview

`nnrp-py` is the Python SDK for the NNRP protocol. The public package keeps the Python host API stable while delegating runtime hot paths to packaged `nnrp-rs` native artifacts when they are available.

## Current Status

| Area | Status |
|---|---|
| Core protocol types, headers, packets, and message builders | Available |
| Client and server host API | Available |
| Native runtime facade | Available through packaged Rust artifacts |
| Native binding modes | `auto`, `ctypes`, and `cffi_api` |
| TCP transport adapter | Available |
| QUIC transport adapter | Available through `aioquic` |
| Cache, schema, recovery, diagnostics, and session lifecycle helpers | Available through Python facades backed by native runtime calls |
| Conformance adapter command | `python -m nnrp.tools.adapter_conformance` |
| Benchmark command | `python -m nnrp.tools.benchmark` or `nnrp-run-benchmark` |

## Runtime Requirements

- Python 3.11 or newer.
- A normal `pip` or `uv` installation path.
- The wheel contains platform-specific native artifacts when a supported wheel is available.
- `NNRP_NATIVE_BINDING_MODE=ctypes` forces the compiler-free fallback path for local development environments that cannot build a cffi API extension.

## Binding Selection

The default binding mode is `auto`. In production wheels, `auto` prefers the packaged cffi API fast path and falls back to `ctypes` when that module is unavailable. Local editable checkouts can still run through `ctypes` without a compiler toolchain.

Use `NNRP_NATIVE_BINDING_MODE` only for diagnostics or local development:

| Value | Behavior |
|---|---|
| `auto` | Prefer the fastest packaged binding and fall back when needed. |
| `cffi_api` | Require the cffi API fast path. Fails if it is unavailable. |
| `ctypes` | Force the compiler-free native binding. |

## Contents

- [Quick Start](./quick-start)
- **API Reference**: [Overview](./api) · [Enums](./api/enums) · [Header & Packet](./api/packet) · [Message Types](./api/messages) · [Client](./api/client) · [Server](./api/server) · [Transport](./api/transport)
