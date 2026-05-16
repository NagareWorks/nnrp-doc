# C# — 客户端

客户端 API 定义在 `Nnrp.Client` 命名空间中（`Nnrp.Core` 包内）。

## 导入

```csharp
using Nnrp.Core;
using Nnrp.Client;
```

---

## `ClientProfile`

客户端配置（`sealed class`，可读写属性）。

```csharp
public sealed class ClientProfile
{
    public byte MaxViews { get; set; } = 1;
    public bool EnableCache { get; set; } = true;
    public int MaxCacheEntries { get; set; } = 256;
    public long MaxCacheBytes { get; set; } = 8 * 1024 * 1024;
    public TransportPolicy TransportPolicy { get; set; } = TransportPolicy.Auto;
    public LossTolerance LossTolerance { get; set; } = LossTolerance.BestEffort;
    public PayloadKind SupportedPayloadKinds { get; set; } = PayloadKind.Tensor;

    // 将 Profile 转换为 ClientHello 的 Extensions 列表
    public IReadOnlyList<ControlExtensionEntry> BuildExtensions();

    // 验证配置合法性
    public bool TryValidate(out string? error);
}
```

---

## `NnrpClient`

顶层客户端类，管理连接与会话生命周期。

```csharp
public sealed class NnrpClient : IAsyncDisposable
{
    public NnrpClient(INnrpMessageTransport transport, ClientProfile profile);

    // 建立连接并完成握手，返回客户端会话
    public Task<INnrpClientSession> ConnectAsync(
        string host,
        int port,
        CancellationToken cancellationToken = default);

    // 建立连接（已有 transport 实例时使用）
    public Task<INnrpClientSession> OpenSessionAsync(
        INnrpMessageTransport transport,
        CancellationToken cancellationToken = default);

    public ValueTask DisposeAsync();
}
```

---

## `INnrpClientSession`

客户端会话接口。

```csharp
public interface INnrpClientSession : IAsyncDisposable
{
    uint SessionId { get; }
    TransportId TransportId { get; }
    NnrpCapabilitySelection Capabilities { get; }
    bool IsConnected { get; }

    // 提交帧并等待结果
    Task<NnrpSubmitResult> SubmitAsync(
        NnrpSubmitRequest request,
        CancellationToken cancellationToken = default);

    // 提交帧（不等待结果）
    Task<NnrpInFlightFrame> SubmitAndForgetAsync(
        NnrpSubmitRequest request,
        CancellationToken cancellationToken = default);

    // 等待特定帧的结果
    Task<NnrpSubmitResult> AwaitResultAsync(
        uint frameId,
        CancellationToken cancellationToken = default);

    // 取消帧
    Task CancelFrameAsync(
        uint frameId,
        CancellationToken cancellationToken = default);

    // 发送会话补丁
    Task<SessionPatchAckMessage> PatchSessionAsync(
        SessionPatchMessage patch,
        CancellationToken cancellationToken = default);

    // 上传缓存对象
    Task<CacheAckMessage> PutCacheAsync(
        CachePutMessage put,
        CancellationToken cancellationToken = default);

    // 失效缓存
    Task InvalidateCacheAsync(
        CacheInvalidateMessage invalidate,
        CancellationToken cancellationToken = default);

    // 关闭会话
    Task CloseAsync(CancellationToken cancellationToken = default);
}
```

---

## 数据类型

### `NnrpSubmitRequest`

帧提交请求（`record`）。

```csharp
public sealed record NnrpSubmitRequest
{
    public required uint FrameId { get; init; }
    public ReadOnlyMemory<ushort> TileIds { get; init; } = default;
    public IReadOnlyList<NnrpTensorSection> Sections { get; init; } = Array.Empty<NnrpTensorSection>();
    public IReadOnlyList<NnrpTypedPayload> TypedPayloads { get; init; } = Array.Empty<NnrpTypedPayload>();
    public InputProfile InputProfile { get; init; } = InputProfile.Unspecified;
    public SubmitMode SubmitMode { get; init; } = SubmitMode.Inline;
    public BudgetPolicy BudgetPolicy { get; init; } = BudgetPolicy.None;
    public uint InferenceBudgetMs { get; init; } = 0;
    public uint DeadlineMs { get; init; } = 0;
    public uint ViewId { get; init; } = 0;
}
```

### `NnrpTensorSection`

单个 Tensor 分区数据（`record`）。

```csharp
public sealed record NnrpTensorSection
{
    public required byte RoleId { get; init; }
    public required DTypeId DType { get; init; }
    public TensorLayoutId Layout { get; init; } = TensorLayoutId.Nhwc;
    public ScalePolicy ScalePolicy { get; init; } = ScalePolicy.None;
    public required IReadOnlyList<ReadOnlyMemory<byte>> TilePayloads { get; init; }
    public IReadOnlyList<byte>? CodecIds { get; init; }
    public byte DefaultCodecId { get; init; } = 0;
}
```

### `NnrpTypedPayload`

非 Tensor 类型载荷。

```csharp
public sealed record NnrpTypedPayload
{
    public required PayloadKind Kind { get; init; }
    public required ReadOnlyMemory<byte> Data { get; init; }
}
```

### `NnrpSubmitResult`

帧提交结果。

```csharp
public sealed class NnrpSubmitResult
{
    public uint FrameId { get; }
    public ResultClass ResultClass { get; }
    public ResultFlags ResultFlags { get; }
    public BudgetPolicy AppliedBudgetPolicy { get; }
    public uint InferenceMs { get; }
    public uint QueueMs { get; }
    public uint ServerTotalMs { get; }
    public ushort StatusCode { get; }
    public IReadOnlyList<NnrpTensorSection> Sections { get; }
    public IReadOnlyList<NnrpTypedPayload> TypedPayloads { get; }
    public bool IsSuccess => ResultClass is ResultClass.Complete or ResultClass.Partial;
}
```

### `NnrpInFlightFrame`

异步提交后的在途帧句柄。

```csharp
public sealed class NnrpInFlightFrame : IDisposable
{
    public uint FrameId { get; }
    public Task<NnrpSubmitResult> ResultTask { get; }
    public void Cancel(); // 发送 FRAME_CANCEL 并取消等待
    public void Dispose();
}
```

---

## 完整客户端示例

```csharp
using Nnrp.Client;
using Nnrp.Transport;

var transport = new NnrpTcpMessageTransport();
var profile = new ClientProfile
{
    EnableCache = true,
    TransportPolicy = TransportPolicy.Auto,
};

var client = new NnrpClient(transport, profile);
await using var session = await client.ConnectAsync("127.0.0.1", 4433);

var result = await session.SubmitAsync(new NnrpSubmitRequest
{
    FrameId = 1,
    Sections = new[] { myTensorSection },
    BudgetPolicy = BudgetPolicy.AllowPartial,
    InferenceBudgetMs = 50,
});

Console.WriteLine($"Result: {result.ResultClass}, InferenceMs: {result.InferenceMs}");
```
