# C# — Server API

The C# server API is session-oriented: accept the handshake, receive submits, send results or drops,
and close. This page documents the application-facing methods first and keeps message types as
linked references.

## Imports

```csharp
using Nnrp.Server;
using Nnrp.Core;
```

## Server Workflow

1. Create a [`ServerProfile`](#serverprofile).
2. Create an `INnrpMessageTransport` for an accepted connection.
3. Construct [`NnrpServerSession`](#nnrpserversession) and call
   [`AcceptAsync`](#nnrpserversession-acceptasync).
4. Loop on [`ReceiveSubmitAsync`](#nnrpserversession-receivesubmitasync).
5. Respond with [`SendResultAsync`](#nnrpserversession-sendresultasync) or
   [`SendResultDropAsync`](#nnrpserversession-sendresultdropasync).
6. Close with [`CloseAsync`](#nnrpserversession-closeasync).

## `NnrpServerSession`

Default server session implementation.

### Constructor

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `profile` | [`ServerProfile`](#serverprofile) | Yes | Non-null | Server capabilities and limits. |
| `transport` | [`INnrpMessageTransport`](./transport#innrpmessagetransport) | Yes | Accepted connection | Framed transport for this peer. |
| `sessionIdAllocator` | `Func<uint, uint>?` | No | Defaults to echo-or-one | Maps requested ids to server session ids. |
| `cacheStore` | [`NnrpCacheStore`](./protocol#nnrpcachestore)`?` | No | Optional | Enables cache message handling. |

| Returns | Raises |
|---|---|
| `NnrpServerSession` | `ArgumentNullException` for required arguments. |

```csharp
var session = new NnrpServerSession(profile, transport);
```

### `NnrpServerSession.AcceptAsync`

Receives `CLIENT_HELLO`, negotiates capabilities, sends `SERVER_HELLO_ACK`, and activates the
session.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `cancellationToken` | `CancellationToken` | Yes | Any token | Cancels receive or send. |

| Returns | Raises |
|---|---|
| [`NnrpProtocolFailure`](./protocol#nnrpprotocolfailure) | Transport exceptions; negotiation failures are returned. |

```csharp
var failure = await session.AcceptAsync(ct);
if (failure.IsFailure)
{
    return;
}
```

### `NnrpServerSession.ReceiveSubmitAsync`

Receives and parses the next frame submission.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `cancellationToken` | `CancellationToken` | Yes | Any token | Cancels receive. |

| Returns | Raises |
|---|---|
| [`NnrpFrameSubmit`](#nnrpframesubmit) | Close, malformed submit, session mismatch, lifecycle errors. |

```csharp
var submit = await session.ReceiveSubmitAsync(ct);
```

### `NnrpServerSession.SendResultAsync`

Sends a result for a submitted frame.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `result` | [`NnrpResult`](#nnrpresult) | Yes | `FrameId` must match a submitted frame | Structured result to serialize as `RESULT_PUSH`. |
| `cancellationToken` | `CancellationToken` | Yes | Any token | Cancels send. |

| Returns | Raises |
|---|---|
| `ValueTask` | Lifecycle, correlation, serialization, or transport errors. |

```csharp
await session.SendResultAsync(new NnrpResult(
    frameId: submit.FrameId,
    viewId: submit.ViewId,
    traceId: submit.TraceId,
    tileIds: submit.TileIds,
    sections: outputSections), ct);
```

### `NnrpServerSession.SendResultDropAsync`

Sends `RESULT_DROP` for a frame that will not produce a result.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `dropMessage` | `ResultDropMessage` | Yes | Must match the active session | Drop message to send. |
| `cancellationToken` | `CancellationToken` | Yes | Any token | Cancels send. |

| Returns | Raises |
|---|---|
| `ValueTask` | Lifecycle, correlation, or transport errors. |

```csharp
await session.SendResultDropAsync(ResultDropMessage.Create(session.SessionId, submit.FrameId), ct);
```

### `NnrpServerSession.CloseAsync`

Gracefully closes an active session.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `reason` | `string` | Yes | Empty string allowed | Close reason. |
| `traceId` | `ulong` | Yes | Any trace id | Trace correlation value. |
| `cancellationToken` | `CancellationToken` | Yes | Any token | Cancels send. |

| Returns | Raises |
|---|---|
| [`NnrpProtocolFailure`](./protocol#nnrpprotocolfailure) | Transport errors. |

```csharp
await session.CloseAsync("shutdown", traceId: 0, ct);
```

## Core Types

### `ServerProfile`

Server capability and limit configuration.

| Property | Type | Default | Description |
|---|---|---|---|
| `MaxConcurrentFrames` | `int` | `1` | Advertised in-flight frame limit. |
| `EnableCache` | `bool` | `true` | Enables cache negotiation. |
| `MaxSections` | `int` | `16` | Maximum sections per frame. |
| `MaxBodyBytes` | `int` | `33554432` | Maximum request body size. |
| `ModelName` | `string` | `""` | Model name returned in the handshake when configured. |

### `NnrpFrameSubmit`

Structured frame submission returned by `ReceiveSubmitAsync`.

| Property | Type | Description |
|---|---|---|
| `SessionId` | `uint` | Session id. |
| `FrameId` | `uint` | Submitted frame id. |
| `ViewId` | `ushort` | Submitted view id. |
| `TraceId` | `ulong` | Trace id. |
| `SourceWidth` / `SourceHeight` | `ushort` | Source dimensions. |
| `TileWidth` / `TileHeight` | `ushort` | Tile dimensions. |
| `CameraBlock` | `ReadOnlyMemory<byte>` | Camera metadata block. |
| `TileIds` | `ReadOnlyMemory<ushort>` | Submitted tile ids. |
| `Sections` | `ReadOnlyMemory<TensorSectionBlock>` | Tensor sections. |
| `FrameClass` | [`FrameClass`](./enums#frame-classification) | Frame class. |
| `InputProfile` | [`InputProfile`](./enums#frame-classification) | Input profile. |

### `NnrpResult`

Structured result accepted by `SendResultAsync`.

| Property | Type | Required | Description |
|---|---|---:|---|
| `FrameId` | `uint` | Yes | Frame id being answered. |
| `ViewId` | `ushort` | Yes | View id being answered. |
| `TraceId` | `ulong` | No | Trace id. |
| `TileIds` | `ReadOnlyMemory<ushort>` | No | Result tile ids. |
| `Sections` | `ReadOnlyMemory<TensorSectionBlock>` | No | Result tensor sections. |
| `ResultClass` | [`ResultClass`](./enums#data-plane-enums) | No | Completeness class. |
| `ResultFlags` | [`ResultFlags`](./enums#data-plane-enums) | No | Result flags. |
| `AppliedBudgetPolicy` | [`BudgetPolicy`](./enums#data-plane-enums) | No | Degradation actually used. |
| `InferenceMilliseconds` | `ushort` | No | Model execution time. |
| `QueueMilliseconds` | `ushort` | No | Queue wait time. |
| `ServerTotalMilliseconds` | `ushort` | No | Total server-side time. |

## Example

```csharp
async Task HandleAsync(INnrpMessageTransport transport, CancellationToken ct)
{
    var session = new NnrpServerSession(new ServerProfile { MaxConcurrentFrames = 4 }, transport);
    var failure = await session.AcceptAsync(ct);
    if (failure.IsFailure)
    {
        return;
    }

    try
    {
        while (true)
        {
            var submit = await session.ReceiveSubmitAsync(ct);
            var output = await RunInferenceAsync(submit, ct);
            await session.SendResultAsync(output, ct);
        }
    }
    finally
    {
        await session.CloseAsync("server shutdown", 0, ct);
    }
}
```

## Common Pitfalls

::: warning
1. Every received frame needs `SendResultAsync` or `SendResultDropAsync`.
2. Do not block the I/O loop while running inference; move CPU/GPU work out of the receive path.
3. `AcceptAsync` returns protocol rejection information; check it before entering the submit loop.
4. Cache helpers require a configured `NnrpCacheStore`.
:::
