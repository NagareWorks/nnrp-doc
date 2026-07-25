# C# - Protocol Types

The types on this page are the low-level transport-neutral model in `Nnrp.Core`. Application code
normally starts with [`NnrpClient`](./client) or [`NnrpServer`](./server).

```csharp
using Nnrp.Core;
```

## `NnrpHeader`

`NnrpHeader` is the immutable 40-byte common header.

| Property | Type | Meaning |
|---|---|---|
| `VersionMajor` | `byte` | NNRP protocol major version |
| `WireFormat` | `byte` | Selected wire format |
| `MessageType` | `MessageType` | Message type |
| `HeaderLengthValue` | `byte` | Encoded header length; must be `40` |
| `Flags` | `HeaderFlags` | Common header flags |
| `MetaLength` | `uint` | Metadata byte count |
| `BodyLength` | `uint` | Body byte count |
| `SessionId` | `uint` | Session identity |
| `FrameId` | `uint` | Frame identity |
| `ViewId` | `ushort` | View identity |
| `RouteId` | `ushort` | Route identity |
| `TraceId` | `ulong` | Trace identity |

```csharp
public const int HeaderLength = 40;
public const byte CurrentVersionMajor = 1;
public const byte CurrentWireFormat = 0;

public void Write(Span<byte> destination);
public bool TryWrite(Span<byte> destination, out int bytesWritten);
public byte[] ToArray();

public static bool TryParse(ReadOnlySpan<byte> source, out NnrpHeader header);
public static bool TryParse(
    ReadOnlySpan<byte> source,
    NnrpHeaderParseOptions options,
    out NnrpHeader header,
    out NnrpParseError error);
```

Use `NnrpHeaderParseOptions.Strict` for untrusted wire input. Strict parsing rejects unsupported
versions, unknown message types, reserved flags, invalid wire formats, and oversized messages.

## `NnrpFramedMessage`

`NnrpFramedMessage` is one complete transport-neutral frame. Its constructor verifies that the
header lengths match the supplied memory regions.

```csharp
public readonly struct NnrpFramedMessage
{
    public NnrpHeader Header { get; }
    public ReadOnlyMemory<byte> Metadata { get; }
    public ReadOnlyMemory<byte> Body { get; }
    public int Length { get; }

    public void CopyTo(Span<byte> destination);
    public bool TryCopyTo(Span<byte> destination, out int bytesWritten);
    public byte[] ToArray();

    public static bool TryParse(
        ReadOnlyMemory<byte> source,
        out NnrpFramedMessage message,
        out NnrpParseError error);
    public static bool TryParse(
        ReadOnlyMemory<byte> source,
        NnrpHeaderParseOptions options,
        out NnrpFramedMessage message,
        out NnrpParseError error);
}
```

## `NnrpProtocolFailure`

`NnrpProtocolFailure` preserves a typed protocol error, scope, diagnostic text, fatality, and the
original parse error when one exists.

| Property | Type |
|---|---|
| `IsFailure` | `bool` |
| `ErrorCode` | `ErrorCode` |
| `Scope` | `NnrpErrorScope` |
| `Message` | `string` |
| `IsFatal` | `bool` |
| `ParseError` | `NnrpParseError` |

```csharp
public static NnrpProtocolFailure None { get; }
public static NnrpProtocolFailure FromHeaderParseError(
    NnrpParseError parseError, string? message = null);
public static NnrpProtocolFailure FromBodyParseError(
    NnrpParseError parseError, string? message = null);
public static NnrpProtocolFailure InvalidState(
    NnrpErrorScope scope, string message, bool isFatal = false);
public static NnrpProtocolFailure UnsupportedCapability(
    string message, bool isFatal = true);
public static NnrpProtocolFailure LimitExceeded(
    NnrpErrorScope scope, string message, bool isFatal = false);
```

## `NnrpCapabilitySelection`

`NnrpCapabilitySelection` is the negotiated protocol capability set. Transport selection belongs to
the provider registry and is not stored in this value.

| Property | Type |
|---|---|
| `Codec` | `CodecId` |
| `DType` | `DTypeId` |
| `TensorLayout` | `TensorLayoutId` |
| `PayloadKindBitmap` | `uint` |
| `CacheObjectBitmap` | `uint` |
| `DegradePolicies` | `BudgetPolicy` |
| `MaxViews` | `int` |
| `EnableCache` | `bool` |
| `MaxCacheEntries` | `int` |
| `MaxConcurrentFrames` | `int` |
| `MaxBodyBytes` | `int` |
| `MaxSectionCount` | `int` |
| `MaxTileCount` | `int` |
| `TokenTtlSeconds` | `int` |
| `AllowSessionRenewal` | `bool` |

## `NnrpSessionStateMachine`

The state machine enforces connection/session ordering for low-level hosts.

### `NnrpSessionState`

| Value | Meaning |
|---|---|
| `Init` | No negotiation has started |
| `Negotiating` | Handshake is in progress |
| `Active` | Submissions may be accepted |
| `Draining` | Existing work is draining; new submissions are rejected |
| `Closed` | Terminal state |

```csharp
public sealed class NnrpSessionStateMachine
{
    public NnrpSessionState State { get; }
    public NnrpProtocolFailure LastFailure { get; }

    public bool TryBeginNegotiation(out NnrpProtocolFailure failure);
    public bool TryActivate(out NnrpProtocolFailure failure);
    public bool TryFailNegotiation(
        NnrpProtocolFailure reason,
        out NnrpProtocolFailure failure);
    public bool TryBeginDraining(out NnrpProtocolFailure failure);
    public bool TryClose(out NnrpProtocolFailure failure);
    public bool TryAcceptFrameSubmit(out NnrpProtocolFailure failure);
    public void ApplyFailure(NnrpProtocolFailure failure);
}
```

## Cache Object Identity

Preview4 uses [`NnrpCacheObjectId`](./runtime#local-cache-lease-state) as the single managed cache
identity. It contains `CacheNamespace`, two 64-bit key words, and `ObjectKind`. Cache messages,
leases, dependencies, runtime-object references, and the local cache store all use the same value;
the public API does not expose a second narrower key.

## `NnrpCacheStore`

`NnrpCacheStore` is an application-side, server-local cache. It does not imply a remote hit and it
does not replace cache-reference protocol messages.

```csharp
public sealed class NnrpCacheStore
{
    public NnrpCacheStore(
        int maxEntries = 256,
        long maxObjectBytes = 16 * 1024 * 1024);

    public NnrpCacheResult TryGet(NnrpCacheObjectId objectId);
    public NnrpCacheResult TryPut(
        NnrpCacheObjectId objectId,
        ReadOnlyMemory<byte> objectBytes,
        uint ttlMilliseconds);
    public bool TryInvalidate(NnrpCacheObjectId objectId);
    public void Clear();
    public void EvictExpired();

    public int Count { get; }
    public int MaxEntries { get; set; }
    public long MaxObjectBytes { get; set; }
}
```

::: warning
Clients must honor `CacheAck`, `CacheMiss`, lease, version, and invalidation semantics. A local
dictionary lookup is not evidence of a remote cache hit.
:::
