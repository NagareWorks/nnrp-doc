# 运行时控制与对象

C# Preview 4 API 固定 NNRP/1 托管侧必须实现的运行时控制和对象引用接口。命名采用 C# 风格，
热路径使用 `ReadOnlySpan<byte>`，语义与 Rust metadata 保持一致。

## 导入

```csharp
using Nnrp.Core;
using Nnrp.Runtime;
```

## `NnrpRuntimeControl.Encode`

编码一个 Preview 4 控制面 metadata。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `messageType` | [`MessageType`](./enums.md#messagetype) | 是 | Preview 4 控制消息类型。 |
| `metadata` | [运行时控制 metadata](#运行时控制-metadata) | 是 | 与 `messageType` 匹配的数据结构。 |
| `tail` | `ReadOnlySpan<byte>` | 否 | 扩展字节、诊断字节、进度 body 或 partial result body。 |

| 返回 |
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

解码一个控制面 metadata payload。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `messageType` | [`MessageType`](./enums.md#messagetype) | 是 | 决定 metadata 布局的消息类型。 |
| `payload` | `ReadOnlySpan<byte>` | 是 | metadata 字节和声明的 tail。 |

| 返回 |
|---|
| `DecodedRuntimeControlMetadata` |

## `NnrpRuntimeObject.Encode`

编码对象、对象引用、对象增量、缓存引用和缓存 miss metadata。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `messageType` | [`MessageType`](./enums.md#messagetype) | 是 | `ObjectDeclare`、`ObjectRef`、`ObjectRelease`、`ObjectPatch`、`ObjectDelta`、`CacheReference` 或 `CacheMiss`。 |
| `metadata` | [运行时对象 metadata](#运行时对象-metadata) | 是 | 与 `messageType` 匹配的数据结构。 |
| `tail` | `ReadOnlySpan<byte>` | 否 | 扩展字节、诊断字节或 delta payload。 |

| 返回 |
|---|
| `byte[]` |

## `NnrpRuntimeObject.Decode`

解码一个运行时对象或缓存 metadata payload。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `messageType` | [`MessageType`](./enums.md#messagetype) | 是 | 决定 metadata 布局的消息类型。 |
| `payload` | `ReadOnlySpan<byte>` | 是 | metadata 字节和声明的 tail。 |

| 返回 |
|---|
| `DecodedRuntimeObjectMetadata` |

## `NnrpWebSocketFrameCodec.Encode`

构造 WebSocket 传输层使用的二进制帧。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `header` | [`RuntimeFrameHeader`](#runtimeframeheader) | 是 | 除 metadata/body 长度之外的 header 字段；函数从 buffer 长度推导。 |
| `metadata` | `ReadOnlySpan<byte>` | 否 | metadata payload。 |
| `body` | `ReadOnlySpan<byte>` | 否 | body payload。 |

| 返回 |
|---|
| `byte[]` |

## `NnrpWebSocketFrameCodec.Decode`

拆分一个 WebSocket 二进制帧。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `frame` | `ReadOnlySpan<byte>` | 是 | 一个完整 WebSocket binary message。 |

| 返回 |
|---|
| `DecodedRuntimeFrame` |

## `NnrpWebSocketFrameCodec.DecodeBatch`

解码本地 buffer 或测试夹具里的连续二进制帧。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `batch` | `ReadOnlySpan<byte>` | 是 | 连续帧。 |
| `limit` | `int` | 否 | 最大解码帧数；`0` 表示不限制。 |

| 返回 |
|---|
| `IReadOnlyList<DecodedRuntimeFrame>` |

## 运行时控制 Metadata

| 类型 | 消息类型 | 冻结属性 |
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

## 运行时对象 Metadata

| 类型 | 消息类型 | 冻结属性 |
|---|---|---|
| `ObjectDescriptorMetadata` | `ObjectDeclare` | `ObjectId`, `ObjectKind`, `ProducerRole`, `ConsumerRole`, `SessionId`, `ByteSize`, `ComputeCostUnits`, `MemoryLocationHint`, `OwnershipHint`, `LifetimeHintMs`, `MetadataBytes` |
| `ObjectReferenceMetadata` | `ObjectRef` | `ObjectId`, `OperationId`, `ObjectVersion`, `Offset`, `Length`, `Flags`, `MetadataBytes` |
| `ObjectReleaseMetadata` | `ObjectRelease` | `ObjectId`, `OperationId`, `ReleaseReason`, `SourceRole`, `Flags`, `DiagnosticBytes` |
| `ObjectDeltaMetadata` | `ObjectPatch`, `ObjectDelta` | `ObjectId`, `DeltaSequence`, `RegionOffset`, `RegionBytes`, `DeltaBytes`, `Flags`, `MetadataBytes` |
| `CacheReferenceMetadata` | `CacheReference` | `CacheNamespace`, `CacheKeyHi`, `CacheKeyLo`, `ProfileId`, `ReuseScope`, `LeaseId`, `ProducerTraceId`, `ExpirationHintMs`, `MetadataBytes`, `Flags` |
| `CacheMissMetadata` | `CacheMiss` | `CacheNamespace`, `CacheKeyHi`, `CacheKeyLo`, `MissReason`, `ProfileId`, `DiagnosticBytes` |

`CacheNamespace` 类型为 `uint`，两个 cache-key word 类型均为 `ulong`。`CachePutMetadata`、
`CacheAckMetadata`、`CacheInvalidateMetadata` 和 `ObjectReferenceBlock` 使用相同字段宽度与命名。

## 本地缓存租约状态

`NnrpCacheLease` 是已经授予租约的 C# 本地校验值，不是 wire payload，也不是 native handle。

| C# 属性 | 类型 | 协议字段 |
|---|---|---|
| `ObjectId` | `NnrpCacheObjectId` | `object_id` |
| `ObjectVersion` | `ulong` | `object_version` |
| `LeaseId` | `ulong` | `lease_id` |
| `OwnerScope` | `CacheLeaseOwnerScope` | `owner_scope` |
| `OwnerId` | `ulong` | `owner_id` |
| `GrantedAtMilliseconds` | `ulong` | `granted_at_ms` |
| `TtlMilliseconds` | `uint` | `ttl_ms` |

`NnrpCacheObjectId` 包含 `CacheNamespace: uint`、`CacheKeyHigh: ulong`、`CacheKeyLow: ulong`
和 `ObjectKind: CacheObjectKind`。`CacheLeaseOwnerScope` 的取值为 `Connection = 0`、`Session = 1`
或 `Operation = 2`。本地校验应使用 `ExpiresAtMilliseconds`、`TryValidateLiveAt` 和 `TryValidateVersion`。

## 运行时枚举

| 枚举 | 成员 |
|---|---|
| `RuntimeObjectKind` | `Unspecified`, `Tensor`, `TokenBlock`, `ImageTile`, `FeatureMap`, `ToolResult`, `TraceSegment`, `OpaqueBytes`, `DocumentChunk`, `AudioChunk`, `VideoChunk`, `RoutePlan`, `CacheManifest` |
| `RuntimeRole` | `Unspecified`, `Client`, `Server`, `Runtime`, `Subagent`, `Tool`, `Scheduler`, `ConformanceRunner` |
| `MemoryLocationHint` | `Unspecified`, `HostMemory`, `DeviceMemory`, `SharedMemory`, `RemoteMemory`, `MmapFile`, `ObjectStore` |
| `OwnershipHint` | `Unspecified`, `ProducerOwned`, `ConsumerOwned`, `SessionOwned`, `Borrowed`, `TransferOnRef`, `ReleaseOnDrop` |
| `ObjectReleaseReason` | `Completed`, `Cancelled`, `Expired`, `Replaced`, `Invalidated`, `OwnerClosed`, `LeaseExpired`, `ConformanceInjection` |
| `CacheReuseScope` | `Operation`, `Session`, `Connection`, `Global`, `Tenant`, `Profile` |
| `CacheMissReason` | `Unknown`, `NotFound`, `Expired`, `Invalidated`, `SchemaMismatch`, `ProducerUnavailable`, `LeaseRequired`, `PermissionDenied` |

## `RuntimeFrameHeader`

| 属性 | 类型 | 说明 |
|---|---|---|
| `MessageType` | [`MessageType`](./enums.md#messagetype) | 帧消息类型。 |
| `Flags` | [`HeaderFlags`](./enums.md#headerflags-flags) | Header flags。 |
| `SessionId` | `uint` | Session id。 |
| `Generation` | `uint` | Session generation。 |
| `FrameId` | `uint` | Frame id。 |
