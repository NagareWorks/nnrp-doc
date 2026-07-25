# C# API

The C# Preview4 API is organized by application role. Client and server entrypoints own lifecycle
orchestration; transport packages supply real providers; `Nnrp.NativeBridge` remains the shared
native loading and coarse-call boundary.

| Start here | Purpose |
|---|---|
| [Client](./api/client) | Connect, open sessions, submit, send controls, consume events, and close. |
| [Server](./api/server) | Listen, accept sessions, receive operations, stream results, and close. |

| Reference | Purpose |
|---|---|
| [Runtime Control and Objects](./api/runtime) | Preview4 control metadata, object/cache metadata, typed events, and binary frame codec. |
| [Transport](./api/transport) | Application endpoints, provider endpoints, provider registry, selection, and four native packages. |
| [Enums](./api/enums) | Protocol and runtime enum values. |
| [Protocol Types](./api/protocol) | Header, framed message, state machine, and diagnostic packet primitives. |
| [Message Types](./api/messages) | Low-level control-plane and data-plane message values. |

## Package Info

| Property | Value |
|---|---|
| Shared packages | `Nnrp.Core`, `Nnrp.NativeBridge` |
| Role packages | `Nnrp.Client`, `Nnrp.Server` |
| Transport packages | `Nnrp.Transport.Tcp`, `Nnrp.Transport.Quic`, `Nnrp.Transport.Ipc`, `Nnrp.Transport.WebSocket` |
| Unity package | `com.nnrp.client` |
| Version target | `1.0.0-preview.4` |
| Target framework | `netstandard2.1` |

## Frozen API Rules

1. Public application endpoints use `nnrp://` or `nnrps://` regardless of the selected provider.
2. Installing a transport package supplies real provider behavior and its own Rust artifacts.
3. Client and server role APIs call Rust in coarse operations; they do not expose raw FFI buffers or handles.
4. Managed packet/session helpers are diagnostic surfaces and are not production fallbacks.
5. Preview4 does not expose aliases or forwarding entrypoints for older preview APIs.
6. Async methods, cancellation, disposal, terminal state, and owned/borrowed memory are explicit.
