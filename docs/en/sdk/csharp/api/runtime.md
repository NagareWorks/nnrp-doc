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

Builds the binary frame used by the WebSocket transport.

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `header` | [`RuntimeFrameHeader`](#runtimeframeheader) | Yes | Header fields except metadata/body lengths; the helper derives both lengths from the buffers. |
| `metadata` | `ReadOnlySpan<byte>` | No | Metadata payload. |
| `body` | `ReadOnlySpan<byte>` | No | Body payload. |

| Returns |
|---|
| `byte[]` |

## `NnrpWebSocketFrameCodec.Decode`

Splits one WebSocket binary frame into header, metadata slice, and body slice.

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

## Runtime Enums

| Enum | Members |
|---|---|
| `RuntimeObjectKind` | `Unspecified`, `Tensor`, `TokenBlock`, `ImageTile`, `FeatureMap`, `ToolResult`, `TraceSegment`, `OpaqueBytes`, `DocumentChunk`, `AudioChunk`, `VideoChunk`, `RoutePlan`, `CacheManifest` |
| `RuntimeRole` | `Unspecified`, `Client`, `Server`, `Runtime`, `Subagent`, `Tool`, `Scheduler`, `ConformanceRunner` |
| `MemoryLocationHint` | `Unspecified`, `HostMemory`, `DeviceMemory`, `SharedMemory`, `RemoteMemory`, `MmapFile`, `ObjectStore` |
| `OwnershipHint` | `Unspecified`, `ProducerOwned`, `ConsumerOwned`, `SessionOwned`, `Borrowed`, `TransferOnRef`, `ReleaseOnDrop` |
| `ObjectReleaseReason` | `Completed`, `Cancelled`, `Expired`, `Replaced`, `Invalidated`, `OwnerClosed`, `LeaseExpired`, `ConformanceInjection` |
| `CacheReuseScope` | `Operation`, `Session`, `Connection`, `Global`, `Tenant`, `Profile` |
| `CacheMissReason` | `Unknown`, `NotFound`, `Expired`, `Invalidated`, `SchemaMismatch`, `ProducerUnavailable`, `LeaseRequired`, `PermissionDenied` |

## `RuntimeFrameHeader`

| Property | Type | Description |
|---|---|---|
| `MessageType` | [`MessageType`](./enums.md#messagetype) | Frame message type. |
| `Flags` | [`HeaderFlags`](./enums.md#headerflags-flags) | Header flags. |
| `SessionId` | `uint` | Session id. |
| `Generation` | `uint` | Session generation. |
| `FrameId` | `uint` | Frame id. |
