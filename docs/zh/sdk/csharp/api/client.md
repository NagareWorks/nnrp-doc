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
| `Transports` | `IReadOnlyList<INnrpNativeTransportProvider>?` | 否 | 显式 provider；`null` 使用默认 registry。 |
| `SessionDefaults` | `NnrpClientSessionOptions?` | 否 | 合并到每个新 session 的默认值。 |

TCP 与 QUIC 可以从 `Endpoint` 派生 host 和 port。IPC 与 WebSocket route 必须提供匹配的
`unix://`、`npipe://`、`ws://` 或 `wss://` locator。Auto/Prefer 在 candidate 诊断中保留无法解析的
route，并 probe 全部可用 route；Force 失败且不回退。

## `NnrpClient.OpenSession`

```csharp
public NnrpClientSession OpenSession(NnrpClientSessionOptions? options = null);
```

`NnrpClientSessionOptions` 冻结 `SessionId`、`SessionGeneration`、`ProfileId`、`SchemaId` 和
`SchemaVersion`。ID 为零时请求 runtime 分配；显式 ID 对应的 generation 或 schema version 必须
非零。

## 提交与结果

| 方法 | 返回值 | 语义 |
|---|---|---|
| `SubmitAsync(NnrpSubmitRequest, CancellationToken)` | `ValueTask<NnrpResult>` | 提交并等待匹配的终态结果。 |
| `SubmitNoWaitAsync(NnrpSubmitRequest, CancellationToken)` | `ValueTask<ulong>` | 提交并返回非零 operation ID。 |
| `NextResultAsync(CancellationToken)` | `ValueTask<NnrpResult>` | 跳过非结果事件并返回下一个终态结果。 |
| `NextEventAsync(CancellationToken)` | `ValueTask<NnrpRuntimeEvent>` | 按当前 session 的 wire 顺序返回下一个事件。 |

`NnrpSubmitRequest` 包含非零 `OperationId`、独立 `FrameId`、payload/tensor、profile、schema、cache
metadata 和 submit mode。角色 API 负责打包并执行一次粗粒度 native submit；调用方不构造 FFI
buffer。

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
