# C# — Transport

Transport types are in the `Nnrp.Transport` namespace. The current stable implementation provides TCP framed transport; QUIC support is planned for Preview3.

## Import

```csharp
using Nnrp.Transport;
using Nnrp.Core;
```

---

## Transport Interfaces

### `INnrpMessageTransport`

Unified transport interface for both client and server.

```csharp
public interface INnrpMessageTransport : IAsyncDisposable
{
    TransportId TransportId { get; }
    bool IsConnected { get; }
    Task<NnrpFramedMessage> ReceiveAsync(CancellationToken ct = default);
    Task SendAsync(NnrpFramedMessage message, CancellationToken ct = default);
    Task CloseAsync(CancellationToken ct = default);
}
```

### `INnrpMessageSender`

Write-only view of a transport (for sending only).

```csharp
public interface INnrpMessageSender
{
    Task SendAsync(NnrpFramedMessage message, CancellationToken ct = default);
}
```

### `INnrpMessageReceiver`

Read-only view of a transport (for receiving only).

```csharp
public interface INnrpMessageReceiver
{
    Task<NnrpFramedMessage> ReceiveAsync(CancellationToken ct = default);
}
```

---

## TCP Transport

`NnrpTcpMessageTransport` implements `INnrpMessageTransport` over a `System.Net.Sockets.TcpClient` or `TcpListener`. Uses length-prefixed framing (4-byte big-endian frame length prefix).

### Bind Server

```csharp
public static Task<NnrpTcpMessageTransport> BindServerAsync(
    string host,
    int port,
    NnrpTcpServerOptions? options = null,
    CancellationToken ct = default);
```

### Connect Client

```csharp
public static Task<NnrpTcpMessageTransport> ConnectClientAsync(
    string host,
    int port,
    NnrpTcpClientOptions? options = null,
    CancellationToken ct = default);
```

---

## TCP Configuration

### `NnrpTcpClientOptions`

| Property | Type | Default | Description |
|---|---|---|---|
| `ConnectTimeoutMs` | `int` | `10000` | Connection timeout (ms) |
| `IdleTimeoutMs` | `int` | `30000` | Idle timeout (ms) |
| `MaxFrameBytes` | `int` | `33554432` | Max frame size (32 MB) |
| `SendBufferSize` | `int` | `65536` | TCP send buffer size |
| `ReceiveBufferSize` | `int` | `65536` | TCP receive buffer size |

### `NnrpTcpServerOptions`

| Property | Type | Default | Description |
|---|---|---|---|
| `IdleTimeoutMs` | `int` | `30000` | Idle timeout (ms) |
| `MaxFrameBytes` | `int` | `33554432` | Max frame size (32 MB) |
| `SendBufferSize` | `int` | `65536` | TCP send buffer size |
| `ReceiveBufferSize` | `int` | `65536` | TCP receive buffer size |
| `Backlog` | `int` | `128` | Connection backlog |

---

## QUIC Transport (Preview3)

> **Note:** QUIC transport support is planned for Preview3. The interface will match `INnrpMessageTransport` exactly; existing code will require only a transport factory change.

---

## Custom Transport

Implement `INnrpMessageTransport` to plug in any custom transport layer:

```csharp
public class MyCustomTransport : INnrpMessageTransport
{
    public TransportId TransportId => TransportId.Unspecified;
    public bool IsConnected { get; private set; }

    public async Task<NnrpFramedMessage> ReceiveAsync(CancellationToken ct)
    {
        // Your receive logic here
    }

    public async Task SendAsync(NnrpFramedMessage message, CancellationToken ct)
    {
        // Your send logic here
    }

    public Task CloseAsync(CancellationToken ct)
    {
        IsConnected = false;
        return Task.CompletedTask;
    }

    public ValueTask DisposeAsync()
    {
        // Cleanup
        return ValueTask.CompletedTask;
    }
}
```
