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
