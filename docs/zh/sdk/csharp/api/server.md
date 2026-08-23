# C# 服务端 API

生产 server 路径持有 Rust-backed listener 和已接受的 runtime session：

1. 在用户侧 NNRP endpoint 上监听。
2. 通过所持 provider listener set 中任一 listener 接受 session。
3. 接收 `NnrpServerOperation`。
4. 发送 progress、partial、terminal、drop 和 trace 输出。
5. 关闭已接受 session 和 listener。

## `NnrpServer.ListenAsync`

```csharp
public static ValueTask<NnrpServer> ListenAsync(
    NnrpServerOptions options,
    CancellationToken cancellationToken = default);
```

该方法解析 policy 允许的全部已注册 provider，原子绑定 listener set，并把每个 listener ownership
交给对应 native server runtime。它不会创建托管 loopback server。

## `NnrpServerOptions`

| 属性 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `Endpoint` | [`NnrpEndpoint`](./transport#nnrpendpoint) | 是 | `nnrp://` 或 `nnrps://` 应用 endpoint。 |
| `ProviderRoutes` | `IReadOnlyDictionary<TransportId, NnrpServerProviderRoute>?` | 否 | 按 carrier 隔离的 bind locator 与 server security。 |
| `TransportPolicy` | [`TransportPolicy`](./enums#transportpolicy) | 否 | 默认 `Auto`。 |
| `SessionDefaults` | `NnrpServerSessionOptions?` | 否 | 应用到每个 accepted session 的默认值。 |

TCP 与 QUIC 可以从 `Endpoint` 派生 bind host 和 port。IPC 与 WebSocket 必须提供匹配的
provider-local locator。Auto/Prefer 要求全部允许的已安装 provider route 都能解析，并原子打开完整
listener set；Force 限制该集合且不回退。

## `NnrpServerSessionOptions`

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---:|---|
| `SupportedProfiles` | `IReadOnlyList<ushort>` | 标准 token profile | 支持的 profile id。 |
| `SupportedCacheObjects` | `IReadOnlyList<CacheObjectKind>` | 空 | 支持的 cache object kind。 |
| `MaxCacheObjects` | `ulong` | `0` | Cache object 数量上限；零表示不声明限制。 |
| `MaxCacheObjectBytes` | `uint` | `0` | 单个 object 字节上限；零表示不声明限制。 |
| `SchemaRegistry` | `NnrpSchemaRegistry` | 标准 | 应用侧 schema registry。 |
| `ResumeTokenBytes` | `uint` | `24` | Runtime 签发的 recovery token 长度。 |
| `MaxInFlightOperations` | `ushort` | `4` | 协商的 in-flight operation 上限。 |
| `GrantedOperationCredit` | `ushort` | `2` | 初始 operation credit。 |
| `LeaseTtlMilliseconds` | `uint` | `30000` | Cache lease 生命周期。 |
| `ResumeWindowMilliseconds` | `uint` | `120000` | Recovery ticket 有效窗口。 |
| `ApplicationPolicy` | `INnrpServerSessionPolicy` | 接受有效 session | 异步 admission policy。 |

```csharp
public interface INnrpServerSessionPolicy
{
    ValueTask<NnrpServerSessionPolicyDecision> EvaluateAsync(SessionOpenMetadata open);
}
```

`NnrpServerSessionPolicyDecision` 包含 `Accepted`、`SessionErrorCode` 和可选 `Diagnostic`。Policy 对每个
`SESSION_OPEN` 恰好执行一次，且不能在 native callback 线程内运行；host 通过 Rust ABI completion
边界回报 decision。拒绝必须使用有效的非零 session error code，异常会转换为确定性的 policy failure。

## `NnrpServer.AcceptAsync`

```csharp
public ValueTask<NnrpServerSession> AcceptAsync(
    NnrpServerAcceptOptions? options = null,
    CancellationToken cancellationToken = default);
```

`NnrpServerAcceptOptions` 只包含默认值为 `0` 的 `TimeoutMilliseconds`。Native accept ticket、session
handle 和 generation 都是内部实现。返回的 session 持有自己的 native session handle，并保留选中
provider identity。

`NnrpServerSession.ActiveTransportId` 是实际接受 carrier 的 listener 对应的 `TransportId`。它必须与协商得到的
active transport 一致，不能从 listener preference 顺序推断。

`NnrpServer.BoundProviderEndpoints` 是包含每个已打开 listener 实际 endpoint 的
`IReadOnlyDictionary<TransportId, NnrpProviderEndpoint>`。Provider listener 的致命失败会让逻辑 server
失败并关闭其余 listener set；被拒绝的 peer handshake 只影响该 accepted carrier。

## `NnrpServerSession.ReceiveSubmitAsync`

```csharp
public ValueTask<NnrpServerOperation> ReceiveSubmitAsync(
    CancellationToken cancellationToken = default);
```

返回 operation 暴露 owned 应用值，不暴露 FFI buffer：

| 属性 | 类型 | 说明 |
|---|---|---|
| `OperationId` | `ulong` | 非零 wire operation identity。 |
| `FrameId` | `uint` | Wire frame identity。 |
| `Metadata` | `FrameSubmitMetadata` | 已解码 submit metadata。 |
| `Body` | `ReadOnlyMemory<byte>` | Owned submit body。 |
| `TraceId` | `ulong` | E2E trace identity。 |

## Operation 结果

| 方法 | 消息 | 说明 |
|---|---|---|
| `SendResultAsync(ResultPushMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ResultPush` | 发送该 operation 的终态成功/错误 payload。 |
| `SendResultDropAsync(ResultDropReasonMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ResultDropReason` | 发送 typed 终态丢弃证据。 |
| `SendProgressAsync(ProgressMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `Progress` | 发送该 operation 的非终态进度。 |
| `SendPartialResultAsync(PartialResultMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `PartialResult` | 发送该 operation 的增量结果。 |

一个 operation 只能发送一次终态。终态后或 session 关闭后再次发送会抛出
`NnrpNativeInvalidStateException`。所有方法都会校验 operation identity，session 不暴露并行的
operation 回复方法。

收到终态 lifecycle event 不会在终态回复成功前使 operation 失效。operation 会保持可回复，直到
终态回复成功或 session 关闭，后续 event 读取不得改变这段生命周期。

## Server Runtime 方法

每个方法都通过一次粗粒度 native 调用发送 typed Preview4 frame。

| 方法 | 消息 | Tail |
|---|---|---|
| `SendBackpressureAsync(PressureMetadata, CancellationToken)` | `Backpressure` | 无 |
| `SendCreditUpdateAsync(PressureMetadata, CancellationToken)` | `CreditUpdate` | 无 |
| `NegotiateCapabilitiesAsync(CapabilityMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `CapabilityNegotiation` | capability entry |
| `DegradeProfileAsync(CapabilityMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `DegradeProfile` | capability entry |
| `SendTraceContextAsync(TraceContextMetadata, ReadOnlyMemory<byte>, ulong?, CancellationToken)` | `TraceContext` | trace attribute；null operation 表示 session scope |
| `SendRecoverableErrorAsync(RecoverableErrorMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `ErrorRecoverable` | 诊断字节 |
| `SendRetryAfterAsync(RetryAfterMetadata, ReadOnlyMemory<byte>, CancellationToken)` | `RetryAfter` | 诊断字节 |
| `SendControlAsync(MessageType, IRuntimeControlMetadata, ReadOnlyMemory<byte>, CancellationToken)` | 任意 server 可发送且不属于具体 operation 的 runtime control | 声明的 tail |

## Server Object 与 Cache 方法

| 方法 | 消息 |
|---|---|
| `DeclareObjectAsync` | `ObjectDeclare` |
| `ReferenceObjectAsync` | `ObjectRef` |
| `ReleaseObjectAsync` | `ObjectRelease` |
| `PatchObjectAsync` | `ObjectPatch` |
| `SendObjectDeltaAsync` | `ObjectDelta` |
| `ReferenceCacheAsync` | `CacheReference` |
| `ReportCacheMissAsync` | `CacheMiss` |
| `InvalidateCacheAsync` | `CacheInvalidate` |

参数和 tail 规则与[客户端 object/cache 方法](./client)使用同一套 typed
metadata 契约。

## 输入 Server Event

`NextEventAsync(CancellationToken)` 返回 `ValueTask<NnrpServerEvent>`，并保持单个 session 的事件顺序。
`NnrpServerEvent.Kind` 为 `Submit`、`Runtime` 或 `Lifecycle`；其 `Match<TResult>(...)` 要求提供全部三个
callback，并且只暴露一个 `NnrpServerOperation`、非 submit `NnrpRuntimeEvent` 或不带 header 的
`NnrpOperationLifecycleEvent`。应用 API 不接受 raw control code。

## 关闭

`NnrpServerOperation`、`NnrpServerSession` 和 `NnrpServer` 按这个顺序执行 ownership 约束。
Session 和 listener 实现 `IAsyncDisposable`；listener 关闭会取消 pending accept、关闭已接受 session
并释放 provider runtime。

托管 `INnrpMessageTransport` server helper 只属于诊断/自定义 carrier，不是生产 fallback。
