# C# — Client API

The C# client API is centered on `NnrpClient`: connect, submit, receive session events, migrate when
needed, and close. Low-level protocol objects remain available, but application code should start
from the methods below.

## Imports

```csharp
using Nnrp.Client;
using Nnrp.Core;
```

## Client Workflow

1. Create a [`ClientProfile`](#clientprofile).
2. Create an `INnrpMessageTransport` or let a bridge/bootstrap helper choose one.
3. Construct [`NnrpClient`](#nnrpclient) and call [`ConnectAsync`](#nnrpclient-connectasync).
4. Submit with [`SubmitAsync`](#nnrpclient-submitasync) or send first and await later with
   [`SendSubmitAsync`](#nnrpclient-sendsubmitasync) plus
   [`ReceiveResultAsync`](#nnrpclient-receiveresultasync).
5. Read control events with [`ReceiveNextEventAsync`](#nnrpclient-receivenexteventasync) when your
   app needs flow updates or result hints.
6. Close with [`CloseAsync`](#nnrpclient-closeasync).

## `NnrpClient`

Top-level client over a selected message transport.

### Constructor

| Parameter   | Type                                                         | Required | Values / Range      | Description                                   |
| ----------- | ------------------------------------------------------------ | -------: | ------------------- | --------------------------------------------- |
| `profile`   | [`ClientProfile`](#clientprofile)                            |      Yes | Non-null            | Client capabilities and preferences.          |
| `transport` | [`INnrpMessageTransport`](./transport#innrpmessagetransport) |      Yes | Connected transport | TCP, QUIC bridge, or custom framed transport. |

| Returns      | Raises                                                    |
| ------------ | --------------------------------------------------------- |
| `NnrpClient` | `ArgumentNullException` when required arguments are null. |

```csharp
var client = new NnrpClient(profile, transport);
```

### `NnrpClient.ConnectAsync`

Sends `CLIENT_HELLO`, validates `SERVER_HELLO_ACK`, and activates the session state.

| Parameter            | Type                | Required | Values / Range               | Description              |
| -------------------- | ------------------- | -------: | ---------------------------- | ------------------------ |
| `requestedSessionId` | `uint`              |       No | `0` lets the server allocate | Requested session id.    |
| `traceId`            | `ulong`             |       No | Any trace id                 | Trace correlation value. |
| `cancellationToken`  | `CancellationToken` |       No | Defaults to `default`        | Cancels transport I/O.   |

| Returns                                               | Raises                                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`NnrpClientConnectResult`](#nnrpclientconnectresult) | Transport exceptions; malformed ack is returned as a failed result when possible. |

```csharp
var connect = await client.ConnectAsync(requestedSessionId: 1, cancellationToken: ct);
if (!connect.IsConnected)
{
    throw new InvalidOperationException(connect.Failure.ToString());
}
```

### `NnrpClient.SubmitAsync`

Submits one frame and waits for the matching `RESULT_PUSH`.

| Parameter           | Type                                      | Required | Values / Range                           | Description                              |
| ------------------- | ----------------------------------------- | -------: | ---------------------------------------- | ---------------------------------------- |
| `submitRequest`     | [`NnrpSubmitRequest`](#nnrpsubmitrequest) |      Yes | `FrameId` must be unique while in flight | Structured inline tensor submit request. |
| `cancellationToken` | `CancellationToken`                       |       No | Defaults to `default`                    | Cancels send or receive.                 |

| Returns                                 | Raises                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| [`NnrpSubmitResult`](#nnrpsubmitresult) | Transport exceptions, `InvalidOperationException` for drops or correlation errors. |

```csharp
var result = await client.SubmitAsync(new NnrpSubmitRequest(
    frameId: 1,
    sourceWidth: 1920,
    sourceHeight: 1080,
    tileWidth: 256,
    tileHeight: 256,
    cameraBlock: cameraBytes,
    tileIds: tileIds,
    sections: tensorSections), ct);
```

### `NnrpClient.SendSubmitAsync`

Sends a frame and returns after the packet is written. Use this for multiple in-flight frames.

| Parameter           | Type                                      | Required | Values / Range                           | Description                    |
| ------------------- | ----------------------------------------- | -------: | ---------------------------------------- | ------------------------------ |
| `submitRequest`     | [`NnrpSubmitRequest`](#nnrpsubmitrequest) |      Yes | `FrameId` must be unique while in flight | Request to serialize and send. |
| `cancellationToken` | `CancellationToken`                       |       No | Defaults to `default`                    | Cancels send.                  |

| Returns                                     | Raises                                                         |
| ------------------------------------------- | -------------------------------------------------------------- |
| [`NnrpSubmittedFrame`](#nnrpsubmittedframe) | Serialization, transport, or duplicate in-flight frame errors. |

```csharp
var submitted = await client.SendSubmitAsync(request, ct);
```

### `NnrpClient.ReceiveResultAsync`

Waits for the result matching a previously submitted frame.

| Parameter           | Type                | Required | Values / Range           | Description        |
| ------------------- | ------------------- | -------: | ------------------------ | ------------------ |
| `expectedFrameId`   | `uint`              |      Yes | Existing in-flight frame | Frame id to match. |
| `expectedViewId`    | `ushort`            |       No | Defaults to `0`          | View id to match.  |
| `cancellationToken` | `CancellationToken` |       No | Defaults to `default`    | Cancels receive.   |

| Returns             | Raises                                                           |
| ------------------- | ---------------------------------------------------------------- |
| `ResultPushMessage` | Drop, malformed packet, session mismatch, or correlation errors. |

```csharp
var resultMessage = await client.ReceiveResultAsync(submitted.FrameId, submitted.ViewId, ct);
```

### `NnrpClient.ReceiveNextEventAsync`

Reads the next session event, including result pushes, result drops, flow updates, and result hints.

| Parameter           | Type                | Required | Values / Range        | Description      |
| ------------------- | ------------------- | -------: | --------------------- | ---------------- |
| `cancellationToken` | `CancellationToken` |       No | Defaults to `default` | Cancels receive. |

| Returns                                 | Raises                     |
| --------------------------------------- | -------------------------- |
| [`NnrpSessionEvent`](#nnrpsessionevent) | Transport or parse errors. |

```csharp
var sessionEvent = await client.ReceiveNextEventAsync(ct);
if (sessionEvent.MessageType == MessageType.FlowUpdate)
{
    ApplyBackpressure(sessionEvent.FlowUpdate);
}
```

### `NnrpClient.CloseAsync`

Sends `CLOSE` for active sessions and clears local in-flight state.

| Parameter           | Type                | Required | Values / Range        | Description                  |
| ------------------- | ------------------- | -------: | --------------------- | ---------------------------- |
| `reason`            | `string`            |       No | Defaults to `""`      | Human-readable close reason. |
| `traceId`           | `ulong`             |       No | Any trace id          | Trace correlation value.     |
| `cancellationToken` | `CancellationToken` |       No | Defaults to `default` | Cancels send.                |

| Returns                                                 | Raises            |
| ------------------------------------------------------- | ----------------- |
| [`NnrpProtocolFailure`](./protocol#nnrpprotocolfailure) | Transport errors. |

```csharp
await client.CloseAsync("shutdown", cancellationToken: ct);
```

## Native Runtime Bridge

`Nnrp.NativeBridge` exposes Rust-backed host facades for client sessions, shared client connections,
and server sessions. Use the TCP or QUIC runtime package to bind the host facade to a specific
transport slot.

### `NnrpNativeRuntimeConnectionHost.OpenSession`

| Parameter | Type                              | Required | Values / Range                                                | Description                                                          |
| --------- | --------------------------------- | -------: | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| `options` | `NnrpNativeRuntimeSessionOptions` |      Yes | Session id, generation, profile id, schema id, schema version | Opens a native-backed session on an existing native connection host. |

| Returns                    | Raises                                                         |
| -------------------------- | -------------------------------------------------------------- |
| `NnrpNativeRuntimeSession` | Native artifact load, connection, session, or disposal errors. |

```csharp
using var connection = NnrpNativeQuicRuntime.OpenConnectionHost(
    new NnrpNativeQuicRuntimeConnectionHostOptions(connectionId: 1, connectionGeneration: 1));

using var session = connection.OpenSession(
    new NnrpNativeRuntimeSessionOptions(sessionId: 1, sessionGeneration: 1, profileId: 1, schemaId: 1, schemaVersion: 1));
```

## Core Types

### `ClientProfile`

Client capabilities sent during handshake.

| Property                 | Type                                          | Default                      | Description                         |
| ------------------------ | --------------------------------------------- | ---------------------------- | ----------------------------------- |
| `TransportPolicy`        | [`TransportPolicy`](./enums#transport-policy) | `PreferQuic` or repo default | Transport preference.               |
| `SessionLossTolerance`   | [`LossTolerance`](./enums#loss-tolerance)     | Repo default                 | Accepted loss policy.               |
| `MaxViews`               | `int`                                         | `1`                          | Maximum concurrent views.           |
| `EnableCache`            | `bool`                                        | `true`                       | Whether cache support is requested. |
| `MaxCacheEntries`        | `int`                                         | `256`                        | Requested cache entry count.        |
| `SupportedCodecs`        | `CodecId[]`                                   | Standard set                 | Codec capability bitmap.            |
| `SupportedDTypes`        | `DTypeId[]`                                   | Standard set                 | Tensor dtype capability bitmap.     |
| `SupportedTensorLayouts` | `TensorLayoutId[]`                            | Standard set                 | Tensor layout capability bitmap.    |

### `NnrpSubmitRequest`

Inline tensor submit request.

| Property                       | Type                                           | Required | Description                                    |
| ------------------------------ | ---------------------------------------------- | -------: | ---------------------------------------------- |
| `OperationId`                  | `ulong`                                        |      Yes | Non-zero lifecycle id, independent from `FrameId`. |
| `FrameId`                      | `uint`                                         |      Yes | Unique frame id while in flight.               |
| `SourceWidth` / `SourceHeight` | `ushort`                                       |      Yes | Source dimensions.                             |
| `TileWidth` / `TileHeight`     | `ushort`                                       |      Yes | Tile dimensions.                               |
| `CameraBlock`                  | `ReadOnlyMemory<byte>`                         |      Yes | Camera metadata block.                         |
| `TileIds`                      | `ReadOnlyMemory<ushort>`                       |      Yes | Tile ids encoded according to `TileIndexMode`. |
| `Sections`                     | `ReadOnlyMemory<TensorSectionBlock>`           |      Yes | Tensor payload sections.                       |
| `ViewId`                       | `ushort`                                       |       No | Defaults to `0`.                               |
| `TraceId`                      | `ulong`                                        |       No | Defaults to `0`.                               |
| `FrameClass`                   | [`FrameClass`](./enums#frame-classification)   |       No | Defaults to `Keyframe`.                        |
| `InputProfile`                 | [`InputProfile`](./enums#frame-classification) |       No | Defaults to `DenseLumaFrame`.                  |
| `TileIndexMode`                | [`TileIndexMode`](./enums#data-plane-enums)    |       No | Defaults to `RawUInt16`.                       |
| `LatencyBudgetMilliseconds`    | `ushort`                                       |       No | Defaults to `16`.                              |
| `CadenceHintX100`              | `ushort`                                       |       No | FPS times 100; `0` means unspecified.          |
| `DependencyFrameId`            | `uint`                                         |       No | Defaults to `0`.                               |
| `TileBaseId`                   | `uint`                                         |       No | Defaults to `0`.                               |

### `NnrpSubmitResult`

Structured result returned by `SubmitAsync`.

| Property                  | Type                                      | Description                 |
| ------------------------- | ----------------------------------------- | --------------------------- |
| `SessionId`               | `uint`                                    | Negotiated session id.      |
| `FrameId`                 | `uint`                                    | Result frame id.            |
| `ViewId`                  | `ushort`                                  | Result view id.             |
| `StatusCode`              | `ResultStatusCode`                        | Result status.              |
| `ResultClass`             | [`ResultClass`](./enums#data-plane-enums) | Completeness class.         |
| `ResultFlags`             | [`ResultFlags`](./enums#data-plane-enums) | Result flags.               |
| `InferenceMilliseconds`   | `ushort`                                  | Model execution time.       |
| `QueueMilliseconds`       | `ushort`                                  | Queue wait time.            |
| `ServerTotalMilliseconds` | `ushort`                                  | Total server-side time.     |
| `TileIds`                 | `ReadOnlyMemory<ushort>`                  | Result tile ids.            |
| `Sections`                | `ReadOnlyMemory<TensorSectionBlock>`      | Result tensor sections.     |
| `TypedPayloadFrames`      | `ReadOnlyMemory<TypedPayloadFrameView>`   | Non-tensor result payloads. |

### `NnrpClientConnectResult`

| Property            | Type                                                    | Description                                          |
| ------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `IsConnected`       | `bool`                                                  | `true` when negotiation succeeded.                   |
| `NegotiationResult` | `NnrpCapabilityNegotiationResult`                       | Accepted or rejected capability negotiation details. |
| `Failure`           | [`NnrpProtocolFailure`](./protocol#nnrpprotocolfailure) | Failure details when not connected.                  |

### `NnrpSubmittedFrame`

| Property     | Type     | Description                     |
| ------------ | -------- | ------------------------------- |
| `SessionId`  | `uint`   | Session id used for the submit. |
| `FrameId`    | `uint`   | Submitted frame id.             |
| `ViewId`     | `ushort` | Submitted view id.              |
| `TraceId`    | `ulong`  | Trace id.                       |
| `WireFormat` | `byte`   | Current NNRP wire format.       |

### `NnrpSessionEvent`

Event returned by `ReceiveNextEventAsync`.

| Property      | Type                                   | Description                          |
| ------------- | -------------------------------------- | ------------------------------------ |
| `MessageType` | [`MessageType`](./enums#message-types) | Event packet type.                   |
| `ResultPush`  | `ResultPushMessage`                    | Valid when `IsResultPush` is `true`. |
| `ResultDrop`  | `ResultDropMessage`                    | Valid when `IsResultDrop` is `true`. |
| `FlowUpdate`  | `FlowUpdateMessage`                    | Valid when `IsFlowUpdate` is `true`. |
| `ResultHint`  | `ResultHintMessage`                    | Valid when `IsResultHint` is `true`. |

## Common Pitfalls

::: warning

1. `NnrpClient` does not own arbitrary transport creation; construct or select the transport first.
2. `FrameId` plus `ViewId` must be unique while in flight.
3. Use `ReceiveNextEventAsync` when the server may send flow updates or result hints between
   results.
4. Always call `CloseAsync` and dispose the underlying transport or bridge. :::
