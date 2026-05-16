# C# — Frozen API

The C# SDK (`Nnrp.Core`) public API is organized into the following groups.

| Group | Description | Status |
|---|---|---|
| [Enums](./api/enums) | All `enum` definitions in `Nnrp.Core` namespace | ✅ Frozen |
| [Protocol Types](./api/protocol) | Header, framed message, state machine, cache store | ✅ Frozen |
| [Message Types](./api/messages) | All message classes and extension types | ✅ Frozen |
| [Client](./api/client) | `NnrpClient`, `ClientProfile`, submit and result | ✅ Frozen |
| [Server](./api/server) | `INnrpServerSession`, `ServerProfile`, frame receive and result | ✅ Frozen |
| [Transport](./api/transport) | `INnrpMessageTransport`, TCP implementation | ✅ Frozen |

## Package Info

| Property | Value |
|---|---|
| Package | `Nnrp.Core` |
| Version | `1.0.0` |
| Target framework | `netstandard2.1` |
| External deps | none |

```xml
<PackageReference Include="Nnrp.Core" Version="1.0.0" />
```
3. Operation submission, receive, and cancel entry points.
4. Cache and schema lifecycle methods.
5. Stable exception categories and cancellation behavior.

## C#-specific expectations

1. Async methods should be first-class and Task-based.
2. Disposable lifetimes and shutdown behavior must be explicit.
3. Public namespaces, interfaces, and result objects should remain stable across the Preview3 integration window.