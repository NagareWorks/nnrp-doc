# C# API

Start with the host-facing client and server pages. Protocol, message, enum, and transport pages are
reference material for parameters linked from those entrypoint pages.

| Read this first | Purpose |
|---|---|
| [Client](./api/client) | Connect, submit, receive results/events, and close. |
| [Server](./api/server) | Accept sessions, receive submits, send results/drops, and close. |

| Reference | Purpose |
|---|---|
| [Enums](./api/enums) | `enum` values used by client, server, messages, and transports. |
| [Protocol Types](./api/protocol) | Headers, framed messages, state machine, and cache store. |
| [Message Types](./api/messages) | Control-plane and data-plane message objects. |
| [Transport](./api/transport) | Framed transport contracts and TCP/native bridge integration notes. |

## Package Info

| Property | Value |
|---|---|
| Packages | `Nnrp.Core`, `Nnrp.Client`, `Nnrp.Server`, `Nnrp.NativeBridge`, `Nnrp.Transport.Tcp`, `Nnrp.Transport.Quic` |
| Version target | Preview3 train (`1.0.0-preview.3.*`) |
| Target framework | `netstandard2.1` |

```powershell
dotnet add package Nnrp.NativeBridge --prerelease
dotnet add package Nnrp.Transport.Tcp --prerelease
dotnet add package Nnrp.Transport.Quic --prerelease
```

## Documentation Pattern

Application methods are documented one method at a time. Each method section gives parameters,
requiredness, accepted values, return type, error behavior, and then a short usage example. Code
blocks are examples, not duplicated interface listings.

## C#-specific Expectations

1. Async methods are the primary API shape.
2. Disposable lifetimes and shutdown behavior must be explicit.
3. Public namespaces, interfaces, and result objects should remain stable unless the SDK version
   changes.
