# C# — Protocol Types

Core protocol types in `Nnrp.Core` implement packet serialization, handshake state machines, and cache management.

## Import

```csharp
using Nnrp.Core;
```

---

## `NnrpHeader`

Fixed 40-byte packet header (`readonly struct`, `IEquatable<NnrpHeader>`).

### Static Properties

| Property | Type | Description |
|---|---|---|
| `NnrpHeader.Magic` | `ReadOnlyMemory<byte>` | Fixed magic prefix `b"NNRP"` |
| `NnrpHeader.HeaderLength` | `int` | Fixed header byte length (`40`) |
| `NnrpHeader.TotalLength` | `int` | Alias for `HeaderLength` |

### Properties

| Property | Type | Description |
|---|---|---|
| `WireFormat` | `WireFormat` | Wire format version |
| `MsgType` | `MessageType` | Message type |
| `Flags` | `HeaderFlags` | Header flags |
| `MetaLen` | `int` | Metadata byte count |
| `BodyLen` | `int` | Body byte count |
| `SessionId` | `uint` | Session ID |
| `FrameId` | `uint` | Frame ID |
| `ViewId` | `uint` | View ID |
| `RouteId` | `ushort` | Route ID |
| `TraceId` | `ushort` | Trace ID |

### Methods

```csharp
public static bool TryParse(ReadOnlySpan<byte> buffer, out NnrpHeader header);
public void WriteTo(Span<byte> destination);
```

---

## `NnrpFramedMessage`

Complete framed message (header + metadata bytes + body bytes) (`readonly struct`).

| Property | Type | Description |
|---|---|---|
| `Header` | `NnrpHeader` | Packet header |
| `MetadataBytes` | `ReadOnlyMemory<byte>` | Raw metadata bytes |
| `BodyBytes` | `ReadOnlyMemory<byte>` | Raw body bytes |

```csharp
public static NnrpFramedMessage Create(NnrpHeader header, ReadOnlyMemory<byte> metadata, ReadOnlyMemory<byte> body);
public byte[] ToByteArray();
```

---

## `NnrpProtocolFailure`

Represents a protocol-level failure (`readonly struct`).

| Property | Type | Description |
|---|---|---|
| `ErrorCode` | `ErrorCode` | Error code |
| `ErrorScope` | `ErrorScope` | Error scope |
| `SessionId` | `uint` | Related session ID |
| `FrameId` | `uint` | Related frame ID |

```csharp
public static NnrpProtocolFailure AuthFailed(uint sessionId = 0);
public static NnrpProtocolFailure InvalidState(uint sessionId, uint frameId = 0);
public static NnrpProtocolFailure MalformedMessage(uint sessionId = 0);
public static NnrpProtocolFailure UnsupportedVersion(uint sessionId = 0);
public static NnrpProtocolFailure LimitExceeded(uint sessionId, uint frameId = 0);
```

---

## `NnrpCapabilitySelection`

Negotiated session capability set (`readonly struct`).

| Property | Type | Description |
|---|---|---|
| `TransportId` | `TransportId` | Negotiated transport type |
| `LossTolerance` | `LossTolerance` | Negotiated loss tolerance |
| `EnableCache` | `bool` | Cache enabled flag |
| `MaxCacheEntries` | `int` | Negotiated max cache entries |
| `MaxCacheBytes` | `long` | Negotiated max cache bytes |
| `PayloadKindMask` | `PayloadKind` | Negotiated payload type mask |

```csharp
public static NnrpCapabilitySelection Negotiate(
    ClientHelloMessage hello, ServerHelloAckMessage ack);
```

---

## `NnrpSessionStateMachine`

Tracks the lifecycle state of a session.

### `SessionState` Enum

| Member | Description |
|---|---|
| `Initial` | Not yet connected |
| `Connecting` | Handshake in progress |
| `Active` | Active session |
| `Closing` | Graceful close in progress |
| `Closed` | Session closed |
| `Error` | Session in error state |

```csharp
public class NnrpSessionStateMachine
{
    public SessionState CurrentState { get; }
    public bool TryTransition(SessionState from, SessionState to);
    public void ForceState(SessionState state);
}
```

---

## `NnrpCacheKey`

Cache object key (`readonly struct`, `IEquatable<NnrpCacheKey>`).

| Property | Type | Description |
|---|---|---|
| `Kind` | `CacheObjectKind` | Object type |
| `Id` | `ulong` | Object ID |

```csharp
public static NnrpCacheKey For(CacheObjectKind kind, ulong id);
```

---

## `NnrpCacheStore`

Thread-safe LRU cache store (`sealed class`).

```csharp
public NnrpCacheStore(int maxEntries, long maxBytes);

public bool TryGet(NnrpCacheKey key, out ReadOnlyMemory<byte> data);
public bool Put(NnrpCacheKey key, ReadOnlyMemory<byte> data, CachePutFlags flags = CachePutFlags.None);
public int Invalidate(NnrpCacheKey key);
public int InvalidateByKind(CacheObjectKind kind);
public int InvalidateAll();

public int Count { get; }
public long BytesUsed { get; }
```

---

## Typical Use Cases

### Cache Pre-warming and Reuse

```csharp
// Upload a static background tile to the server cache
var key = new NnrpCacheKey { KindId = CacheObjectKind.BackgroundTile, ObjectId = bgHash };
await session.PutCacheAsync(key, bgTensorData, CachePutFlags.Persistent);

// Subsequent frames reference the cache to reduce bandwidth
var req = new NnrpSubmitRequest
{
    FrameId      = frameId,
    InputProfile = InputProfile.ChangedTilesLuma,
    SubmitMode   = SubmitMode.Reference,   // reference server cache, skip re-transmission
    BudgetPolicy = BudgetPolicy.AllowPartial,
    CacheRefs    = new[] { key },
    Sections     = new[] { deltaSection }, // only transmit the delta
};
```

### Low-Level Header Construction (debugging / adapters)

```csharp
var header = new NnrpPacketHeader
{
    MessageType = MessageType.FrameSubmit,
    SessionId   = sessionId,
    PayloadSize = payload.Length,
    Flags       = HeaderFlags.None,
};
buffer.Write(header.Serialize());
buffer.Write(payload);
```

---

## Common Pitfalls

::: warning
1. **`NnrpCacheStore` is client-local, not server-side cache.** You must call `PutCacheAsync()` first to push data to the server before using `SubmitMode.Reference`.

2. **`SubmitMode.Reference` requires a server cache hit.** If the server evicts the entry, the submit returns `ErrorCode.CacheMiss` — fall back to `SubmitMode.Inline`.

3. **`NnrpPacketHeader.PayloadSize` is in bytes**, not section count or tile count.

4. **`NnrpCacheStore` evicts on whichever limit is hit first** — `maxEntries` or `maxBytes`. Increase `maxBytes` for large tensors.
:::
