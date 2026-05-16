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

**方法参数说明**

| 方法 | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `SubmitAsync` | `request`: [`NnrpSubmitRequest`](#nnrpsubmitrequest)（必填 `FrameId`）；`cancellationToken` | `NnrpSubmitResult` | 提交帧并阻塞等待结果；结果丢弃时抛出 `NnrpResultDroppedException` |
| `SubmitAndForgetAsync` | `request`: [`NnrpSubmitRequest`](#nnrpsubmitrequest) | `NnrpInFlightFrame` | 立即返回句柄，通过 `.ResultTask` 异步等待结果，可并行提交多帧 |
| `AwaitResultAsync` | `frameId`: 之前用 `SubmitAndForgetAsync` 提交的帧 ID | `NnrpSubmitResult` | 单独等待指定帧的结果，需与 `SubmitAndForgetAsync` 配合使用 |
| `CancelFrameAsync` | `frameId`: 要取消的帧 ID | `Task` | 向服务端发送 `FRAME_CANCEL`；若帧已处理完毕则为 no-op |
| `PatchSessionAsync` | `patch`: `SessionPatchMessage`，包含 `Fields`（[`SessionPatchField`](/zh/sdk/csharp/api/enums#会话补丁枚举) 位标志）及各字段新值 | `SessionPatchAckMessage` | 动态调整帧率 (`TargetCadence`)、质量档位 (`QualityTier`)、活跃通道等会话参数 |
| `PutCacheAsync` | `put`: `CachePutMessage`，包含 `Key`（[`NnrpCacheKey`](/zh/sdk/csharp/api/protocol#nnrpcachekey)）、`Data`（字节数据）、`Flags`（[`CachePutFlags`](/zh/sdk/csharp/api/enums#缓存枚举)） | `CacheAckMessage` | 上传缓存对象到服务端；成功后可在 `SubmitMode.Reference` 中以 `Key` 引用，避免重复传输 |
| `InvalidateCacheAsync` | `invalidate`: `CacheInvalidateMessage`，含 `Key` 或 `Scope` | `Task` | 通知服务端使指定缓存失效；可按 key 或按 [`CacheInvalidateScope`](/zh/sdk/csharp/api/enums#缓存枚举) 批量失效 |
| `CloseAsync` | — | `Task` | 发送 `CLOSE` 并优雅关闭连接；`DisposeAsync()` 会自动调用此方法 |

> **`NnrpSubmitRequest` 字段**：`FrameId`（必填）、`TileIds`（变化瓦片 ID）、`Sections`（Tensor 分区数据，见 [`NnrpTensorSection`](#nnrptensorsection)）、`InputProfile`（输入数据格式，见 [`InputProfile`](/zh/sdk/csharp/api/enums#帧与输入)）、`SubmitMode`（`Inline` 传输数据 / `Reference` 引用缓存）、`BudgetPolicy`（降质策略位标志，见 [`BudgetPolicy`](/zh/sdk/csharp/api/enums#结果枚举)）、`InferenceBudgetMs`（推理预算毫秒数）。

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

---

## 典型使用场景

### 完整连接与渲染循环

```csharp
var transport = new NnrpQuicTransport(quicConfig);
var profile   = new NnrpClientProfile
{
    TransportPolicy   = TransportPolicy.PreferQuic,
    LossTolerance     = LossTolerance.LowLatency,
    InferenceBudgetMs = 8,
};

var client = new NnrpClient(transport, profile);
await using var session = await client.ConnectAsync("render.example.com", 4433);

for (int frameId = 0; ; frameId++)
{
    var (tiles, tensor) = CaptureChangedTiles();
    var result = await session.SubmitAsync(new NnrpSubmitRequest
    {
        FrameId           = frameId,
        TileIds           = tiles,
        Sections          = new[] { tensor },
        InputProfile      = InputProfile.ChangedTilesLuma,
        BudgetPolicy      = BudgetPolicy.AllowPartial,
        InferenceBudgetMs = 8,
    });
    if (result.ResultClass == ResultClass.Complete)
        Display(result.Sections);
}
```

### 响应背压信号

```csharp
session.OnResultHint += hint =>
{
    if (hint.CongestionState == ResultHintCongestionState.Saturated)
        _paused = true;
    else if (hint.CongestionState == ResultHintCongestionState.None)
        _paused = false;
};

// 发送循环中
if (_paused) { await Task.Delay(16); continue; }
```

---

## 常见坑点

::: warning
1. **`await using var session`**：`NnrpClientSession` 实现 `IAsyncDisposable`，必须确保 `DisposeAsync` 被调用；直接 `await client.ConnectAsync(...)` 而不用 `await using` 会在连接异常时泄漏底层 QUIC/TCP 资源。

2. **不要跨线程并发调用 `SubmitAsync`**：发送路径非线程安全，多线程并发写会导致包交错。若需并发，应使用 `Channel<T>` 将请求序列化后发送。

3. **`SubmitAsync` 超时后帧 ID 槽仍然占用**：调用 `session.DiscardFrame(frameId)` 释放，否则内部路由表持续增长。

4. **`InferenceBudgetMs` 是默认预算**，每次 `NnrpSubmitRequest` 可单独覆盖；`DeadlineMs` 是绝对截止时间戳（毫秒级 Unix 时间），两者语义不同，混用会导致服务端判定超时。
:::
