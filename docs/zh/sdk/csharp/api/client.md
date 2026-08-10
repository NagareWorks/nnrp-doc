# C# 客户端 API

生产 client 路径按角色组织并由 Rust 承载：

1. 把 `NnrpClient` 连接到用户侧 NNRP endpoint。
2. 打开 `NnrpClientSession`。
3. 提交 operation，或发送 typed Preview4 control/object frame。
4. 消费 result 和 runtime event。
5. 关闭 session 与 client。

## `NnrpClient.ConnectAsync`

```csharp
public static ValueTask<NnrpClient> ConnectAsync(
    NnrpClientOptions options,
    CancellationToken cancellationToken = default);
```

该方法校验应用 endpoint、解析已注册 provider、连接选中的 provider、完成 NNRP handshake，并
持有返回的 native connection。失败时直接报错，不回退到托管协议实现。

## `NnrpClientOptions`

| 属性 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `Endpoint` | [`NnrpEndpoint`](./transport#nnrpendpoint) | 是 | `nnrp://` 或 `nnrps://` 应用 endpoint。 |
| `ProviderRoutes` | `IReadOnlyDictionary<TransportId, NnrpClientProviderRoute>?` | 否 | 按 carrier 隔离的 locator 与对端验证配置。 |
| `TransportPolicy` | [`TransportPolicy`](./enums#transportpolicy) | 否 | 默认 `Auto`。 |
| `SessionDefaults` | `NnrpClientSessionOptions?` | 否 | 合并到每个新 session 的默认值。 |

TCP 与 QUIC 可以从 `Endpoint` 派生 host 和 port。IPC 与 WebSocket route 必须提供匹配的
`unix://`、`npipe://`、`ws://` 或 `wss://` locator。Auto/Prefer 在 candidate 诊断中保留无法解析的
route，并 probe 全部可用 route；Force 失败且不回退。

## `NnrpClient.OpenSession`

```csharp
public NnrpClientSession OpenSession(NnrpClientSessionOptions? options = null);
```

`NnrpClientSessionOptions` 只包含 transport-neutral 协议意图。Native handle 和 generation
属于内部实现，不得出现在这个类型中。

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `RequestedSessionId` | `uint` | `0` | 期望的 wire session id；零表示由 server 分配。 |
| `ProfileId` | `ushort` | 标准 token profile | 请求的 profile id。 |
| `SchemaId` | `uint` | 标准 token delta schema | 请求的 schema id。 |
| `SchemaVersion` | `uint` | 标准 token delta version | 请求的 schema version。 |
| `PriorityClass` | `SessionPriorityClass` | `Balanced` | Session 调度类别。 |
| `DefaultDeadlineMilliseconds` | `uint` | `500` | Operation 默认 deadline。 |
| `MaxInFlightOperations` | `ushort` | `4` | 请求的 session 并发上限。 |
| `LeaseTtlHintMilliseconds` | `uint` | `30000` | 请求的 cache lease 生命周期。 |
| `AllowResume` | `bool` | `false` | 启用可恢复 session 协商。 |
| `ResumeTokenBytes` | `uint` | `0` | 本地 recovery token 容量；零表示 runtime 默认值。 |
| `CacheHints` | `IReadOnlyList<CacheObjectKind>` | 空 | 合并进自动 connection hello 的 cache kind。 |

Runtime 负责派生 wire flags、extension 长度和 client session tag。新建 session 时，
`ResumeTokenBytes` 不会创建或携带 token；`CacheHints` 会在第一个 session 打开前参与 connection hello。

## Session 恢复

```csharp
public NnrpClientSession ResumeSession(
    NnrpSessionRecoveryTicket ticket,
    NnrpClientSessionOptions? options = null);
```

`NnrpClientSession.GetRecoveryTicket()` 返回当前 runtime 签发的
`NnrpSessionRecoveryTicket?`。应用可以通过 `ToBytes()` 持久化，并通过
`NnrpSessionRecoveryTicket.FromBytes(ReadOnlySpan<byte>)` 恢复，但不得构造、检查、截断或替换其中的
opaque resume token。

| 属性 | 类型 | 说明 |
|---|---|---|
| `SessionId` | `uint` | 非零 runtime session id。 |
| `ResumeToken` | `ReadOnlyMemory<byte>` | 非空 opaque runtime proof。 |
| `ResumeFromOperationId` | `ulong?` | 可选的最后确认 operation id。 |
| `ResumeWindowMilliseconds` | `uint` | 协商得到的 ticket 有效窗口。 |

持久化值使用 canonical little-endian NRTK version 1 envelope。解码必须拒绝错误 magic/version、
reserved flag、零 id、空 token、截断和尾随字节。

## 提交与结果

| 方法 | 返回值 | 语义 |
|---|---|---|
| `SubmitAsync(NnrpSubmitRequest, CancellationToken)` | `ValueTask<NnrpResult>` | 提交并等待匹配的终态结果。 |
| `SubmitNoWaitAsync(NnrpSubmitRequest, CancellationToken)` | `ValueTask<ulong>` | 提交并返回非零 operation ID。 |
| `NextResultAsync(CancellationToken)` | `ValueTask<NnrpResult>` | 跳过非结果事件并返回下一个终态结果。 |
| `NextEventAsync(CancellationToken)` | `ValueTask<NnrpClientEvent>` | 按当前 session 顺序返回下一条 runtime 或 lifecycle 事件。 |

`NnrpSubmitRequest` 包含非零 `OperationId`、独立 `FrameId`、payload/tensor、profile、schema、cache
metadata 和 submit mode。角色 API 负责打包并执行一次粗粒度 native submit；调用方不构造 FFI
buffer。

`NnrpClientEvent.Kind` 为 `Runtime` 或 `Lifecycle`。它的
`Match<TResult>(Func<NnrpRuntimeEvent, TResult>, Func<NnrpOperationLifecycleEvent, TResult>)` 方法要求
同时提供两个 callback，并且只暴露一个 active value；lifecycle event 不会获得伪造的 wire header。

### `NnrpResult`

| 属性 | 类型 | 说明 |
|---|---|---|
| `OperationId` | `ulong` | 非零 submitted operation identity。 |
| `TerminalState` | `NnrpResultTerminalState` | `Success`、`Cancelled`、`Dropped` 或 `Error`。 |
| `Event` | `NnrpTerminalEvent` | 封闭的 `Runtime` 或 `Lifecycle` 终态证据值。 |

成功结果保留 `ResultPush`；非成功结果保留建立终态的精确 wire 或本地 lifecycle event。
`NnrpTerminalEvent` 恰好包含一个变体；Managed API 不暴露 nullable 并行 event 字段，也不伪造 header。

`NnrpTerminalEvent.Kind` 为 `Runtime` 或 `Lifecycle`。它的
`Match<TResult>(Func<NnrpRuntimeEvent, TResult>, Func<NnrpOperationLifecycleEvent, TResult>)` 方法要求
同时传入两个 callback，并且只暴露 active value。Runtime terminal 将 `ResultPush` 映射为 `Success`，
将 `ResultDrop` 和 `ResultDropReason` 映射为 `Dropped`；`ResultPushMetadata.StatusCode` 绝不决定协议
terminal state。Lifecycle terminal 将 `Completed` 映射为 `Success`、`Cancelled` 映射为 `Cancelled`、
`Superseded` 映射为 `Dropped`、`Failed` 映射为 `Error`。

### `NnrpOperationLifecycleEvent`

| 属性 | 类型 | 说明 |
|---|---|---|
| `OperationId` | `ulong` | 非零 operation identity。 |
| `State` | `NnrpOperationState` | 精确的本地生命周期状态。 |

这是本地 role 通知，不包含伪造的 `RuntimeFrameHeader`；没有 header 的 native lifecycle record 必须与
wire `NnrpRuntimeEvent` 分开投影。

## Client Control 方法

每个方法都会校验 metadata/tail 长度，并通过 active native session 发出对应 runtime frame。

| 方法 | 消息 | Tail |
|---|---|---|
| `CancelAsync(ControlRequestMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `Cancel` | 诊断字节 |
| `AbortAsync(ControlRequestMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `Abort` | 诊断字节 |
| `UpdatePriorityAsync(SchedulingMetadata, CancellationToken)` | `PriorityUpdate` | 无 |
| `UpdateDeadlineAsync(SchedulingMetadata, CancellationToken)` | `Deadline` | 无 |
| `ExpireAtAsync(SchedulingMetadata, CancellationToken)` | `ExpireAt` | 无 |
| `SupersedeAsync(SupersedeMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `Supersede` | 诊断字节 |
| `UpdateBudgetAsync(BudgetMetadata, CancellationToken)` | `BudgetUpdate` | 无 |
| `NegotiateCapabilitiesAsync(CapabilityMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `CapabilityNegotiation` | capability entry |
| `DegradeProfileAsync(CapabilityMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `DegradeProfile` | capability entry |
| `SendRouteHintAsync(RouteHintMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `RouteHint` | typed hint body |
| `SendExecutionHintAsync(RouteHintMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ExecutionHint` | typed hint body |
| `SendTraceContextAsync(TraceContextMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `TraceContext` | trace attribute |
| `SendControlAsync(MessageType, IRuntimeControlMetadata, ReadOnlyMemory<byte>, CancellationToken)` | 任意 client 可发送 runtime control | 声明的 tail |

`SendControlAsync` 是 typed escape hatch；metadata 具体类型与 `MessageType` 不匹配时必须拒绝。

## Client Object 与 Cache 方法

| 方法 | 消息 | Tail |
|---|---|---|
| `DeclareObjectAsync(ObjectDescriptorMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ObjectDeclare` | object metadata |
| `ReferenceObjectAsync(ObjectReferenceMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ObjectRef` | reference metadata |
| `ReleaseObjectAsync(ObjectReleaseMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ObjectRelease` | 诊断字节 |
| `PatchObjectAsync(ObjectDeltaMetadata, ReadOnlyMemory<byte>, ReadOnlyMemory<byte>, CancellationToken)` | `ObjectPatch` | metadata body 后接 delta |
| `SendObjectDeltaAsync(ObjectDeltaMetadata, ReadOnlyMemory<byte>, ReadOnlyMemory<byte>, CancellationToken)` | `ObjectDelta` | metadata body 后接 delta |
| `ReferenceCacheAsync(CacheReferenceMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `CacheReference` | cache metadata |
| `ReportCacheMissAsync(CacheMissMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `CacheMiss` | 诊断字节 |
| `InvalidateCacheAsync(CacheInvalidateMetadata, CancellationToken)` | `CacheInvalidate` | 无 |

Object/cache 方法不会隐式执行 cache lookup，也不会退化成 JSON 序列化。

## 取消与迟到结果

Cancel 或 abort 到达终态后，普通结果迭代会抑制该 operation 的迟到 `RESULT_PUSH` 和
`PARTIAL_RESULT`。`RESULT_DROP_REASON` 仍可观测，用于说明结果为什么被丢弃。

## 关闭

`NnrpClientSession` 和 `NnrpClient` 实现 `IAsyncDisposable`。Session 释放会关闭 native session
并清理 in-flight 状态；client 释放会关闭其持有的 session、role connection 和 provider runtime。

基于 `INnrpMessageTransport` 的托管 packet/session helper 属于诊断与自定义 carrier 集成，不是
生产 API 的 alias。
