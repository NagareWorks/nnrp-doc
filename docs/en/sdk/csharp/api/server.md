# C# — Server

Server API is in the `Nnrp.Server` namespace.

## Import

```csharp
using Nnrp.Server;
using Nnrp.Core;
```

---

## `ServerProfile`

Server configuration (mutable class).

| Property | Type | Default | Description |
|---|---|---|---|
| `MaxConcurrentFrames` | `int` | `1` | Max in-flight frames |
| `EnableCache` | `bool` | `true` | Enable cache negotiation |
| `MaxSections` | `int` | `16` | Max tensor sections per frame |
| `MaxBodyBytes` | `int` | `33554432` | Max body bytes (32 MB) |
| `ModelName` | `string` | `""` | Model name (sent in `SERVER_HELLO_ACK`) |

```csharp
public NnrpCapabilitySelection ToCapabilities();
public ServerHelloAckMessage CreateServerHelloAck(ClientHelloMessage hello, uint sessionId);
public bool TryValidate(ClientHelloMessage hello, out NnrpProtocolFailure? failure);
```

---

## `INnrpServerSession`

Server session interface for receiving frames and pushing results.

```csharp
public interface INnrpServerSession : IAsyncDisposable
{
    uint SessionId { get; }
    TransportId ActiveTransportId { get; }
    ClientHelloMessage ClientHello { get; }
    NnrpCapabilitySelection Capabilities { get; }

    Task<NnrpFrameSubmit> ReceiveSubmitAsync(CancellationToken ct = default);
    Task SendResultAsync(NnrpResult result, CancellationToken ct = default);
    Task SendResultDropAsync(uint frameId, CancellationToken ct = default);
    Task SendFlowUpdateAsync(FlowUpdateMessage update, CancellationToken ct = default);
    Task CloseAsync(CancellationToken ct = default);
}
```

**Method Parameter Reference**

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `ReceiveSubmitAsync` | `ct` | `NnrpFrameSubmit` | Block until the next `FRAME_SUBMIT` arrives; throws `NnrpConnectionClosedException` on disconnect |
| `SendResultAsync` | `result`: [`NnrpResult`](#nnrpresult) (requires `FrameId`, `ResultClass`); `ct` | `Task` | Push inference result back to the client; populate either `Sections` or `TypedPayloads` |
| `SendResultDropAsync` | `frameId`: frame to drop; `ct` | `Task` | Notify the client this frame won't return a result. **Must be called** when dropping a frame or `SubmitAsync` on the client side will block forever |
| `SendFlowUpdateAsync` | `update`: `FlowUpdateMessage` with `Flags` ([`FlowUpdateFlags`](/en/sdk/csharp/api/enums#flow-control-enums)), `Credit` (allowed in-flight count), `RetryAfterMs` | `Task` | Send backpressure signal; `Credit=0` pauses the client |
| `CloseAsync` | — | `Task` | Send `CLOSE` and gracefully terminate the connection |

> **`NnrpResult` key fields**: `FrameId` (required), `ResultClass` ([`ResultClass`](/en/sdk/csharp/api/enums#data-plane-enums), required), `Sections` (output tensor sections), `InferenceMs` (inference latency), `AppliedBudgetPolicy` (actual policy used — required when `Partial` or `Degraded`).

---

## `NnrpServerSession`

Default implementation of `INnrpServerSession` (`sealed class`).

Obtained via `NnrpServer.AcceptAsync()`.

---

## Data Types

### `NnrpFrameSubmit`

Received and parsed frame submission.

| Property | Type | Description |
|---|---|---|
| `FrameId` | `uint` | Frame ID |
| `SessionId` | `uint` | Session ID |
| `InputProfile` | `InputProfile` | Input data format |
| `BudgetPolicy` | `BudgetPolicy` | Allowed degradation |
| `InferenceBudgetMs` | `int` | Client budget (ms) |
| `DeadlineMs` | `long` | Deadline |
| `Sections` | `IReadOnlyList<NnrpTensorSection>` | Tensor sections |
| `TypedPayloads` | `IReadOnlyList<NnrpTypedPayload>` | Non-tensor payloads |

### `NnrpResult`

Result to push to client.

| Property | Type | Description |
|---|---|---|
| `FrameId` | `uint` | Frame ID |
| `ResultClass` | `ResultClass` | Result completeness class |
| `ResultFlags` | `ResultFlags` | Result flags |
| `AppliedBudgetPolicy` | `BudgetPolicy` | Actual degradation applied |
| `InferenceMs` | `int` | Inference time (ms) |
| `QueueMs` | `int` | Queue wait time (ms) |
| `ServerTotalMs` | `int` | Total server time (ms) |
| `StatusCode` | `int` | Status code |
| `Sections` | `IReadOnlyList<NnrpTensorSection>` | Result tensor sections |
| `TypedPayloads` | `IReadOnlyList<NnrpTypedPayload>` | Non-tensor payload frames |

---

## `NnrpServer`

Top-level server that accepts connections.

```csharp
public sealed class NnrpServer : IAsyncDisposable
{
    public static Task<NnrpServer> BindAsync(
        string host, int port,
        ServerProfile profile,
        NnrpServerOptions? options = null,
        CancellationToken ct = default);

    public Task<INnrpServerSession> AcceptAsync(
        CancellationToken ct = default);

    public Task<INnrpServerSession> AcceptWithAuthAsync(
        Func<ClientHelloMessage, bool> authValidator,
        CancellationToken ct = default);

    public ValueTask DisposeAsync();
}
```

### `NnrpServerOptions`

| Property | Type | Default | Description |
|---|---|---|---|
| `UseQuic` | `bool` | `false` | Use QUIC instead of TCP (Preview3) |
| `CertificatePath` | `string?` | `null` | TLS certificate path (for QUIC) |
| `PrivateKeyPath` | `string?` | `null` | TLS private key path |

---

## Example

```csharp
using Nnrp.Server;
using Nnrp.Core;

var profile = new ServerProfile { MaxConcurrentFrames = 4 };
await using var server = await NnrpServer.BindAsync("0.0.0.0", 4433, profile);

while (true)
{
    var session = await server.AcceptWithAuthAsync(hello =>
        ValidateAuthBlock(hello.AuthBlock.Span));

    _ = Task.Run(async () =>
    {
        try
        {
            while (true)
            {
                var submit = await session.ReceiveSubmitAsync();
                var output = RunInference(submit);
                await session.SendResultAsync(new NnrpResult
                {
                    FrameId = submit.FrameId,
                    ResultClass = ResultClass.Complete,
                    InferenceMs = output.InferenceMs,
                    Sections = output.Sections,
                });
            }
        }
        finally
        {
            await session.DisposeAsync();
        }
    });
}
```

---

## Typical Use Cases

### Authentication

```csharp
var serverProfile = new NnrpServerProfile
{
    MaxConcurrentFrames = 8,
    AuthValidator = authBlock =>
    {
        if (authBlock.Length < 32) return false;
        var expected = Hmac.Sha256(SECRET_KEY, authBlock[32..]);
        return CryptographicOperations.FixedTimeEquals(
            authBlock[..32], expected);
    },
};
```

### Backpressure and Degradation

```csharp
async Task HandleAsync(INnrpServerSession session)
{
    while (true)
    {
        var submit = await session.ReceiveSubmitAsync();
        if (_queue > MaxQueue)
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

## Common Pitfalls

::: warning
1. **Never block inside `await ReceiveSubmitAsync()`.** Wrap synchronous inference in `Task.Run`; blocking the I/O thread causes PING/PONG timeouts.

2. **Timed-out frames must get `SendResultDropAsync`.** Silently skipping them leaves the client's `SubmitAsync` hanging forever.

3. **`AuthValidator` is a synchronous delegate.** For async auth (database lookup), either cache tokens in memory or use `AsyncAuthValidator` overload.

4. **`MaxConcurrentFrames` is a soft limit.** Implement `SemaphoreSlim`-based concurrency control at the application layer.
:::
