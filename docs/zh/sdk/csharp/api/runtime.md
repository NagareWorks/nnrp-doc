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

`NnrpWebSocketFrameCodec` 由 `Nnrp.Transport.WebSocket` 导出。它构建一个 WebSocket binary
message 承载的二进制 runtime frame；text message 永远不能作为 NNRP data。

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

`DecodedRuntimeFrame` 暴露 `Header`、owned `Metadata` 和 owned `Body`。Decode 会拒绝截断
header、metadata/body 长度不匹配、reserved header 值、single-frame decode 中的 trailing byte，
以及超过 `limit` 的 frame 数量。

## `NnrpRuntimeEvent`

`NnrpRuntimeEvent` 是 client/server session event pump 返回的不可变事件，包含 `Header`、
`MessageType`、匹配的 typed metadata 和语义化 tail。

| 事件类别 | 语义化 tail 属性 |
|---|---|
| Cancel、abort、supersede、result drop、recoverable error、retry after | `Diagnostic` |
| Progress 和 partial result | `Body` |
| Capability negotiation 和 profile degradation | `CapabilityEntries` |
| Route 和 execution hint | `HintBody` |
| Trace context | `TraceAttributes` |
| Object declare/ref | `ObjectMetadata` |
| Object patch/delta | `ObjectMetadata` 后接 `Delta` |
| Cache reference | `CacheMetadata` |

事件不暴露 raw native buffer。Native-owned 数据必须复制，或在到达应用前放进显式 lifetime
guard。

## `NnrpPreview4CapabilityTokens`

`NnrpPreview4CapabilityTokens` 是 Preview4 冻结 capability 与 transport 目录的 C# 映射。常量必须
保留协议原始字符串；SDK 代码不得自行推导或改名。

| 常量分组 | C# 常量 | 冻结值 |
| --- | --- | --- |
| 控制面 | `ControlCancelAbort`、`ControlSupersede`、`ControlPriorityUpdate`、`ControlDeadlineExpire`、`ControlProgressPartial`、`ControlCreditBackpressure`、`ControlCapabilityCosts`、`ControlRouteExecutionHint`、`ControlTraceContext`、`ControlResultDropReason`、`ControlDegradeProfile`、`ControlBudgetUpdate`、`ControlRecoverableError` | `control.cancel_abort`、`control.supersede`、`control.priority_update`、`control.deadline_expire`、`control.progress_partial`、`control.credit_backpressure`、`control.capability_costs`、`control.route_execution_hint`、`control.trace_context`、`control.result_drop_reason`、`control.degrade_profile`、`control.budget_update`、`control.recoverable_error` |
| 运行时对象与缓存 | `ObjectLifecycle`、`ObjectDelta`、`ObjectCost`、`ObjectOwnership`、`CacheReference` | `object.lifecycle`、`object.delta`、`object.cost`、`object.ownership`、`cache.reference` |
| 传输 | `TransportTcp`、`TransportQuic`、`TransportIpc`、`TransportWebSocket` | `tcp`、`quic`、`ipc`、`websocket` |

该类还公开只读 `Control`、`RuntimeObjectAndCache`、`Transports` 和 `AllCapabilities` 集合。
`AllCapabilities` 不包含 transport 名称，因为 transport 可用性与协议 capability 声明分开上报。

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

`SupersedeMetadata.DropReasonCode` 和 `ResultDropReasonMetadata.DropReasonCode` 的类型固定为
`NnrpResultDropReasonCode`，不再暴露裸 `ushort`。编码器与解码器必须拒绝保留范围
`0x000a..0x7fff`；根据运行时控制取值注册表，`0x8000..0xffff` 仍用于私有扩展。

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

## `CachePolicyOptions`

`CachePolicyOptions` 是 runtime-control profile 定义的本地显式启用策略。它本身不会执行查询，
也不会自动序列化缓存帧。

| C# 属性 | 类型 | 默认值 |
| --- | --- | --- |
| `Enabled` | `bool` | `false` |
| `ReuseScope` | `CacheReuseScope?` | `null` |
| `ExpirationHintMilliseconds` | `ulong` | `0` |
| `InvalidationReason` | `CachePolicyInvalidationReason` | `Explicit` |

`CachePolicyInvalidationReason` 包含 `Explicit`、`DependencyInvalidated`、`LeaseExpired`、
`VersionMismatch` 和 `SchemaMismatch`。启用策略时必须提供 `ReuseScope`；禁用时要求
`ReuseScope == null` 且 `ExpirationHintMilliseconds == 0`。

## Native Object Delta Metadata Copies

`NnrpNativeRuntimeObjects` 负责 Rust-backed metadata buffer helper。两个方法都返回必须释放的
`NnrpNativeObjectMetadataBuffer`。

| 方法 | 参数 | Payload 布局 |
| --- | --- | --- |
| `AcquireObjectPatchMetadataCopy` | `ObjectDeltaMetadata metadata`, `byte[] metadataTail`, `byte[] delta` | `ObjectPatch` metadata + metadata tail + delta bytes |
| `AcquireObjectDeltaMetadataCopy` | `ObjectDeltaMetadata metadata`, `byte[] metadataTail`, `byte[] delta` | `ObjectDelta` metadata + metadata tail + delta bytes |

两个 helper 都会在申请 native-owned copy 前校验 `MetadataBytes` 和 `DeltaBytes`。

## 运行时枚举

| 枚举 | 成员 |
|---|---|
| `NnrpOperationState : byte` | `Accepted = 0`、`Running = 1`、`Partial = 2`、`WaitingTool = 3`、`Superseded = 4`、`Cancelled = 5`、`Failed = 6`、`Completed = 7` |
| `NnrpResultTerminalState : byte` | `Success = 0`、`Cancelled = 1`、`Dropped = 2`、`Error = 3` |
| `NnrpResultDropReasonCode : ushort` | `None = 0`、`DeadlineExpired = 1`、`Superseded = 2`、`PeerCancelled = 3`、`Backpressure = 4`、`CapabilityMismatch = 5`、`BudgetExceeded = 6`、`ObjectInvalidated = 7`、`TransportClosed = 8`、`ConformanceInjection = 9` |
| `RuntimeObjectKind` | `Unspecified`, `Tensor`, `TokenBlock`, `ImageTile`, `FeatureMap`, `ToolResult`, `TraceSegment`, `OpaqueBytes`, `DocumentChunk`, `AudioChunk`, `VideoChunk`, `RoutePlan`, `CacheManifest` |
| `RuntimeRole` | `Unspecified`, `Client`, `Server`, `Runtime`, `Subagent`, `Tool`, `Scheduler`, `ConformanceRunner` |
| `MemoryLocationHint` | `Unspecified`, `HostMemory`, `DeviceMemory`, `SharedMemory`, `RemoteMemory`, `MmapFile`, `ObjectStore` |
| `OwnershipHint` | `Unspecified`, `ProducerOwned`, `ConsumerOwned`, `SessionOwned`, `Borrowed`, `TransferOnRef`, `ReleaseOnDrop` |
| `ObjectReleaseReason` | `Completed`, `Cancelled`, `Expired`, `Replaced`, `Invalidated`, `OwnerClosed`, `LeaseExpired`, `ConformanceInjection` |
| `CacheReuseScope` | `Operation`, `Session`, `Connection`, `Global`, `Tenant`, `Profile` |
| `CacheMissReason` | `Unknown`, `NotFound`, `Expired`, `Invalidated`, `SchemaMismatch`, `ProducerUnavailable`, `LeaseRequired`, `PermissionDenied` |

`NnrpOperationState` 与 `NnrpResultTerminalState` 严格映射 canonical Rust 的 `OperationState` 和
`ResultTerminalState` 注册表。终态映射固定为 `Completed -> Success`、`Cancelled -> Cancelled`、
`Superseded -> Dropped`、`Failed -> Error`；非终态 operation 不存在 terminal result state。

## `RuntimeFrameHeader`

`RuntimeFrameHeader` 由 `Nnrp.Core` 以不可变 record struct 导出，是 runtime event 和
`NnrpWebSocketFrameCodec` 共用的 role-neutral header projection，不是第二套协议 header。它包含
所有调用方可控的公共头字段，不包含 native handle 或 session 的 generation 状态。

| 属性 | 类型 | 说明 |
|---|---|---|
| `MessageType` | [`MessageType`](./enums.md#messagetype) | 帧消息类型。 |
| `Flags` | [`HeaderFlags`](./enums.md#headerflags-flags) | Header flags。 |
| `SessionId` | `uint` | Session id。 |
| `FrameId` | `uint` | Frame id。 |
| `ViewId` | `ushort` | 逻辑 lane 或 view id。 |
| `RouteId` | `ushort` | 路由或调度 id。 |
| `TraceId` | `ulong` | 端到端 trace id。 |
| `VersionMajor` | `byte` | 协议主版本；默认使用 `NnrpHeader.CurrentVersionMajor`。 |
| `WireFormat` | `byte` | Wire format；默认使用 `NnrpHeader.CurrentWireFormat`。 |

`MessageType` 必填，其余值使用协议零值或当前版本默认值。Codec 写入固定 magic 和 40-byte header
length，并从传入 buffer 推导 metadata/body 长度。Decode 必须无损返回上述九个调用方可控字段。
