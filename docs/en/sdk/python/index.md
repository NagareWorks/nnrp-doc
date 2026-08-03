# Python SDK Overview

`nnrp-py` is the Python SDK for the NNRP protocol. The public package keeps the Python host API stable while delegating runtime hot paths to packaged `nnrp-rs` native artifacts when they are available.

## Current Status

| Area | Status |
|---|---|
| Core protocol types, headers, packets, and message builders | Available |
| Client and server host API | Available |
| Native runtime facade | Available through packaged Rust artifacts |
| Native binding | ABI 4 `ctypes` facade over packaged Rust artifacts |
| Native transport providers | TCP, QUIC, IPC, and WebSocket, packaged as transport-scoped artifacts in platform wheels |
| Packet transport adapters | TCP available, QUIC available through `aioquic`; used for smoke tests, diagnostics, and custom transports |
| Cache, schema, recovery, diagnostics, and session lifecycle helpers | Available through Python facades backed by native runtime calls |
| Conformance adapter command | `python -m nnrp.tools.adapter_conformance` |
| Wire conformance command | `python -m nnrp.tools.wire_conformance` or `nnrp-wire-conformance` |
| Benchmark command | `python -m nnrp.tools.benchmark` or `nnrp-run-benchmark` |

## Runtime Requirements

- Python 3.11 or newer.
- A normal `pip` or `uv` installation path.
- The wheel contains platform-specific native artifacts when a supported wheel is available.
- Preview4 native artifacts are transport scoped; `tcp`, `quic`, `ipc`, and `websocket` providers each declare capability, limitations, and cost/preference metadata.
- The production package does not ship the retired compiled CFFI side runtime.

## Native Boundary

The Python facade uses coarse ABI 4 role calls through `ctypes`. Transport providers own their
transport-scoped Rust libraries, while connection/session runtime behavior remains in the shared
Rust role runtime. Python never substitutes a pure-Python or CFFI side runtime when a production
artifact is missing.

## Contents

- [Quick Start](./quick-start)
- **API Reference**: [Overview](./api) · [Enums](./api/enums) · [Header & Packet](./api/packet) · [Message Types](./api/messages) · [Client](./api/client) · [Server](./api/server) · [Runtime Control & Objects](./api/runtime) · [Transport & Providers](./api/transport)
