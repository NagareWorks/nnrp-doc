# C# - Enums And Constants

The C# SDK uses the frozen NNRP/1 Preview4 names and numeric values. Public role APIs expose typed
enums; callers must not send arbitrary integers for protocol fields.

```csharp
using Nnrp.Core;
using Nnrp.Runtime;
```

## Message Types

`MessageType : byte` is grouped by wire function.

| Group | Members and values |
|---|---|
| Connection/session | `ClientHello=0x01`, `ServerHelloAck=0x02`, `SessionPatch=0x03`, `SessionPatchAck=0x04`, `Close=0x05`, `Error=0x06`, `SessionOpen=0x07`, `SessionOpenAck=0x08`, `SessionClose=0x09`, `SessionCloseAck=0x0A` |
| Data/cache/flow | `FrameSubmit=0x10`, `FrameCancel=0x11`, `ResultPush=0x12`, `ResultDrop=0x13`, `CachePut=0x14`, `CacheAck=0x15`, `CacheInvalidate=0x16`, `FlowUpdate=0x17`, `ResultHint=0x18`, `TransportProbe=0x19`, `TransportProbeAck=0x1A`, `SessionMigrate=0x1B`, `SessionMigrateAck=0x1C` |
| Keepalive | `Ping=0x20`, `Pong=0x21` |
| Runtime control | `Cancel=0x30`, `Abort=0x31`, `PriorityUpdate=0x32`, `Deadline=0x33`, `ExpireAt=0x34`, `Supersede=0x35`, `BudgetUpdate=0x36`, `Progress=0x37`, `PartialResult=0x38`, `Backpressure=0x39`, `CreditUpdate=0x3A`, `CapabilityNegotiation=0x3B`, `DegradeProfile=0x3C`, `RouteHint=0x3D`, `ExecutionHint=0x3E`, `TraceContext=0x3F`, `ResultDropReason=0x40` |
| Runtime objects/cache | `ObjectDeclare=0x41`, `ObjectRef=0x42`, `ObjectRelease=0x43`, `ObjectPatch=0x44`, `ObjectDelta=0x45`, `CacheReference=0x46`, `CacheMiss=0x47`, `ErrorRecoverable=0x48`, `RetryAfter=0x49` |

## Common Header

`HeaderFlags : uint` is a bitmask.

| Member | Value |
|---|---|
| `None` | `0x00000000` |
| `AckRequired` | `0x00000001` |
| `CanDrop` | `0x00000002` |
| `Stale` | `0x00000004` |
| `Eos` | `0x00000008` |
| `Retransmit` | `0x00000010` |
| `Keyframe` | `0x00000020` |

The wire format itself is the `byte` value `NnrpHeader.CurrentWireFormat`; the SDK does not expose a
separate `WireFormat` enum.

## Session Lifecycle

| Enum | Members |
|---|---|
| `SessionPriorityClass : byte` | `Interactive=0`, `Balanced=1`, `Background=2` |
| `SessionFlags : byte` | `None=0`, `AllowResume=0x01`, `AllowBackgroundResults=0x02`, `AllowCacheLeases=0x04`, `AllowSchemaOverride=0x08` |
| `SessionStatus : byte` | `Opened=0`, `Rejected=1`, `RetryLater=2`, `Resumed=3` |
| `SessionAckFlags : uint` | `None=0`, `ResumeEnabled=0x01`, `BackgroundResultsEnabled=0x02`, `CacheLeasesEnabled=0x04`, `SchemaOverrideEnabled=0x08`, `PriorityDowngraded=0x10` |
| `SessionCloseReason : ushort` | `Normal=0`, `ClientShutdown=1`, `ServerShutdown=2`, `IdleTimeout=3`, `ProtocolError=4`, `AuthRevoked=5` |
| `InFlightPolicy : byte` | `Drain=0`, `Abort=1` |
| `SessionCloseStatus : byte` | `Acknowledged=0`, `Draining=1`, `Closed=2`, `Rejected=3` |
| `NnrpSessionState : byte` | `Init=0`, `Negotiating=1`, `Active=2`, `Draining=3`, `Closed=4` |

`SessionErrorCode : uint`, `CacheErrorCode : uint`, and `SchemaErrorCode : uint` preserve the
namespaced protocol values. See the [protocol standard](/en/protocol/v1/) for the complete code
registry.

## Transport Selection

| Enum | Members |
|---|---|
| `TransportId : uint` | `Unspecified=0`, `Quic=1`, `Tcp=2`, `Ipc=3`, `WebSocket=4` |
| `TransportPolicy : byte` | `Auto=0`, `PreferQuic=1`, `PreferTcp=2`, `PreferIpc=3`, `PreferWebSocket=4`, `ForceQuic=5`, `ForceTcp=6`, `ForceIpc=7`, `ForceWebSocket=8` |
| `LossTolerance : byte` | `Strict=0`, `BestEffort=1`, `LowLatency=2`, `FireAndForget=3` |

`Auto` probes every installed provider and applies the deterministic comparator documented in the
[transport API](./transport). A force policy never silently selects another provider.

## Data And Results

| Enum | Members |
|---|---|
| `FrameClass : byte` | `Keyframe=0`, `Delta=1`, `Retransmit=2`, `Discardable=3` |
| `InputProfile : byte` | `Unspecified=0`, `ChangedTilesLuma=1`, `DenseLumaFrame=2` |
| `TileIndexMode : byte` | `DenseRange=0`, `RawUInt16=1`, `DeltaUInt16=2`, `Bitset=3` |
| `CodecId : byte` | `Raw=0`, `Lz4=1` |
| `DTypeId : byte` | `Float16=0`, `Float32=1`, `Float8E4M3=2`, `Float8E5M2=3`, `Int8=4`, `UInt8=5`, `Int16=6`, `UInt16=7` |
| `TensorLayoutId : byte` | `Nhwc=0`, `Nchw=1` |
| `ScalePolicy : byte` | `None=0`, `PerTensor=1`, `PerTile=2`, `PerChannel=3` |
| `SubmitMode : byte` | `Inline=0`, `Reference=1`, `Mixed=2` |
| `ResultClass : byte` | `Complete=0`, `Partial=1`, `StaleReuse=2`, `Degraded=3` |

`BudgetPolicy : byte`, `ResultFlags : ushort`, and `PayloadKind : uint` are bitmasks. Combine their
named values with `|`; do not add their numeric values.

## Cache

| Enum | Members |
|---|---|
| `CacheObjectKind : uint` | `CameraBlock=0x0001`, `TileIndexTemplate=0x0002`, `TensorSectionTable=0x0003`, `CodecTable=0x0004`, `ReusableResultObject=0x0005`, `PayloadLayoutTemplate=0x0006`, `PromptSegment=0x0007`, `ToolSchema=0x0008`, `StructuredEventSchema=0x0009` |
| `CacheAckStatus : uint` | `Accepted=0`, `Rejected=1`, `Replaced=2` |
| `CacheInvalidateScope : uint` | `WholeSession=0`, `Namespace=1`, `ObjectKind=2`, `ObjectKey=3` |
| `CachePutFlags : uint` | `None=0`, `Pinned=0x01`, `Reusable=0x02` |
| `CacheLeaseOwnerScope : byte` | `Connection=0`, `Session=1`, `Operation=2` |
| `CacheValidationFailure` | `None=0`, `Miss=1`, `LeaseExpired=2`, `VersionMismatch=3`, `DependencyInvalid=4`, `SchemaMismatch=5` |

Alias members in low-level cache enums represent identical wire values; role APIs use the canonical
member names shown above.

## Runtime Control And Objects

| Enum | Members |
|---|---|
| `RuntimeRole : byte` | `Unspecified=0`, `Client=1`, `Server=2`, `Runtime=3`, `Subagent=4`, `Tool=5`, `Scheduler=6`, `ConformanceRunner=7` |
| `RuntimeObjectKind : ushort` | `Unspecified=0`, `Tensor=1`, `TokenBlock=2`, `ImageTile=3`, `FeatureMap=4`, `ToolResult=5`, `TraceSegment=6`, `OpaqueBytes=7`, `DocumentChunk=8`, `AudioChunk=9`, `VideoChunk=10`, `RoutePlan=11`, `CacheManifest=12` |
| `MemoryLocationHint : ushort` | `Unspecified=0`, `HostMemory=1`, `DeviceMemory=2`, `SharedMemory=3`, `RemoteMemory=4`, `MmapFile=5`, `ObjectStore=6` |
| `OwnershipHint : ushort` | `Unspecified=0`, `ProducerOwned=1`, `ConsumerOwned=2`, `SessionOwned=3`, `Borrowed=4`, `TransferOnRef=5`, `ReleaseOnDrop=6` |
| `ObjectReleaseReason : ushort` | `Completed=0`, `Cancelled=1`, `Expired=2`, `Replaced=3`, `Invalidated=4`, `OwnerClosed=5`, `LeaseExpired=6`, `ConformanceInjection=7` |
| `CacheReuseScope : ushort` | `Operation=0`, `Session=1`, `Connection=2`, `Global=3`, `Tenant=4`, `Profile=5` |
| `CacheMissReason : ushort` | `Unknown=0`, `NotFound=1`, `Expired=2`, `Invalidated=3`, `SchemaMismatch=4`, `ProducerUnavailable=5`, `LeaseRequired=6`, `PermissionDenied=7` |

Runtime reason, stage, priority, pressure, executor, affinity, and result-drop code fields use the
typed Preview4 code wrappers described in the [runtime API](./runtime). Reserved and private-use
ranges are preserved; unknown values remain observable instead of being collapsed to a generic
error.
