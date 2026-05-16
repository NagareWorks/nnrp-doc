# Python SDK Overview

`nnrp-py` is the Python implementation of the NNRP protocol, built on asyncio + aioquic, covering the full client and server control plane.

## Current Status (Preview3)

| Module | Status |
|---|---|
| Core protocol types (enums, header, packet) | ✅ Available (0.1.0) |
| Message types (control plane + data plane) | ✅ Available (0.1.0) |
| Client API (`ClientSession`, `ClientProfile`) | ✅ Available (0.1.0) |
| Server API (`ServerSession`, `accept_server_session`) | ✅ Available (0.1.0) |
| QUIC transport adapter | ✅ Available (aioquic) |
| TCP transport adapter | ✅ Available |
| Cache operations (`put_cache`, `invalidate_cache`) | 🔶 Preview3 planned |
| Multi-view (`max_views > 1`) | 🔶 Preview3 planned |

## Runtime Requirements

- Python ≥ 3.11
- asyncio event loop

## Contents

- [Quick Start](./quick-start)
- **API Reference**: [Enums](./api/enums) · [Header & Packet](./api/packet) · [Message Types](./api/messages) · [Client](./api/client) · [Server](./api/server) · [Transport](./api/transport)
