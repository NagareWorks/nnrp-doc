# C# Client API

The production client path is role-first and Rust-backed:

1. Connect an `NnrpClient` to an application-facing NNRP endpoint.
2. Open an `NnrpClientSession`.
3. Submit operations or send typed Preview4 control/object frames.
4. Consume results and runtime events.
5. Close the session and client.

## `NnrpClient.ConnectAsync`

```csharp
public static ValueTask<NnrpClient> ConnectAsync(
    NnrpClientOptions options,
    CancellationToken cancellationToken = default);
```

The method validates the application endpoint, resolves registered providers, connects the selected
provider, completes the NNRP handshake, and owns the resulting native connection. It fails instead of
falling back to a managed protocol implementation.

## `NnrpClientOptions`

| Property | Type | Required | Description |
|---|---|---:|---|
| `Endpoint` | [`NnrpEndpoint`](./transport#nnrpendpoint) | Yes | `nnrp://` or `nnrps://` application endpoint. |
| `ProviderRoutes` | `IReadOnlyDictionary<TransportId, NnrpClientProviderRoute>?` | No | Per-carrier locator and peer-verification configuration. |
| `TransportPolicy` | [`TransportPolicy`](./enums#transportpolicy) | No | Defaults to `Auto`. |
| `Transports` | `IReadOnlyList<INnrpNativeTransportProvider>?` | No | Explicit providers; `null` uses the default registry. |
| `SessionDefaults` | `NnrpClientSessionOptions?` | No | Defaults merged into each opened session. |

TCP and QUIC may derive their host and port from `Endpoint`. IPC and WebSocket routes require a
matching `unix://`, `npipe://`, `ws://`, or `wss://` locator. Auto/Prefer retains unresolved routes
in candidate diagnostics and probes every viable route; Force fails without fallback.

## `NnrpClient.OpenSession`

```csharp
public NnrpClientSession OpenSession(NnrpClientSessionOptions? options = null);
```

`NnrpClientSessionOptions` freezes `SessionId`, `SessionGeneration`, `ProfileId`, `SchemaId`, and
`SchemaVersion`. Zero-valued IDs request runtime allocation; generations and schema versions must be
non-zero when their corresponding IDs are explicit.

## Submission And Results

| Method | Returns | Semantics |
|---|---|---|
| `SubmitAsync(NnrpSubmitRequest, CancellationToken)` | `ValueTask<NnrpResult>` | Submits and waits for the matching terminal result. |
| `SubmitNoWaitAsync(NnrpSubmitRequest, CancellationToken)` | `ValueTask<ulong>` | Submits and returns the non-zero operation ID. |
| `NextResultAsync(CancellationToken)` | `ValueTask<NnrpResult>` | Skips non-result events and returns the next terminal result. |
| `NextEventAsync(CancellationToken)` | `ValueTask<NnrpRuntimeEvent>` | Returns the next event in wire order for this session. |

`NnrpSubmitRequest` carries a non-zero `OperationId`, independent `FrameId`, payload/tensor values,
profile, schema and cache metadata, and submit mode. The role API owns packing and performs one coarse
native submit call; callers never construct an FFI buffer.

### `NnrpResult`

| Property | Type | Description |
|---|---|---|
| `OperationId` | `ulong` | Non-zero submitted operation identity. |
| `TerminalState` | `NnrpResultTerminalState` | `Success`, `Cancelled`, `Dropped`, or `Error`. |
| `Event` | `NnrpTerminalEvent` | Sealed `Runtime` or `Lifecycle` terminal-evidence value. |

Successful results preserve `ResultPush`; non-success results preserve the exact wire or local
lifecycle event that established the terminal state. `NnrpTerminalEvent` contains exactly one
variant; the managed API never exposes nullable parallel event fields or fabricates headers.

### `NnrpOperationLifecycleEvent`

| Property | Type | Description |
|---|---|---|
| `OperationId` | `ulong` | Non-zero operation identity. |
| `State` | `NnrpOperationState` | Exact local lifecycle state. |

This is a local role notification. It never contains a fabricated `RuntimeFrameHeader`; native
lifecycle records without a header remain separate from wire `NnrpRuntimeEvent` values.

## Client Control Methods

Every method validates metadata/tail lengths and emits the named runtime frame through the active
native session.

| Method | Message | Tail |
|---|---|---|
| `CancelAsync(ControlRequestMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `Cancel` | Diagnostic bytes |
| `AbortAsync(ControlRequestMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `Abort` | Diagnostic bytes |
| `UpdatePriorityAsync(SchedulingMetadata, CancellationToken)` | `PriorityUpdate` | None |
| `UpdateDeadlineAsync(SchedulingMetadata, CancellationToken)` | `Deadline` | None |
| `ExpireAtAsync(SchedulingMetadata, CancellationToken)` | `ExpireAt` | None |
| `SupersedeAsync(SupersedeMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `Supersede` | Diagnostic bytes |
| `UpdateBudgetAsync(BudgetMetadata, CancellationToken)` | `BudgetUpdate` | None |
| `NegotiateCapabilitiesAsync(CapabilityMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `CapabilityNegotiation` | Capability entries |
| `DegradeProfileAsync(CapabilityMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `DegradeProfile` | Capability entries |
| `SendRouteHintAsync(RouteHintMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `RouteHint` | Typed hint body |
| `SendExecutionHintAsync(RouteHintMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ExecutionHint` | Typed hint body |
| `SendTraceContextAsync(TraceContextMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `TraceContext` | Trace attributes |
| `SendControlAsync(MessageType, IRuntimeControlMetadata, ReadOnlyMemory<byte>, CancellationToken)` | Any client-sendable runtime control | Declared tail |

`SendControlAsync` is a typed escape hatch. It rejects metadata whose concrete type does not match
`MessageType`.

## Client Object And Cache Methods

| Method | Message | Tail |
|---|---|---|
| `DeclareObjectAsync(ObjectDescriptorMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ObjectDeclare` | Object metadata |
| `ReferenceObjectAsync(ObjectReferenceMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ObjectRef` | Reference metadata |
| `ReleaseObjectAsync(ObjectReleaseMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ObjectRelease` | Diagnostic bytes |
| `PatchObjectAsync(ObjectDeltaMetadata, ReadOnlyMemory<byte>, ReadOnlyMemory<byte>, CancellationToken)` | `ObjectPatch` | Metadata body, then delta |
| `SendObjectDeltaAsync(ObjectDeltaMetadata, ReadOnlyMemory<byte>, ReadOnlyMemory<byte>, CancellationToken)` | `ObjectDelta` | Metadata body, then delta |
| `ReferenceCacheAsync(CacheReferenceMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `CacheReference` | Cache metadata |
| `ReportCacheMissAsync(CacheMissMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `CacheMiss` | Diagnostic bytes |
| `InvalidateCacheAsync(CacheInvalidateMetadata, CancellationToken)` | `CacheInvalidate` | None |

Object and cache methods never perform implicit cache lookup or JSON serialization.

## Cancellation And Late Results

After cancel or abort reaches terminal state, normal result iteration suppresses late `RESULT_PUSH`
and `PARTIAL_RESULT` frames for that operation. `RESULT_DROP_REASON` remains observable so callers can
diagnose the discarded result.

## Shutdown

`NnrpClientSession` and `NnrpClient` implement `IAsyncDisposable`. Session disposal closes its native
session and releases in-flight state. Client disposal closes owned sessions, the role connection, and
the selected provider runtime.

Managed packet/session helpers over `INnrpMessageTransport` belong to diagnostics and custom carrier
integrations; they are not aliases for this production API.
