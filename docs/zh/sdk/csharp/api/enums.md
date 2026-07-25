# C# - 枚举与常量

C# SDK 使用 NNRP/1 Preview4 冻结的名称和数值。公共角色 API 暴露 typed enum；调用者不得向协议
字段传入任意整数。

```csharp
using Nnrp.Core;
using Nnrp.Runtime;
```

## 消息类型

`MessageType : byte` 按线路职责分组。

| 分组 | 成员与数值 |
|---|---|
| 连接/会话 | `ClientHello=0x01`, `ServerHelloAck=0x02`, `SessionPatch=0x03`, `SessionPatchAck=0x04`, `Close=0x05`, `Error=0x06`, `SessionOpen=0x07`, `SessionOpenAck=0x08`, `SessionClose=0x09`, `SessionCloseAck=0x0A` |
| 数据/缓存/流控 | `FrameSubmit=0x10`, `FrameCancel=0x11`, `ResultPush=0x12`, `ResultDrop=0x13`, `CachePut=0x14`, `CacheAck=0x15`, `CacheInvalidate=0x16`, `FlowUpdate=0x17`, `ResultHint=0x18`, `TransportProbe=0x19`, `TransportProbeAck=0x1A`, `SessionMigrate=0x1B`, `SessionMigrateAck=0x1C` |
| 保活 | `Ping=0x20`, `Pong=0x21` |
| 运行时控制 | `Cancel=0x30`, `Abort=0x31`, `PriorityUpdate=0x32`, `Deadline=0x33`, `ExpireAt=0x34`, `Supersede=0x35`, `BudgetUpdate=0x36`, `Progress=0x37`, `PartialResult=0x38`, `Backpressure=0x39`, `CreditUpdate=0x3A`, `CapabilityNegotiation=0x3B`, `DegradeProfile=0x3C`, `RouteHint=0x3D`, `ExecutionHint=0x3E`, `TraceContext=0x3F`, `ResultDropReason=0x40` |
| 运行时对象/缓存 | `ObjectDeclare=0x41`, `ObjectRef=0x42`, `ObjectRelease=0x43`, `ObjectPatch=0x44`, `ObjectDelta=0x45`, `CacheReference=0x46`, `CacheMiss=0x47`, `ErrorRecoverable=0x48`, `RetryAfter=0x49` |

## 公共帧头

`HeaderFlags : uint` 是位掩码。

| 成员 | 数值 |
|---|---|
| `None` | `0x00000000` |
| `AckRequired` | `0x00000001` |
| `CanDrop` | `0x00000002` |
| `Stale` | `0x00000004` |
| `Eos` | `0x00000008` |
| `Retransmit` | `0x00000010` |
| `Keyframe` | `0x00000020` |

Wire format 本身使用 `NnrpHeader.CurrentWireFormat` 的 `byte` 数值；SDK 不暴露独立的
`WireFormat` 枚举。

## 会话生命周期

| 枚举 | 成员 |
|---|---|
| `SessionPriorityClass : byte` | `Interactive=0`, `Balanced=1`, `Background=2` |
| `SessionFlags : byte` | `None=0`, `AllowResume=0x01`, `AllowBackgroundResults=0x02`, `AllowCacheLeases=0x04`, `AllowSchemaOverride=0x08` |
| `SessionStatus : byte` | `Opened=0`, `Rejected=1`, `RetryLater=2`, `Resumed=3` |
| `SessionAckFlags : uint` | `None=0`, `ResumeEnabled=0x01`, `BackgroundResultsEnabled=0x02`, `CacheLeasesEnabled=0x04`, `SchemaOverrideEnabled=0x08`, `PriorityDowngraded=0x10` |
| `SessionCloseReason : ushort` | `Normal=0`, `ClientShutdown=1`, `ServerShutdown=2`, `IdleTimeout=3`, `ProtocolError=4`, `AuthRevoked=5` |
| `InFlightPolicy : byte` | `Drain=0`, `Abort=1` |
| `SessionCloseStatus : byte` | `Acknowledged=0`, `Draining=1`, `Closed=2`, `Rejected=3` |
| `NnrpSessionState : byte` | `Init=0`, `Negotiating=1`, `Active=2`, `Draining=3`, `Closed=4` |

`SessionErrorCode : uint`、`CacheErrorCode : uint` 和 `SchemaErrorCode : uint` 保留协议命名空间
数值。完整 code registry 见[协议标准](/zh/protocol/v1/)。

## 传输选择

| 枚举 | 成员 |
|---|---|
| `TransportId : uint` | `Unspecified=0`, `Quic=1`, `Tcp=2`, `Ipc=3`, `WebSocket=4` |
| `TransportPolicy : byte` | `Auto=0`, `PreferQuic=1`, `PreferTcp=2`, `PreferIpc=3`, `PreferWebSocket=4`, `ForceQuic=5`, `ForceTcp=6`, `ForceIpc=7`, `ForceWebSocket=8` |
| `LossTolerance : byte` | `Strict=0`, `BestEffort=1`, `LowLatency=2`, `FireAndForget=3` |

`Auto` 探测所有已安装 provider，并应用[传输 API](./transport) 定义的确定性比较器。Force 策略
绝不会静默选择其他 provider。

## 数据与结果

| 枚举 | 成员 |
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

`BudgetPolicy : byte`、`ResultFlags : ushort` 和 `PayloadKind : uint` 都是位掩码。使用 `|` 合并
命名值，不要将其数值相加。

## 缓存

| 枚举 | 成员 |
|---|---|
| `CacheObjectKind : uint` | `CameraBlock=0x0001`, `TileIndexTemplate=0x0002`, `TensorSectionTable=0x0003`, `CodecTable=0x0004`, `ReusableResultObject=0x0005`, `PayloadLayoutTemplate=0x0006`, `PromptSegment=0x0007`, `ToolSchema=0x0008`, `StructuredEventSchema=0x0009` |
| `CacheAckStatus : uint` | `Accepted=0`, `Rejected=1`, `Replaced=2` |
| `CacheInvalidateScope : uint` | `WholeSession=0`, `Namespace=1`, `ObjectKind=2`, `ObjectKey=3` |
| `CachePutFlags : uint` | `None=0`, `Pinned=0x01`, `Reusable=0x02` |
| `CacheLeaseOwnerScope : byte` | `Connection=0`, `Session=1`, `Operation=2` |
| `CacheValidationFailure` | `None=0`, `Miss=1`, `LeaseExpired=2`, `VersionMismatch=3`, `DependencyInvalid=4`, `SchemaMismatch=5` |

底层缓存枚举中的 alias member 表示相同线路值；角色 API 使用上表列出的规范成员名。

## 运行时控制与对象

| 枚举 | 成员 |
|---|---|
| `RuntimeRole : byte` | `Unspecified=0`, `Client=1`, `Server=2`, `Runtime=3`, `Subagent=4`, `Tool=5`, `Scheduler=6`, `ConformanceRunner=7` |
| `RuntimeObjectKind : ushort` | `Unspecified=0`, `Tensor=1`, `TokenBlock=2`, `ImageTile=3`, `FeatureMap=4`, `ToolResult=5`, `TraceSegment=6`, `OpaqueBytes=7`, `DocumentChunk=8`, `AudioChunk=9`, `VideoChunk=10`, `RoutePlan=11`, `CacheManifest=12` |
| `MemoryLocationHint : ushort` | `Unspecified=0`, `HostMemory=1`, `DeviceMemory=2`, `SharedMemory=3`, `RemoteMemory=4`, `MmapFile=5`, `ObjectStore=6` |
| `OwnershipHint : ushort` | `Unspecified=0`, `ProducerOwned=1`, `ConsumerOwned=2`, `SessionOwned=3`, `Borrowed=4`, `TransferOnRef=5`, `ReleaseOnDrop=6` |
| `ObjectReleaseReason : ushort` | `Completed=0`, `Cancelled=1`, `Expired=2`, `Replaced=3`, `Invalidated=4`, `OwnerClosed=5`, `LeaseExpired=6`, `ConformanceInjection=7` |
| `CacheReuseScope : ushort` | `Operation=0`, `Session=1`, `Connection=2`, `Global=3`, `Tenant=4`, `Profile=5` |
| `CacheMissReason : ushort` | `Unknown=0`, `NotFound=1`, `Expired=2`, `Invalidated=3`, `SchemaMismatch=4`, `ProducerUnavailable=5`, `LeaseRequired=6`, `PermissionDenied=7` |

运行时 reason、stage、priority、pressure、executor、affinity 和 result-drop code 字段使用
[运行时 API](./runtime) 定义的 Preview4 typed code wrapper。保留区和私有区保持原值；未知值仍可观测，
不会被折叠为泛化错误。
