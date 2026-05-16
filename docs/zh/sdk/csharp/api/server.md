# C# — 服务端

服务端 API 定义在 `Nnrp.Server` 命名空间中（`Nnrp.Core` 包内）。

## 导入

```csharp
using Nnrp.Core;
using Nnrp.Server;
```

---

## `ServerProfile`

服务端配置（`sealed class`，可读写属性）。

```csharp
public sealed class ServerProfile
{
    public int MaxConcurrentFrames { get; set; } = 1;
    public bool EnableCache { get; set; } = true;
    public int MaxSections { get; set; } = 16;
    public long MaxBodyBytes { get; set; } = 32 * 1024 * 1024;
    public PayloadKind SupportedPayloadKinds { get; set; } =
        PayloadKind.Tensor | PayloadKind.TokenChunk |
        PayloadKind.AudioChunk | PayloadKind.VideoChunk |
        PayloadKind.StructuredEvent | PayloadKind.ToolDelta |
        PayloadKind.OpaqueBytes;
    public uint MaxCacheEntries { get; set; } = 256;
    public long MaxCacheBytes { get; set; } = 8 * 1024 * 1024;

    // 将 Profile 转换为 SERVER_HELLO_ACK 中的能力声明
    public NnrpCapabilitySelection ToCapabilities(ClientHelloMessage clientHello, TransportId transport);

    // 构造 SERVER_HELLO_ACK 消息
    public ServerHelloAckMessage CreateServerHelloAck(
        ClientHelloMessage clientHello,
        TransportId transport,
        IReadOnlyList<ControlExtensionEntry>? extraExtensions = null);

    // 验证配置合法性
    public bool TryValidate(out string? error);
}
```

---

## `INnrpServerSession`

服务端会话接口。

```csharp
public interface INnrpServerSession : IAsyncDisposable
{
    uint SessionId { get; }
    TransportId TransportId { get; }
    NnrpCapabilitySelection Capabilities { get; }
    ClientHelloMessage ClientHello { get; }
    bool IsConnected { get; }

    // 等待并接收下一个帧提交
    Task<NnrpFrameSubmit> ReceiveSubmitAsync(
        CancellationToken cancellationToken = default);

    // 推送处理结果
    Task<int> SendResultAsync(
        NnrpResult result,
        CancellationToken cancellationToken = default);

    // 通知结果丢弃
    Task SendDropAsync(
        uint frameId,
        ResultClass resultClass = ResultClass.Complete,
        CancellationToken cancellationToken = default);

    // 发送流控更新
    Task SendFlowUpdateAsync(
        FlowUpdateMessage update,
        CancellationToken cancellationToken = default);

    // 发送结果提示
    Task SendResultHintAsync(
        ResultHintMessage hint,
        CancellationToken cancellationToken = default);

    // 发送会话补丁应答
    Task SendPatchAckAsync(
        SessionPatchAckMessage ack,
        CancellationToken cancellationToken = default);

    // 发送错误
    Task SendErrorAsync(
        NnrpProtocolFailure failure,
        CancellationToken cancellationToken = default);

    // 关闭会话
    Task CloseAsync(CancellationToken cancellationToken = default);
}
```

**方法参数说明**

| 方法 | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `ReceiveSubmitAsync` | `cancellationToken` | `NnrpFrameSubmit` | 等待并接收下一个 `FRAME_SUBMIT`；连接断开时抛出 `NnrpConnectionClosedException` |
| `SendResultAsync` | `result`: [`NnrpResult`](#nnrpresult)（必填 `FrameId`、`ResultClass`） | `int`（发送字节数） | 向客户端推送帧处理结果；`Sections` 和 `TypedPayloads` 至少提供其中一种 |
| `SendDropAsync` | `frameId`: 要丢弃的帧 ID；`resultClass`: 丢弃原因（默认 `Complete`） | `Task` | 通知客户端该帧不会返回结果；**必须调用**，否则客户端 `SubmitAsync` 永久阻塞 |
| `SendFlowUpdateAsync` | `update`: `FlowUpdateMessage`，含 `Flags`（[`FlowUpdateFlags`](/zh/sdk/csharp/api/enums#流控枚举)）、`Credit`（信用窗口）、`RetryAfterMs` | `Task` | 发送背压信号；`Credit=0` 表示暂停；客户端收到后应暂停提交新帧 |
| `SendResultHintAsync` | `hint`: `ResultHintMessage`，含 `CongestionState`（[`ResultHintCongestionState`](/zh/sdk/csharp/api/enums#结果提示)）等字段 | `Task` | 提示客户端当前拥塞状态，帮助客户端自适应调整帧率和质量 |
| `SendPatchAckAsync` | `ack`: `SessionPatchAckMessage`，含 `Status`（[`SessionPatchAckStatus`](/zh/sdk/csharp/api/enums#会话补丁枚举)）及应用的字段值 | `Task` | 应答客户端的 `SESSION_PATCH` 请求 |
| `SendErrorAsync` | `failure`: `NnrpProtocolFailure`，含 `ErrorCode`（[`ErrorCode`](/zh/sdk/csharp/api/enums#错误枚举)）和描述信息 | `Task` | 向客户端发送协议错误并关闭连接 |
| `CloseAsync` | — | `Task` | 发送 `CLOSE` 并优雅关闭连接 |

> **`NnrpResult` 字段**：`FrameId`（必填）、`ResultClass`（[`ResultClass`](/zh/sdk/csharp/api/enums#结果枚举)，必填）、`Sections`（输出 Tensor 分区）、`InferenceMs`（推理耗时）、`AppliedBudgetPolicy`（实际使用的降质策略，`Partial`/`Degraded` 时必填）。

---

## `NnrpServerSession`

`INnrpServerSession` 的默认实现（`sealed class`）。

```csharp
public sealed class NnrpServerSession : INnrpServerSession
{
    // 构造：通常由 NnrpServer 内部创建
    public NnrpServerSession(
        INnrpMessageTransport transport,
        ServerProfile profile,
        ClientHelloMessage clientHello,
        TransportId transportId);

    // ... 实现 INnrpServerSession 所有成员
}
```

---

## 数据类型

### `NnrpFrameSubmit`

接收到的帧提交数据（不可变）。

```csharp
public sealed class NnrpFrameSubmit
{
    public uint SessionId { get; }
    public uint FrameId { get; }
    public uint ViewId { get; }
    public InputProfile InputProfile { get; }
    public SubmitMode SubmitMode { get; }
    public BudgetPolicy BudgetPolicy { get; }
    public PayloadKind PayloadKindBitmap { get; }
    public uint InferenceBudgetMs { get; }
    public uint DeadlineMs { get; }
    public IReadOnlyList<NnrpTensorSection> Sections { get; }
    public IReadOnlyList<NnrpTypedPayload> TypedPayloads { get; }
    public ReadOnlyMemory<byte> RawBody { get; }
}
```

### `NnrpResult`

推送给客户端的处理结果（`record`）。

```csharp
public sealed record NnrpResult
{
    public required uint FrameId { get; init; }
    public ReadOnlyMemory<ushort> TileIds { get; init; } = default;
    public IReadOnlyList<NnrpTensorSection> Sections { get; init; } = Array.Empty<NnrpTensorSection>();
    public IReadOnlyList<NnrpTypedPayload> TypedPayloads { get; init; } = Array.Empty<NnrpTypedPayload>();
    public ResultClass ResultClass { get; init; } = ResultClass.Complete;
    public ResultFlags ResultFlags { get; init; } = ResultFlags.None;
    public BudgetPolicy AppliedBudgetPolicy { get; init; } = BudgetPolicy.None;
    public byte ActiveProfileId { get; init; } = 0;
    public uint InferenceMs { get; init; } = 0;
    public uint QueueMs { get; init; } = 0;
    public uint ServerTotalMs { get; init; } = 0;
    public ushort StatusCode { get; init; } = 0;
    public TileIndexMode TileIndexMode { get; init; } = TileIndexMode.RawU16;
    public ushort TileBaseId { get; init; } = 0;
    public ushort CoveredTileCount { get; init; } = 0;
    public ushort DroppedTileCount { get; init; } = 0;
    public uint ReusedFrameId { get; init; } = 0;
    public PayloadKind PayloadKindBitmap { get; init; } = PayloadKind.Tensor;
    public uint PayloadFrameCount { get; init; } = 0;
    public uint ViewId { get; init; } = 0;
    public uint RouteId { get; init; } = 0;
    public uint TraceId { get; init; } = 0;
}
```

---

## `NnrpServer`（顶层服务端类）

```csharp
public sealed class NnrpServer : IAsyncDisposable
{
    public NnrpServer(INnrpMessageTransport transport, ServerProfile profile);

    // 接受新连接并完成握手，返回服务端会话
    // auth 回调：返回 null 表示认证通过，返回 NnrpProtocolFailure 表示认证失败
    public Task<INnrpServerSession> AcceptAsync(
        Func<ClientHelloMessage, NnrpProtocolFailure?>? auth = null,
        CancellationToken cancellationToken = default);

    public ValueTask DisposeAsync();
}
```

---

## 完整服务端示例

```csharp
using Nnrp.Server;
using Nnrp.Transport;

var profile = new ServerProfile { MaxConcurrentFrames = 4 };
var transport = new NnrpTcpMessageTransport(port: 4433);
var server = new NnrpServer(transport, profile);

while (true)
{
    var session = await server.AcceptAsync(hello =>
        ValidateAuth(hello.AuthBlock) ? null : NnrpProtocolFailure.AuthFailed());

    _ = Task.Run(async () =>
    {
        try
        {
            while (true)
            {
                var submit = await session.ReceiveSubmitAsync();
                var output = await RunInference(submit.Sections);
                await session.SendResultAsync(new NnrpResult
                {
                    FrameId = submit.FrameId,
                    Sections = output,
                    ResultClass = ResultClass.Complete,
                    InferenceMs = (uint)elapsed.TotalMilliseconds,
                });
            }
        }
        finally { await session.DisposeAsync(); }
    });
}
```

---

## 典型使用场景

### 认证验证

```csharp
var server = new NnrpServer(transport, new NnrpServerProfile
{
    MaxConcurrentFrames = 8,
    AuthValidator = authBlock =>
    {
        if (authBlock.Length < 32) return false;
        var token   = authBlock[..32];
        var payload = authBlock[32..];
        var expected = Hmac.ComputeSha256(SECRET_KEY, payload);
        return CryptographicOperations.FixedTimeEquals(token, expected);
    }
});
```

### 背压与降质

```csharp
async Task HandleSessionAsync(INnrpServerSession session)
{
    while (true)
    {
        var submit = await session.ReceiveSubmitAsync();
        if (_queueDepth > MaxQueue)
        {
            await session.SendResultDropAsync(submit.FrameId);
            await session.SendResultHintAsync(new NnrpResultHint
            {
                CongestionState = ResultHintCongestionState.Saturated,
            });
            continue;
        }
        var sections = await RunInferenceAsync(submit.Sections);
        await session.SendResultAsync(new NnrpResult
        {
            FrameId     = submit.FrameId,
            Sections    = sections,
            ResultClass = ResultClass.Complete,
        });
    }
}
```

---

## 常见坑点

::: warning
1. **不可在 `ReceiveSubmitAsync` 的 `await` 内部同步阻塞**：推理必须用 `Task.Run` 或 `await` 异步方法，否则 I/O 线程被占用，PING/PONG 超时，客户端断开。

2. **超时的帧必须发送 `SendResultDropAsync`**；直接 `continue` 会使客户端 `SubmitAsync` 永久挂起。

3. **`AuthValidator` 是同步委托**，不支持 `async`；若认证需要 I/O（如数据库），用 `AsyncAuthValidator`（见重载版本）或在同步委托里 `.GetAwaiter().GetResult()`（注意死锁风险）。

4. **`NnrpServerProfile.MaxConcurrentFrames` 是软限制**，超出部分不会自动排队；实际并发控制需在业务层用 `SemaphoreSlim` 实现。
:::
