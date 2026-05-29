# Python API

The Python SDK (`nnrp-py`) public API is organized into protocol primitives, host-facing client/server helpers, transport adapters, and native runtime facades.

| Group | Description | Status |
|---|---|---|
| [Enums & Constants](./api/enums) | Message types, flags, payload kinds, status enums, and constants | Stable |
| [Header & Packet](./api/packet) | `NnrpHeader`, `NnrpPacket`, tensor sections, and serialization utilities | Stable |
| [Message Types](./api/messages) | Metadata classes and builder functions for control/data messages | Stable |
| [Client](./api/client) | Client profiles, session lifecycle, submit/result helpers, migration, and routing | Stable |
| [Server](./api/server) | Server profiles, session acceptance, frame receive, and result push helpers | Stable |
| [Transport Adapters](./api/transport) | TCP and QUIC connection factories and configuration | Stable |

## Package Info

| Property | Value |
|---|---|
| Distribution | `nnrp-py` |
| Import package | `nnrp` |
| Current preview package | `1.0.0rc3` |
| Min Python | `3.11` |
| Runtime deps | `aioquic >= 1.2.0`, `cffi >= 2.0.0` |

```bash
pip install "nnrp-py==1.0.0rc3"
```

## Native Runtime Facades

The top-level `nnrp` package also exports native runtime helpers such as `load_native_runtime`, `load_native_client`, `probe_native_artifact`, `NativeRuntimeBackend`, `NativeRuntimeClient`, `NativeRuntimeConnection`, `NativeRuntimeSession`, `NativeSchemaCodec`, `NativeRecoveryCodec`, and cache/session diagnostic types.

The default binding mode is `auto`. It prefers the packaged cffi API fast path and falls back to `ctypes` when the fast path is unavailable. Set `NNRP_NATIVE_BINDING_MODE=ctypes` to force the compiler-free path during local development, or `NNRP_NATIVE_BINDING_MODE=cffi_api` to require the fast path.

## Tool Entrypoints

| Command | Purpose |
|---|---|
| `python -m nnrp.tools.adapter_conformance` | Consume a suite-owned adapter execution plan and emit adapter case results. |
| `python -m nnrp.tools.benchmark` | Consume a benchmark execution plan and emit benchmark results. |
| `nnrp-run-benchmark` | Console-script alias for the benchmark runner. |

## Wire Format

Only NNRP/1 wire format `0` is supported. Every packet header's `wire_format` field must match this value; otherwise the parser raises `ValueError`.

## Python-specific Expectations

1. Async-first methods are the primary host API contract.
2. Sync helpers are convenience wrappers over the same protocol semantics.
3. Public method names, parameter groups, and returned state objects should not drift without a formal SDK version change.
