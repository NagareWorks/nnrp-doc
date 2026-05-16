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
