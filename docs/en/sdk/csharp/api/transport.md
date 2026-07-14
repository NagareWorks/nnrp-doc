# C# — Transport API

Transport APIs live in `Nnrp.Core`, `Nnrp.Transport.Tcp`, `Nnrp.Transport.Quic`, and
`Nnrp.NativeBridge`. Application code usually picks one of two paths:

1. Use `NnrpTcpMessageTransport` directly when the app already knows it wants TCP.
2. Use the native bridge host surfaces plus the TCP/QUIC runtime packages when the app wants
   Rust-backed connection, session, submit/result, cancellation, and control paths.

## Imports

```csharp
using Nnrp.Core;
using Nnrp.Transport.Tcp;
using Nnrp.Transport.Quic;
using Nnrp.NativeBridge;
```

## `NnrpTcpMessageTransport.ConnectAsync`

Opens a TCP connection and returns a framed NNRP transport.

| Parameter           | Type                | Required | Values / Range           | Description      |
| ------------------- | ------------------- | -------: | ------------------------ | ---------------- |
| `host`              | `string`            |      Yes | Non-empty hostname or IP | Remote host.     |
| `port`              | `int`               |      Yes | `1..65535`               | Remote TCP port. |
| `cancellationToken` | `CancellationToken` |       No | Defaults to `default`    | Cancels connect. |

| Returns                              | Throws                                     |
| ------------------------------------ | ------------------------------------------ |
| `ValueTask<NnrpTcpMessageTransport>` | Argument, connect, or cancellation errors. |

```csharp
await using var transport = await NnrpTcpMessageTransport.ConnectAsync("127.0.0.1", 4433, ct);
```

## `INnrpMessageTransport.SendAsync`

Sends one framed message.

| Parameter           | Type                                                | Required | Values / Range       | Description       |
| ------------------- | --------------------------------------------------- | -------: | -------------------- | ----------------- |
| `message`           | [`NnrpFramedMessage`](./protocol#nnrpframedmessage) |      Yes | Valid framed message | Message to write. |
| `cancellationToken` | `CancellationToken`                                 |      Yes | Any token            | Cancels write.    |

| Returns     | Throws                                       |
| ----------- | -------------------------------------------- |
| `ValueTask` | Transport, disposal, or cancellation errors. |

```csharp
await transport.SendAsync(message, ct);
```

## `INnrpMessageTransport.ReceiveAsync`

Receives one framed message.

| Parameter           | Type                | Required | Values / Range | Description      |
| ------------------- | ------------------- | -------: | -------------- | ---------------- |
| `cancellationToken` | `CancellationToken` |      Yes | Any token      | Cancels receive. |

| Returns                        | Throws                                                         |
| ------------------------------ | -------------------------------------------------------------- |
| `ValueTask<NnrpFramedMessage>` | Transport, malformed header, disposal, or cancellation errors. |

```csharp
var message = await transport.ReceiveAsync(ct);
```

## Native Runtime Transport Providers

`Nnrp.Transport.Tcp`, `Nnrp.Transport.Quic`, `Nnrp.Transport.Ipc`, and `Nnrp.Transport.WebSocket`
each expose a provider and runtime helper that map the package boundary to the Rust native transport slot. Use them with the native bridge host facades
described in [Client](./client#native-runtime-bridge).

| Type                              | Purpose                                                  |
| --------------------------------- | -------------------------------------------------------- |
| `NnrpNativeTcpTransportProvider`  | TCP provider identity for native runtime selection.      |
| `NnrpNativeQuicTransportProvider` | QUIC provider identity for native runtime selection.     |
| `NnrpNativeIpcTransportProvider` | IPC provider identity for native runtime selection.     |
| `NnrpNativeWebSocketTransportProvider` | WebSocket provider identity for native runtime selection. |
| `NnrpNativeTcpRuntime`            | Opens TCP-backed session, connection, and server hosts.  |
| `NnrpNativeQuicRuntime`           | Opens QUIC-backed session, connection, and server hosts. |
| `NnrpNativeIpcRuntime`            | Opens IPC-backed session, connection, and server hosts. |
| `NnrpNativeWebSocketRuntime`      | Opens WebSocket-backed session, connection, and server hosts. |

```csharp
using var host = NnrpNativeTcpRuntime.OpenConnectionHost(
    new NnrpNativeTcpRuntimeConnectionHostOptions(connectionId: 1, connectionGeneration: 1));
```

### Provider selection model

| C# type | Frozen properties |
|---|---|
| `NnrpTransportProviderCost` | `ModelId: ushort`, `Units: ulong` |
| `NnrpTransportProviderLimits` | `MaxFrameBytes: ulong` |
| `NnrpTransportProviderLimitation` | `RequiresUdp`, `RequiresTcp`, `LocalHostOnly`, `NativeHostOnly`, `BrowserHostOnly`, `UnixDomainSocket`, `WindowsNamedPipe` |
| `NnrpTransportProviderMetadata` | `Id`, `Cost`, `PreferenceRank`, `Limits`, `Limitations` |
| `NnrpTransportProviderDescriptor` | `Name`, `Version`, `TransportId`, `Kind`, `Available`, `LibraryPath`, `Metadata`, `Diagnostic` |
| `NnrpTransportProbeState` | `NotRun`, `Succeeded`, `Failed`, `Missing` |
| `NnrpTransportProbeMetrics` | `SampleCount`, `SuccessCount`, `MedianThroughputBytesPerSecond`, `MedianRttMicroseconds` |
| `NnrpTransportRejectionReason` | `PolicyDisallowed`, `LocalUnavailable`, `PeerUnsupported`, `LimitExceeded`, `ProbeMissing`, `ProbeFailed` |
| `NnrpTransportCandidate` | `TransportId`, `Provider`, `LocalAvailable`, `PeerSupported`, `WithinLimits`, `ProbeState`, `Probe`, `SelectionRank`, `RejectionReason`, `Diagnostic` |
| `NnrpTransportSelection` | `SelectedProvider`, ordered `Candidates`, `Policy`, `Diagnostic` |

C# validates provider metadata from each Rust artifact and uses the comparator frozen in
[Transport Strategy and Probing](/en/protocol/v1/transport-strategy). It does not expose a C#-specific weighted score.

## Core Transport Types

### `INnrpMessageSender`

| Method      | Parameter                                                                | Returns     | Description                |
| ----------- | ------------------------------------------------------------------------ | ----------- | -------------------------- |
| `SendAsync` | [`NnrpFramedMessage`](./protocol#nnrpframedmessage), `CancellationToken` | `ValueTask` | Writes one framed message. |

### `INnrpMessageReceiver`

| Method         | Parameter           | Returns                        | Description               |
| -------------- | ------------------- | ------------------------------ | ------------------------- |
| `ReceiveAsync` | `CancellationToken` | `ValueTask<NnrpFramedMessage>` | Reads one framed message. |

### `INnrpMessageTransport`

Combines `INnrpMessageSender` and `INnrpMessageReceiver`.

### `INnrpTransportIdentity`

| Property      | Type                                 | Description                    |
| ------------- | ------------------------------------ | ------------------------------ |
| `TransportId` | [`TransportId`](./enums#transportid) | Active NNRP transport binding. |

## Common Pitfalls

::: warning

1. `NnrpTcpMessageTransport` uses NNRP header lengths for framing; do not add an extra length
   prefix.
2. `SendAsync` and `ReceiveAsync` have separate internal gates, but application-level request
   ordering is still your responsibility.
3. Dispose transports with `await using` or `DisposeAsync`.
4. Use `NnrpNativeTcpRuntime` or `NnrpNativeQuicRuntime` for Rust-backed runtime paths; keep
   `NnrpTcpMessageTransport` for low-level TCP framing tests and diagnostics. :::
