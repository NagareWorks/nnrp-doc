# C# SDK Overview

`nnrp-cs` is the role-first C# SDK family for NNRP/1 Preview4. Applications install one role package
and the transport packages permitted by the deployment. The selected transport package owns its
provider behavior and transport-scoped Rust native artifacts; role packages never hide those assets.

## Package Graph

| Responsibility | Package |
|---|---|
| Shared protocol, endpoint, runtime metadata, and provider-selection contracts | `Nnrp.Core` |
| Production client connection and session orchestration | `Nnrp.Client` |
| Production server listener, accepted session, and operation orchestration | `Nnrp.Server` |
| Native loading, ABI validation, handles, and coarse FFI calls | `Nnrp.NativeBridge` |
| TCP provider behavior and artifacts | `Nnrp.Transport.Tcp` |
| QUIC provider behavior and artifacts | `Nnrp.Transport.Quic` |
| IPC provider behavior and artifacts | `Nnrp.Transport.Ipc` |
| WebSocket provider behavior and artifacts | `Nnrp.Transport.WebSocket` |
| Unity client assemblies and transport-scoped plugins | `com.nnrp.client` |

Installing one transport selects it directly. Installing several transports enables policy filtering,
capability checks, and probing across those installed providers. Public application endpoints remain
`nnrp://` or `nnrps://`; carrier-local locators are explicit provider overrides.

## Runtime Requirements

- .NET 6 or newer application runtime
- `netstandard2.1` target framework for SDK packages
- A Preview4 Rust artifact matching the managed ABI and selected transport package

## Contents

- [Quick Start](./quick-start)
- **API Reference**: [Client](./api/client) · [Server](./api/server) · [Runtime Control and Objects](./api/runtime) · [Transport](./api/transport) · [Enums](./api/enums) · [Protocol Types](./api/protocol) · [Message Types](./api/messages)
