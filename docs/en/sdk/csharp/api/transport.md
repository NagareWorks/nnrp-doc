# C# — Transport API

Transport APIs live in `Nnrp.Core`, `Nnrp.Transport.Tcp`, `Nnrp.Transport.Quic`, and
`Nnrp.NativeBridge`. Application code usually picks one of two paths:

1. Use `NnrpTcpMessageTransport` directly when the app already knows it wants TCP.
2. Use `NnrpAutoTransportClient` from the native bridge when the app wants QUIC/TCP probing,
   scoring, and fallback.

## Imports

```csharp
using Nnrp.Core;
using Nnrp.Transport.Tcp;
using Nnrp.Transport.Quic;
using Nnrp.NativeBridge;
```

## `NnrpTcpMessageTransport.ConnectAsync`

Opens a TCP connection and returns a framed NNRP transport.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `host` | `string` | Yes | Non-empty hostname or IP | Remote host. |
| `port` | `int` | Yes | `1..65535` | Remote TCP port. |
| `cancellationToken` | `CancellationToken` | No | Defaults to `default` | Cancels connect. |

| Returns | Throws |
|---|---|
| `ValueTask<NnrpTcpMessageTransport>` | Argument, connect, or cancellation errors. |

```csharp
await using var transport = await NnrpTcpMessageTransport.ConnectAsync("127.0.0.1", 4433, ct);
```

## `INnrpMessageTransport.SendAsync`

Sends one framed message.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `message` | [`NnrpFramedMessage`](./protocol#nnrpframedmessage) | Yes | Valid framed message | Message to write. |
| `cancellationToken` | `CancellationToken` | Yes | Any token | Cancels write. |

| Returns | Throws |
|---|---|
| `ValueTask` | Transport, disposal, or cancellation errors. |

```csharp
await transport.SendAsync(message, ct);
```

## `INnrpMessageTransport.ReceiveAsync`

Receives one framed message.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `cancellationToken` | `CancellationToken` | Yes | Any token | Cancels receive. |

| Returns | Throws |
|---|---|
| `ValueTask<NnrpFramedMessage>` | Transport, malformed header, disposal, or cancellation errors. |

```csharp
var message = await transport.ReceiveAsync(ct);
```

## `NnrpAutoTransportClient`

The native bridge client probes QUIC and TCP, selects a transport according to `ClientProfile`, and
then exposes submit, ping, cancel, migrate, and hint receive helpers. See [Client](./client#auto-transport-bridge).

| Type | Purpose |
|---|---|
| `NnrpAutoTransportClientOptions` | Host, ports, TLS name, requested model, certificate verification. |
| `NnrpAutoTransportClient` | Connects, probes, submits, receives flow updates/result hints, migrates, closes. |
| `NnrpTransportProbeOptions` | Probe sample count, payload size, timeout, and scoring inputs. |

### `NnrpTransportProbeOptions`

| Property | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `WarmupProbeCount` | `int` | No | `>= 0`, default `1` | Probe samples ignored by scoring so the selected transport is not biased by first-use setup. |
| `ScoredProbeCount` | `int` | No | `> 0`, default `3` | Probe samples included in transport scoring. |
| `PayloadBytes` | `int` | No | `>= 0`, default `16384` | Payload size used by probe messages. |
| `ProbeTimeout` | `TimeSpan` | No | `>= TimeSpan.Zero`, default `2s` | Timeout for each probe attempt. |

## Core Transport Types

### `INnrpMessageSender`

| Method | Parameter | Returns | Description |
|---|---|---|---|
| `SendAsync` | [`NnrpFramedMessage`](./protocol#nnrpframedmessage), `CancellationToken` | `ValueTask` | Writes one framed message. |

### `INnrpMessageReceiver`

| Method | Parameter | Returns | Description |
|---|---|---|---|
| `ReceiveAsync` | `CancellationToken` | `ValueTask<NnrpFramedMessage>` | Reads one framed message. |

### `INnrpMessageTransport`

Combines `INnrpMessageSender` and `INnrpMessageReceiver`.

### `INnrpTransportIdentity`

| Property | Type | Description |
|---|---|---|
| `TransportId` | [`TransportId`](./enums#transportid) | Active NNRP transport binding. |

## Common Pitfalls

::: warning
1. `NnrpTcpMessageTransport` uses NNRP header lengths for framing; do not add an extra length prefix.
2. `SendAsync` and `ReceiveAsync` have separate internal gates, but application-level request ordering is still your responsibility.
3. Dispose transports with `await using` or `DisposeAsync`.
4. Use the native bridge path for QUIC/TCP scoring and selection instead of hand-writing probe orchestration in application code.
:::
