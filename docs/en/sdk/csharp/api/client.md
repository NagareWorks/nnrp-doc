# C# — Client

Client API is in the `Nnrp.Client` namespace.

## Import

```csharp
using Nnrp.Client;
using Nnrp.Core;
```

---

## `ClientProfile`

Client configuration (mutable class).

| Property | Type | Default | Description |
|---|---|---|---|
| `MaxViews` | `int` | `1` | Max concurrent views |
| `EnableCache` | `bool` | `true` | Enable server-side cache negotiation |
| `MaxCacheEntries` | `int` | `256` | Max cache entries |
| `MaxCacheBytes` | `long` | `8388608` | Max cache bytes (8 MB) |

---

## `NnrpClient`

Top-level client that manages transport connection and session creation.

```csharp
public sealed class NnrpClient : IAsyncDisposable
{
    public static Task<NnrpClient> ConnectAsync(
        string host, int port,
        ClientProfile profile,
        NnrpClientOptions? options = null,
        CancellationToken ct = default);

    public Task<INnrpClientSession> OpenSessionAsync(
        CancellationToken ct = default);

    public ValueTask DisposeAsync();
}
```

### `NnrpClientOptions`

| Property | Type | Default | Description |
|---|---|---|---|
| `TransportPolicy` | `TransportPolicy` | `Auto` | Transport selection policy |
| `LossTolerance` | `LossTolerance` | `BestEffort` | Loss tolerance |
| `AuthBlock` | `byte[]` | `Array.Empty<byte>()` | Auth block bytes |
| `ConnectTimeoutMs` | `int` | `10000` | Connection timeout (ms) |

---

## `INnrpClientSession`

Client session interface for frame submission and result receive.

```csharp
public interface INnrpClientSession : IAsyncDisposable
{
    uint SessionId { get; }
    TransportId ActiveTransportId { get; }

    // Frame submission
    Task<NnrpSubmitResult> SubmitAsync(
        NnrpSubmitRequest request,
        CancellationToken ct = default);
    Task SubmitFireAndForgetAsync(
        NnrpSubmitRequest request,
        CancellationToken ct = default);

    // Result receive
    Task<NnrpSubmitResult> ReceiveResultAsync(
        uint frameId,
        CancellationToken ct = default);

    // Session management
    Task<SessionPatchAckMessage> PatchSessionAsync(
        SessionPatchMessage patch,
        CancellationToken ct = default);
    Task CloseAsync(CancellationToken ct = default);
}
```

**Method Parameter Reference**

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `SubmitAsync` | `request`: [`NnrpSubmitRequest`](#nnrpsubmitrequest) (requires `FrameId`); `ct` | `NnrpSubmitResult` | Submit a frame and block until the result arrives; throws `NnrpResultDroppedException` if dropped |
| `SubmitFireAndForgetAsync` | `request`: [`NnrpSubmitRequest`](#nnrpsubmitrequest); `ct` | `Task` | Non-blocking submit; use `ReceiveResultAsync` to poll for the result separately |
| `ReceiveResultAsync` | `frameId`: the ID passed in the prior `SubmitFireAndForgetAsync` | `NnrpSubmitResult` | Await the result for a specific frame; must be paired with `SubmitFireAndForgetAsync` |
| `PatchSessionAsync` | `patch`: `SessionPatchMessage` with `Fields` ([`SessionPatchField`](/en/sdk/csharp/api/enums#session-patch) bitmask) and new values | `SessionPatchAckMessage` | Dynamically adjust `TargetCadence`, `QualityTier`, active lane mask, preferred codec, etc. **Only fields whose bit is set in `Fields` are applied** |
| `CloseAsync` | — | `Task` | Send `CLOSE` and gracefully terminate the connection; automatically called by `DisposeAsync()` |

> **`NnrpSubmitRequest` key fields**: `FrameId` (required, monotonically increasing), `TileIds` (changed tile IDs), `Sections` ([`NnrpTensorSection`](#nnrptensorsection) array), `InputProfile` ([`InputProfile`](/en/sdk/csharp/api/enums#frame-classification)), `SubmitMode` (`Inline` = carry data inline / `Reference` = reference a cached object), `BudgetPolicy` ([`BudgetPolicy`](/en/sdk/csharp/api/enums#data-plane-enums) bitmask controlling whether degraded/partial results are acceptable), `InferenceBudgetMs` (inference time budget in ms; 0 = unlimited).

---

## Data Types

### `NnrpSubmitRequest`

Frame submit request.

| Property | Type | Description |
|---|---|---|
| `FrameId` | `uint` | Frame ID |
| `TileIds` | `ReadOnlyMemory<ushort>` | Tile IDs |
| `Sections` | `IReadOnlyList<NnrpTensorSection>` | Tensor sections |
| `TypedPayloads` | `IReadOnlyList<NnrpTypedPayload>` | Non-tensor payloads |
| `InputProfile` | `InputProfile` | Input data format |
| `SubmitMode` | `SubmitMode` | Submission mode |
| `BudgetPolicy` | `BudgetPolicy` | Allowed degradation |
| `InferenceBudgetMs` | `int` | Max inference budget (ms) |
| `DeadlineMs` | `long` | Absolute deadline |

### `NnrpTensorSection`

| Property | Type | Description |
|---|---|---|
| `RoleId` | `int` | Tensor role ID |
| `DTypeId` | `DTypeId` | Data type |
| `LayoutId` | `TensorLayoutId` | Memory layout |
| `DefaultCodecId` | `int` | Default codec ID |
| `TilePayloads` | `IReadOnlyList<ReadOnlyMemory<byte>>` | Per-tile payload bytes |

### `NnrpTypedPayload`

| Property | Type | Description |
|---|---|---|
| `PayloadKind` | `PayloadKind` | Payload type |
| `Data` | `ReadOnlyMemory<byte>` | Raw payload bytes |

### `NnrpSubmitResult`

| Property | Type | Description |
|---|---|---|
| `FrameId` | `uint` | Frame ID |
| `ResultClass` | `ResultClass` | Result class |
| `ResultFlags` | `ResultFlags` | Result flags |
| `InferenceMs` | `int` | Inference time (ms) |
| `ServerTotalMs` | `int` | Total server time (ms) |
| `Sections` | `IReadOnlyList<NnrpTensorSection>` | Result tensor sections |
| `TypedPayloads` | `IReadOnlyList<NnrpTypedPayload>` | Non-tensor payload frames |

---

## Example

```csharp
using Nnrp.Client;
using Nnrp.Core;

var profile = new ClientProfile { MaxViews = 1, EnableCache = true };
await using var client = await NnrpClient.ConnectAsync("localhost", 4433, profile);
await using var session = await client.OpenSessionAsync();

var request = new NnrpSubmitRequest
{
    FrameId = 1,
    InputProfile = InputProfile.DenseLumaFrame,
    BudgetPolicy = BudgetPolicy.AllowPartial,
    Sections = new[] { tileSection },
};

var result = await session.SubmitAsync(request);
Console.WriteLine($"Result: {result.ResultClass}, InferenceMs={result.InferenceMs}");
```

---

## Typical Use Cases

### Full Render Loop

```csharp
var config = new NnrpQuicClientConfiguration { CaFile = "ca.pem" };
var profile = new NnrpClientProfile { TransportPolicy = TransportPolicy.PreferQuic };
await using var client = await NnrpClient.ConnectAsync("render.example.com", 4433, profile);
await using var session = await client.OpenSessionAsync();

for (int frameId = 0; ; frameId++)
{
    var (tiles, tensor) = CaptureChangedTiles();
    var result = await session.SubmitAsync(new NnrpSubmitRequest
    {
        FrameId      = frameId,
        TileIds      = tiles,
        Sections     = new[] { tensor },
        InputProfile = InputProfile.ChangedTilesLuma,
        BudgetPolicy = BudgetPolicy.AllowPartial,
    });
    if (result.ResultClass == ResultClass.Complete)
        Display(result.Sections);
}
```

### Responding to Backpressure

```csharp
session.OnResultHint += hint =>
{
    if (hint.CongestionState == ResultHintCongestionState.Saturated)
        _paused = true;
    else if (hint.CongestionState == ResultHintCongestionState.None)
        _paused = false;
};
```

---

## Common Pitfalls

::: warning
1. **Always `await using var session`** — `NnrpClientSession` is `IAsyncDisposable`. Not disposing leaks the underlying transport connection.

2. **Do not call `SubmitAsync` concurrently from multiple threads.** The send path is not thread-safe. Use `Channel<T>` to serialize requests.

3. **After `SubmitAsync` times out, the frame ID slot is still held.** Call `session.DiscardFrame(frameId)` to release it.

4. **`DeadlineMs` is an absolute Unix timestamp in milliseconds**, not a relative offset. Confusing it with `InferenceBudgetMs` causes server-side timeout misdetection.
:::
