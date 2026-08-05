# C# Server API

The production server path owns a Rust-backed listener and accepted runtime sessions:

1. Listen on an application-facing NNRP endpoint.
2. Accept a session through any listener in the owned provider listener set.
3. Receive an `NnrpServerOperation`.
4. Send progress, partial, terminal, drop, and trace output.
5. Close the accepted session and listener.

## `NnrpServer.ListenAsync`

```csharp
public static ValueTask<NnrpServer> ListenAsync(
    NnrpServerOptions options,
    CancellationToken cancellationToken = default);
```

The method resolves every registered provider allowed by policy, atomically binds their listener
set, and transfers each listener to its native server runtime. It never creates a managed loopback
server.

## `NnrpServerOptions`

| Property | Type | Required | Description |
|---|---|---:|---|
| `Endpoint` | [`NnrpEndpoint`](./transport#nnrpendpoint) | Yes | `nnrp://` or `nnrps://` application endpoint. |
| `ProviderRoutes` | `IReadOnlyDictionary<TransportId, NnrpServerProviderRoute>?` | No | Per-carrier bind locator and server-security configuration. |
| `TransportPolicy` | [`TransportPolicy`](./enums#transportpolicy) | No | Defaults to `Auto`. |
| `SessionDefaults` | `NnrpServerSessionOptions?` | No | Defaults applied to every accepted session. |

TCP and QUIC may derive their bind host and port from `Endpoint`. IPC and WebSocket require matching
provider-local locators. Auto/Prefer requires every allowed installed provider route to resolve and
opens the complete listener set atomically; Force restricts the set without fallback.

## `NnrpServerSessionOptions`

| Property | Type | Default | Description |
|---|---|---:|---|
| `SupportedProfiles` | `IReadOnlyList<ushort>` | Standard token profile | Supported profile ids. |
| `SupportedCacheObjects` | `IReadOnlyList<CacheObjectKind>` | Empty | Supported cache object kinds. |
| `MaxCacheObjects` | `ulong` | `0` | Cache object-count limit; zero means no advertised limit. |
| `MaxCacheObjectBytes` | `uint` | `0` | Per-object byte limit; zero means no advertised limit. |
| `SchemaRegistry` | `NnrpSchemaRegistry` | Standard | Application-facing schema registry. |
| `ResumeTokenBytes` | `uint` | `24` | Runtime-issued recovery-token size. |
| `MaxInFlightOperations` | `ushort` | `4` | Negotiated in-flight operation limit. |
| `GrantedOperationCredit` | `ushort` | `2` | Initial operation credit. |
| `LeaseTtlMilliseconds` | `uint` | `30000` | Cache lease lifetime. |
| `ResumeWindowMilliseconds` | `uint` | `120000` | Recovery-ticket validity window. |
| `ApplicationPolicy` | `INnrpServerSessionPolicy` | Accept valid sessions | Asynchronous admission policy. |

```csharp
public interface INnrpServerSessionPolicy
{
    ValueTask<NnrpServerSessionPolicyDecision> EvaluateAsync(SessionOpenMetadata open);
}
```

`NnrpServerSessionPolicyDecision` contains `Accepted`, `SessionErrorCode`, and optional `Diagnostic`.
The policy runs exactly once for each `SESSION_OPEN`. It executes away from the native callback
thread, and the host reports its decision through the Rust ABI completion boundary. Rejections must
use a valid non-zero session error code; exceptions become deterministic policy failures.

## `NnrpServer.AcceptAsync`

```csharp
public ValueTask<NnrpServerSession> AcceptAsync(
    NnrpServerAcceptOptions? options = null,
    CancellationToken cancellationToken = default);
```

`NnrpServerAcceptOptions` contains only `TimeoutMilliseconds`, which defaults to `0`. Native accept
tickets, session handles, and generations are internal. The accepted session owns its native
session handle and preserves the selected provider identity.

`NnrpServerSession.ActiveTransportId` is the `TransportId` of the listener that accepted the carrier. It matches the
negotiated active transport and is not inferred from listener preference order.

`NnrpServer.BoundProviderEndpoints` is an `IReadOnlyDictionary<TransportId, NnrpProviderEndpoint>` containing the
actual endpoint of every opened listener. A terminal provider-listener failure fails the logical server and closes the
remaining listener set; a rejected peer handshake affects only that accepted carrier.

## `NnrpServerSession.ReceiveSubmitAsync`

```csharp
public ValueTask<NnrpServerOperation> ReceiveSubmitAsync(
    CancellationToken cancellationToken = default);
```

The returned operation exposes owned application values, not FFI buffers:

| Property | Type | Description |
|---|---|---|
| `OperationId` | `ulong` | Non-zero wire operation identity. |
| `FrameId` | `uint` | Wire frame identity. |
| `Metadata` | `FrameSubmitMetadata` | Decoded submit metadata. |
| `Body` | `ReadOnlyMemory<byte>` | Owned submit body. |
| `TraceId` | `ulong` | End-to-end trace identity. |

## Operation Results

| Method | Message | Description |
|---|---|---|
| `SendResultAsync(ResultPushMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ResultPush` | Sends the terminal success/error payload for this operation. |
| `SendResultDropAsync(ResultDropReasonMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ResultDropReason` | Sends typed terminal drop evidence. |

An operation accepts exactly one terminal send. Sending after terminal state or after session close
throws `NnrpNativeInvalidStateException`.

## Server Runtime Methods

The session sends typed Preview4 frames through one coarse native call per method.

| Method | Message | Tail |
|---|---|---|
| `SendProgressAsync(ProgressMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `Progress` | Progress body |
| `SendPartialResultAsync(PartialResultMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `PartialResult` | Partial body |
| `SendBackpressureAsync(PressureMetadata, CancellationToken)` | `Backpressure` | None |
| `SendCreditUpdateAsync(PressureMetadata, CancellationToken)` | `CreditUpdate` | None |
| `SendResultDropReasonAsync(ResultDropReasonMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ResultDropReason` | Diagnostic bytes |
| `SendTraceContextAsync(TraceContextMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `TraceContext` | Trace attributes |
| `SendRecoverableErrorAsync(RecoverableErrorMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ErrorRecoverable` | Diagnostic bytes |
| `SendRetryAfterAsync(RetryAfterMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `RetryAfter` | Diagnostic bytes |
| `SendControlAsync(MessageType, IRuntimeControlMetadata, ReadOnlyMemory<byte>, CancellationToken)` | Any server-sendable runtime control | Declared tail |

## Server Object And Cache Methods

| Method | Message |
|---|---|
| `DeclareObjectAsync` | `ObjectDeclare` |
| `ReferenceObjectAsync` | `ObjectRef` |
| `ReleaseObjectAsync` | `ObjectRelease` |
| `PatchObjectAsync` | `ObjectPatch` |
| `SendObjectDeltaAsync` | `ObjectDelta` |
| `ReferenceCacheAsync` | `CacheReference` |
| `ReportCacheMissAsync` | `CacheMiss` |
| `InvalidateCacheAsync` | `CacheInvalidate` |

The method parameters and tail rules are the same typed metadata contracts documented for the
[client object and cache methods](./client#client-object-and-cache-methods).

## Incoming Runtime Events

`NextEventAsync(CancellationToken)` returns `ValueTask<NnrpRuntimeEvent>` and preserves wire order for
one session. It includes cancellation, scheduling, capability, route, trace, object, cache, and
recovery frames. No application-facing method accepts a raw control code.

## Shutdown

`NnrpServerOperation`, `NnrpServerSession`, and `NnrpServer` enforce ownership in that order.
Sessions and listeners implement `IAsyncDisposable`; listener shutdown cancels pending accepts,
closes accepted sessions, and releases the provider runtime.

Managed `INnrpMessageTransport` server helpers remain diagnostic/custom-carrier surfaces and are not
production fallbacks.
