# Python — Frozen API

The Python SDK (`nnrp-py`) public API is organized into the following groups.

| Group | Description | Status |
|---|---|---|
| [Enums & Constants](./api/enums) | `MessageType`, `HeaderFlags`, `ErrorCode` and all enum definitions | ✅ Frozen |
| [Header & Packet](./api/packet) | `NnrpHeader`, `NnrpPacket`, `TensorSectionData` and serialization utilities | ✅ Frozen |
| [Message Types](./api/messages) | Metadata classes and builder functions for each message type | ✅ Frozen |
| [Client](./api/client) | `ClientProfile`, `ClientSession`, transport setup and migration | ✅ Frozen |
| [Server](./api/server) | `ServerProfile`, `ServerSession`, frame receive and result push | ✅ Frozen |
| [Transport Adapters](./api/transport) | TCP / QUIC connection factories and configuration | ✅ Frozen |

## Package Info

| Property | Value |
|---|---|
| Package | `nnrp` |
| Version | `0.1.0` |
| Min Python | `3.11` |
| Runtime dep | `aioquic >= 1.2.0` |

```python
pip install nnrp
```

## Wire Format

Only `WireFormat.CURRENT = 0` (NNRP/1) is supported. Every packet header's `wire_format` field must match this value; otherwise the parser raises `ValueError`.
5. A stable error hierarchy and cancellation surface.

## Python-specific expectations

1. Async-first methods should be the primary contract.
2. Sync helpers may exist, but they are convenience wrappers over the same control-plane semantics.
3. Public method names, parameter groups, and returned state objects should not drift without a formal SDK version change.