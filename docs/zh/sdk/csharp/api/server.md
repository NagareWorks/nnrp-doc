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
