# C# SDK Overview

`Nnrp.Core` is the C# implementation of the NNRP protocol, targeting `netstandard2.1`, covering the full client and server control plane.

## Current Status (Preview3)

| Module | Status |
|---|---|
| Core protocol types (enums, header, messages) | ✅ Available |
| Client API (`NnrpClient`, `INnrpClientSession`) | ✅ Available |
| Server API (`NnrpServer`, `INnrpServerSession`) | ✅ Available |
| TCP transport (`NnrpTcpMessageTransport`) | ✅ Available |
| QUIC transport | 🔶 Preview3 planned |
| Cache operations (`PutCacheAsync`, `InvalidateCacheAsync`) | 🔶 Preview3 planned |
| Multi-view (`MaxViews > 1`) | 🔶 Preview3 planned |

## Runtime Requirements

- .NET ≥ 6 / .NET Standard 2.1

## Contents

- [Quick Start](./quick-start)
- **API Reference**: [Enums](./api/enums) · [Protocol Types](./api/protocol) · [Message Types](./api/messages) · [Client](./api/client) · [Server](./api/server) · [Transport](./api/transport)
- [Deployment](./deploy)