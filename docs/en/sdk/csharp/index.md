# C# SDK Overview

`nnrp-cs` is the C# SDK family for NNRP. Preview3 keeps managed protocol helpers in
`Nnrp.Core`, `Nnrp.Client`, and `Nnrp.Server`, while the default host integration path uses
`Nnrp.NativeBridge` plus explicit TCP/QUIC transport packages backed by the Rust native artifacts.

## Current Status (Preview3)

| Module | Status |
|---|---|
| Core protocol types, enums, headers, messages, and cache helpers | Available |
| Managed client/server session helpers | Available for tests, diagnostics, and custom framed transports |
| Native bridge fast path | Available |
| TCP transport package (`Nnrp.Transport.Tcp`) | Available |
| QUIC transport package (`Nnrp.Transport.Quic`) | Available |
| Transport probing and policy-based selection | Available |

## Runtime Requirements

- .NET 6 or newer application runtime
- `netstandard2.1` target framework for SDK packages

## Contents

- [Quick Start](./quick-start)
- **API Reference**: [Enums](./api/enums) · [Protocol Types](./api/protocol) · [Message Types](./api/messages) · [Client](./api/client) · [Server](./api/server) · [Transport](./api/transport)
