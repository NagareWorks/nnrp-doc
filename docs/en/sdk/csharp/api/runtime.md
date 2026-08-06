# Runtime Control & Objects

C# Preview 4 APIs freeze the runtime-control and object-reference surface that managed packages must
implement for NNRP/1. The managed names below intentionally match the Rust metadata semantics while
using C# casing and `ReadOnlySpan<byte>` for hot paths.

## Import

```csharp
using Nnrp.Core;
using Nnrp.Runtime;
```

## `NnrpRuntimeControl.Encode`

Encodes one Preview 4 control metadata object.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `messageType` | [`MessageType`](./enums.md#messagetype) | Yes | One of the Preview 4 control message types. |
| `metadata` | [Runtime control metadata](#runtime-control-metadata) | Yes | Metadata object matching `messageType`. |
| `tail` | `ReadOnlySpan<byte>` | No | Extension bytes, diagnostic bytes, progress body, or partial-result body declared by `metadata`. |

| Returns |
|---|
| `byte[]` |

```csharp
var payload = NnrpRuntimeControl.Encode(
    MessageType.Progress,
    new ProgressMetadata(
        OperationId: 42,
        ProgressSequence: 1,
        StageCode: 2,
        PercentX100: 2500,
        ObjectId: 0,
        BodyBytes: 0));
```

## `NnrpRuntimeControl.Decode`

Decodes one control metadata payload.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `messageType` | [`MessageType`](./enums.md#messagetype) | Yes | Message type that selected the metadata layout. |
| `payload` | `ReadOnlySpan<byte>` | Yes | Metadata bytes plus the declared tail. |

| Returns |
|---|
| `DecodedRuntimeControlMetadata` |

## `NnrpRuntimeObject.Encode`

Encodes object, object-reference, object-delta, cache-reference, and cache-miss metadata.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `messageType` | [`MessageType`](./enums.md#messagetype) | Yes | One of `ObjectDeclare`, `ObjectRef`, `ObjectRelease`, `ObjectPatch`, `ObjectDelta`, `CacheReference`, or `CacheMiss`. |
| `metadata` | [Runtime object metadata](#runtime-object-metadata) | Yes | Metadata object matching `messageType`. |
| `tail` | `ReadOnlySpan<byte>` | No | Extension bytes, diagnostics, or delta payload declared by `metadata`. |

| Returns |
|---|
| `byte[]` |

## `NnrpRuntimeObject.Decode`

Decodes one runtime object or cache metadata payload.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `messageType` | [`MessageType`](./enums.md#messagetype) | Yes | Message type that selected the metadata layout. |
| `payload` | `ReadOnlySpan<byte>` | Yes | Metadata bytes plus the declared tail. |

| Returns |
|---|
| `DecodedRuntimeObjectMetadata` |

## `NnrpWebSocketFrameCodec.Encode`

`NnrpWebSocketFrameCodec` is exported by `Nnrp.Transport.WebSocket`. It builds the binary runtime
frame carried by one WebSocket binary message; text messages are never accepted as NNRP data.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `header` | [`RuntimeFrameHeader`](#runtimeframeheader) | Yes | Header fields except metadata/body lengths; the helper derives both lengths from the buffers. |
| `metadata` | `ReadOnlySpan<byte>` | No | Metadata payload. |
| `body` | `ReadOnlySpan<byte>` | No | Body payload. |

| Returns |
|---|
| `byte[]` |

## `NnrpWebSocketFrameCodec.Decode`

Decodes one WebSocket binary frame into its header plus decoder-owned metadata and body copies.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `frame` | `ReadOnlySpan<byte>` | Yes | One complete WebSocket binary message. |

| Returns |
|---|
| `DecodedRuntimeFrame` |

## `NnrpWebSocketFrameCodec.DecodeBatch`

Decodes concatenated binary frames from local buffers and conformance fixtures.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `batch` | `ReadOnlySpan<byte>` | Yes | Concatenated frames. |
| `limit` | `int` | No | Maximum decoded frames; `0` means no limit. |

| Returns |
|---|
| `IReadOnlyList<DecodedRuntimeFrame>` |

`DecodedRuntimeFrame` exposes the following immutable projection:

| Property | Type | Description |
|---|---|---|
| `Header` | [`RuntimeFrameHeader`](#runtimeframeheader) | Caller-controlled common-header fields. |
| `Metadata` | `ReadOnlyMemory<byte>` | Decoder-owned metadata copy. |
| `Body` | `ReadOnlyMemory<byte>` | Decoder-owned body copy. |

The decoder owns the backing storage for both byte regions; neither property borrows the input
buffer. Decode rejects truncated headers, metadata/body length mismatches, reserved header values,
trailing bytes in a single-frame decode, and a decoded frame count above `limit`.

## `NnrpRuntimeEvent`

`NnrpRuntimeEvent` is the immutable event returned by client and server session event pumps. Its
public properties are exactly `Header`, `Metadata`, and `Tail`. The message type is available only as
`Header.MessageType`; the event does not duplicate common-header or tail fields.

`NnrpRuntimeEventMetadata` is a closed `Kind` plus typed `Get<T>()` union.
`NnrpRuntimeEventTail` is a closed `Kind` plus `Match<TResult>(...)` union with the following
variants. `Match` requires one callback for every row, so application code cannot silently ignore a
new tail shape.

| `NnrpRuntimeEventTailKind` | Active values passed to `Match` |
|---|---|
| `None` | No value |
| `Body` | One owned `ReadOnlyMemory<byte>` body |
| `Diagnostic` | One owned `ReadOnlyMemory<byte>` diagnostic |
| `MetadataBodyAndDelta` | Independent owned `metadataBody` and `delta` values |

The event and tail types do not expose flattened `Body`, `Diagnostic`, `CapabilityEntries`,
`HintBody`, `TraceAttributes`, `ObjectMetadata`, `Delta`, or `CacheMetadata` properties. Callers
first discriminate `Metadata.Kind` and `Tail.Kind`, then use `Metadata.Get<T>()` and `Tail.Match`.

The event never exposes a raw native buffer. Native-owned data is copied or retained behind an
explicit lifetime guard before the event reaches application code.

## `NnrpPreview4CapabilityTokens`

`NnrpPreview4CapabilityTokens` is the C# projection of the frozen Preview4 capability and transport
catalog. The constants retain the exact protocol strings; SDK code must not derive or rename them.

| Constant group | C# constants | Frozen values |
| --- | --- | --- |
| Control | `ControlCancelAbort`, `ControlSupersede`, `ControlPriorityUpdate`, `ControlDeadlineExpire`, `ControlProgressPartial`, `ControlCreditBackpressure`, `ControlCapabilityCosts`, `ControlRouteExecutionHint`, `ControlTraceContext`, `ControlResultDropReason`, `ControlDegradeProfile`, `ControlBudgetUpdate`, `ControlRecoverableError` | `control.cancel_abort`, `control.supersede`, `control.priority_update`, `control.deadline_expire`, `control.progress_partial`, `control.credit_backpressure`, `control.capability_costs`, `control.route_execution_hint`, `control.trace_context`, `control.result_drop_reason`, `control.degrade_profile`, `control.budget_update`, `control.recoverable_error` |
| Runtime object and cache | `ObjectLifecycle`, `ObjectDelta`, `ObjectCost`, `ObjectOwnership`, `CacheReference` | `object.lifecycle`, `object.delta`, `object.cost`, `object.ownership`, `cache.reference` |
| Transport | `TransportTcp`, `TransportQuic`, `TransportIpc`, `TransportWebSocket` | `tcp`, `quic`, `ipc`, `websocket` |

The class also exposes read-only `Control`, `RuntimeObjectAndCache`, `Transports`, and
`AllCapabilities` collections. `AllCapabilities` excludes transport names because transport availability
is reported separately from protocol capability claims.

## Runtime Control Metadata

| Type | Message types | Frozen properties |
|---|---|---|
| `ControlRequestMetadata` | `Cancel`, `Abort` | `OperationId`, `ControlSequence`, `ReasonCode`, `SourceRole`, `Flags`, `DiagnosticBytes` |
| `SchedulingMetadata` | `PriorityUpdate`, `Deadline`, `ExpireAt` | `OperationId`, `ControlSequence`, `PriorityClass`, `PriorityDelta`, `DeadlineUnixMs`, `Flags` |
| `SupersedeMetadata` | `Supersede` | `OldOperationId`, `NewOperationId`, `ControlSequence`, `DropReasonCode`, `Flags`, `DiagnosticBytes` |
| `BudgetMetadata` | `BudgetUpdate` | `OperationId`, `ComputeBudgetUnits`, `MemoryBudgetBytes`, `BandwidthBudgetBytes`, `TokenBudget`, `Flags` |
| `ProgressMetadata` | `Progress` | `OperationId`, `ProgressSequence`, `StageCode`, `PercentX100`, `ObjectId`, `BodyBytes` |
| `PartialResultMetadata` | `PartialResult` | `OperationId`, `ResultSequence`, `ObjectId`, `DeltaSequence`, `BodyBytes`, `Flags` |
| `PressureMetadata` | `Backpressure`, `CreditUpdate` | `ScopeId`, `CreditWindow`, `PressureLevel`, `PressureReason`, `RetryAfterMs`, `Flags` |
| `CapabilityMetadata` | `CapabilityNegotiation`, `DegradeProfile` | `ProfileId`, `CapabilityCount`, `CostModelId`, `PreferenceRank`, `LimitBytes`, `LimitUnits`, `BodyBytes`, `Flags` |
| `RouteHintMetadata` | `RouteHint`, `ExecutionHint` | `OperationId`, `RouteId`, `ExecutorClass`, `AffinityClass`, `DeadlineUnixMs`, `BodyBytes`, `Flags` |
| `TraceContextMetadata` | `TraceContext` | `TraceId`, `SpanId`, `ParentSpanId`, `StageCode`, `Flags`, `BodyBytes` |
| `ResultDropReasonMetadata` | `ResultDropReason` | `OperationId`, `ResultSequence`, `DropReasonCode`, `SourceRole`, `Flags`, `DiagnosticBytes` |
| `RecoverableErrorMetadata` | `ErrorRecoverable` | `ErrorCode`, `ErrorScope`, `RecoveryAction`, `SourceRole`, `Flags`, `RetryAfterMs`, `RelatedSessionId`, `RelatedFrameId`, `RelatedViewId`, `DiagnosticBytes` |
| `RetryAfterMetadata` | `RetryAfter` | `ScopeId`, `ControlSequence`, `RetryAfterMs`, `JitterMs`, `ReasonCode`, `SourceRole`, `Flags`, `DiagnosticBytes` |

`SupersedeMetadata.DropReasonCode` and `ResultDropReasonMetadata.DropReasonCode` are
`NnrpResultDropReasonCode`, not raw `ushort` values. Encoders and decoders reject the reserved
`0x000a..0x7fff` range; `0x8000..0xffff` remains available for private extensions as frozen by the
runtime-control value registry.

## Runtime Object Metadata

| Type | Message types | Frozen properties |
|---|---|---|
| `ObjectDescriptorMetadata` | `ObjectDeclare` | `ObjectId`, `ObjectKind`, `ProducerRole`, `ConsumerRole`, `SessionId`, `ByteSize`, `ComputeCostUnits`, `MemoryLocationHint`, `OwnershipHint`, `LifetimeHintMs`, `MetadataBytes` |
| `ObjectReferenceMetadata` | `ObjectRef` | `ObjectId`, `OperationId`, `ObjectVersion`, `Offset`, `Length`, `Flags`, `MetadataBytes` |
| `ObjectReleaseMetadata` | `ObjectRelease` | `ObjectId`, `OperationId`, `ReleaseReason`, `SourceRole`, `Flags`, `DiagnosticBytes` |
| `ObjectDeltaMetadata` | `ObjectPatch`, `ObjectDelta` | `ObjectId`, `DeltaSequence`, `RegionOffset`, `RegionBytes`, `DeltaBytes`, `Flags`, `MetadataBytes` |
| `CacheReferenceMetadata` | `CacheReference` | `CacheNamespace`, `CacheKeyHi`, `CacheKeyLo`, `ProfileId`, `ReuseScope`, `LeaseId`, `ProducerTraceId`, `ExpirationHintMs`, `MetadataBytes`, `Flags` |
| `CacheMissMetadata` | `CacheMiss` | `CacheNamespace`, `CacheKeyHi`, `CacheKeyLo`, `MissReason`, `ProfileId`, `DiagnosticBytes` |

`CacheNamespace` is `uint`; both cache-key words are `ulong`. `CachePutMetadata`, `CacheAckMetadata`,
`CacheInvalidateMetadata`, and `ObjectReferenceBlock` use the same widths and names.

## Local Cache Lease State

`NnrpCacheLease` is the validated C# value for a granted lease. It is not a wire payload or a native handle.

| C# property | Type | Protocol field |
|---|---|---|
| `ObjectId` | `NnrpCacheObjectId` | `object_id` |
| `ObjectVersion` | `ulong` | `object_version` |
| `LeaseId` | `ulong` | `lease_id` |
| `OwnerScope` | `CacheLeaseOwnerScope` | `owner_scope` |
| `OwnerId` | `ulong` | `owner_id` |
| `GrantedAtMilliseconds` | `ulong` | `granted_at_ms` |
| `TtlMilliseconds` | `uint` | `ttl_ms` |

`NnrpCacheObjectId` contains `CacheNamespace: uint`, `CacheKeyHigh: ulong`, `CacheKeyLow: ulong`,
and `ObjectKind: CacheObjectKind`. `CacheLeaseOwnerScope` is `Connection = 0`, `Session = 1`, or
`Operation = 2`. Use `ExpiresAtMilliseconds`, `TryValidateLiveAt`, and `TryValidateVersion` for local validation.

`NnrpCacheObjectVersion` binds that complete object identity to `ObjectVersion`, `SchemaId`, and
`SchemaVersion`. `NnrpCacheLeaseResult` is the closed result returned by native cache operations:

| C# property | Type |
|---|---|
| `ObjectId` | `NnrpCacheObjectId` |
| `Outcome` | `NnrpCacheLeaseOutcome` |
| `Lease` | `NnrpCacheLease?` |
| `ObjectVersion` | `NnrpCacheObjectVersion?` |
| `Diagnostic` | `string?` |

`NnrpCacheLeaseOutcome` is `Valid`, `Expired`, `Renewed`, `Released`, or `Missing`. A present lease
or object-version value must carry the same complete object identity as `ObjectId`.

## `CachePolicyOptions`

`CachePolicyOptions` is the local opt-in policy described by the runtime-control profile. It never
performs a lookup or serializes a cache frame by itself.

| C# property | Type | Default |
| --- | --- | --- |
| `Enabled` | `bool` | `false` |
| `ReuseScope` | `CacheReuseScope?` | `null` |
| `ExpirationHintMilliseconds` | `ulong` | `0` |
| `InvalidationReason` | `CachePolicyInvalidationReason` | `Explicit` |

`CachePolicyInvalidationReason` has `Explicit`, `DependencyInvalidated`, `LeaseExpired`,
`VersionMismatch`, and `SchemaMismatch`. Enabling the policy requires `ReuseScope`; disabling it
requires `ReuseScope == null` and `ExpirationHintMilliseconds == 0`.

## Connection And Session Lifecycle

`NnrpConnectionLifecycle` is the application-facing Preview4 lifecycle model. It starts in `Open`,
keeps sessions ordered by session id, and exposes immutable session snapshots through `Sessions`,
`TryGetSession`, and `Snapshot`. `TryCloseConnection` moves the connection and every installed
session to `Closed`.

`NnrpSessionLifecycle` exposes the frozen session snapshot fields: `SessionId`, `State`, `ProfileId`,
`PriorityClass`, `SchemaId`, `SchemaVersion`, `MaxInFlightOperations`, `RouteScopeId`,
`LastOperationId`, and `SessionErrorCode`. `AcceptsSessionScopedMessages` and
`AcceptsNewOperations` are derived C# convenience properties, not additional wire fields.

The transition methods are `TryApplySessionOpenAck`, `TryBeginSessionClose`,
`TryApplySessionCloseAck`, and `TryValidateFlowUpdate`. A rejected close acknowledgement restores
the session's established `Open` or `Resumed` state. Unknown close-status values return an
`NnrpProtocolFailure`; `Try` methods do not translate malformed peer state into language exceptions.

## Schema Registry

`NnrpSchemaDescriptorHeader` is the 32-byte C# projection of the frozen schema descriptor header.
It exposes schema identity and version, profile assignment, flags, supported protocol-version
range, body size, dependency count, default stream semantics, and schema hash. Use `TryParse` and
`TryWrite` for validated wire access.

`NnrpSchemaRegistry` stores descriptors by `(SchemaId, SchemaVersion)`. `WithStandardProfiles`
installs the standard bindings; `TryInstall`, `TryGet`, `TryInvalidate`, and
`TryValidateDescriptorBinding` implement the public registry lifecycle. `SchemaRegistryAction`
reports whether an install was new, already present, updated, or invalidated, while
`SchemaErrorCode` carries protocol-defined failures.

## Native Object Delta Metadata Copies

`NnrpNativeRuntimeObjects` owns the Rust-backed metadata buffer helpers. Both methods return an
`NnrpNativeObjectMetadataBuffer` that must be disposed.

| Method | Parameters | Payload layout |
| --- | --- | --- |
| `AcquireObjectPatchMetadataCopy` | `ObjectDeltaMetadata metadata`, `byte[] metadataTail`, `byte[] delta` | `ObjectPatch` metadata + metadata tail + delta bytes |
| `AcquireObjectDeltaMetadataCopy` | `ObjectDeltaMetadata metadata`, `byte[] metadataTail`, `byte[] delta` | `ObjectDelta` metadata + metadata tail + delta bytes |

Both helpers validate `MetadataBytes` and `DeltaBytes` before acquiring the native-owned copy.

## Runtime Enums

| Enum | Members |
|---|---|
| `NnrpOperationState : byte` | `Accepted = 0`, `Running = 1`, `Partial = 2`, `WaitingTool = 3`, `Superseded = 4`, `Cancelled = 5`, `Failed = 6`, `Completed = 7` |
| `NnrpResultTerminalState : byte` | `Success = 0`, `Cancelled = 1`, `Dropped = 2`, `Error = 3` |
| `NnrpResultDropReasonCode : ushort` | `None = 0`, `DeadlineExpired = 1`, `Superseded = 2`, `PeerCancelled = 3`, `Backpressure = 4`, `CapabilityMismatch = 5`, `BudgetExceeded = 6`, `ObjectInvalidated = 7`, `TransportClosed = 8`, `ConformanceInjection = 9` |
| `RuntimeObjectKind` | `Unspecified`, `Tensor`, `TokenBlock`, `ImageTile`, `FeatureMap`, `ToolResult`, `TraceSegment`, `OpaqueBytes`, `DocumentChunk`, `AudioChunk`, `VideoChunk`, `RoutePlan`, `CacheManifest` |
| `RuntimeRole` | `Unspecified`, `Client`, `Server`, `Runtime`, `Subagent`, `Tool`, `Scheduler`, `ConformanceRunner` |
| `MemoryLocationHint` | `Unspecified`, `HostMemory`, `DeviceMemory`, `SharedMemory`, `RemoteMemory`, `MmapFile`, `ObjectStore` |
| `OwnershipHint` | `Unspecified`, `ProducerOwned`, `ConsumerOwned`, `SessionOwned`, `Borrowed`, `TransferOnRef`, `ReleaseOnDrop` |
| `ObjectReleaseReason` | `Completed`, `Cancelled`, `Expired`, `Replaced`, `Invalidated`, `OwnerClosed`, `LeaseExpired`, `ConformanceInjection` |
| `CacheReuseScope` | `Operation`, `Session`, `Connection`, `Global`, `Tenant`, `Profile` |
| `CacheMissReason` | `Unknown`, `NotFound`, `Expired`, `Invalidated`, `SchemaMismatch`, `ProducerUnavailable`, `LeaseRequired`, `PermissionDenied` |

`NnrpOperationState` and `NnrpResultTerminalState` mirror the canonical Rust `OperationState` and
`ResultTerminalState` registries exactly. The terminal mapping is `Completed -> Success`,
`Cancelled -> Cancelled`, `Superseded -> Dropped`, and `Failed -> Error`; non-terminal operation
states have no terminal result state.

## `RuntimeFrameHeader`

`RuntimeFrameHeader` is exported by `Nnrp.Core` as an immutable record struct. It is the role-neutral
header projection used by runtime events and `NnrpWebSocketFrameCodec`; it is not a second protocol
header version. It contains every caller-controlled common-header field and does not contain native
handle or session generation state.

| Property | Type | Description |
|---|---|---|
| `MessageType` | [`MessageType`](./enums.md#messagetype) | Frame message type. |
| `Flags` | [`HeaderFlags`](./enums.md#headerflags-flags) | Header flags. |
| `SessionId` | `uint` | Session id. |
| `FrameId` | `uint` | Frame id. |
| `ViewId` | `ushort` | Logical lane or view id. |
| `RouteId` | `ushort` | Route or scheduling id. |
| `TraceId` | `ulong` | End-to-end trace id. |
| `VersionMajor` | `byte` | Protocol major; defaults to `NnrpHeader.CurrentVersionMajor`. |
| `WireFormat` | `byte` | Wire format; defaults to `NnrpHeader.CurrentWireFormat`. |

`MessageType` is required; the remaining values use their protocol zero/current defaults. The codec
writes the fixed magic and 40-byte header length, and derives metadata and body lengths from the
provided buffers. Decode returns the same nine caller-controlled fields.
