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

## Cache Object Identity

Preview 4 uses [`NnrpCacheObjectId`](./runtime.md#local-cache-lease-state) as the only managed cache
identity. It contains the protocol `CacheNamespace`, two 64-bit cache-key words, and `ObjectKind`.
Cache messages expose the same fields through `CachePutMetadata`, `CacheAckMetadata`, and
`CacheInvalidateMetadata`; the SDK does not define a second, narrower cache-key type.

---

## `NnrpCacheStore`

Thread-safe server-local cache store (`sealed class`). It is an application-side implementation used
by `NnrpServerSession`; it is not a client upload queue and it does not imply a remote cache hit.

```csharp
public NnrpCacheStore(int maxEntries = 256, long maxObjectBytes = 16 * 1024 * 1024);

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
```

---

## Typical Use Cases

### Server Cache Handling

```csharp
var cache = new NnrpCacheStore(maxEntries: 512, maxObjectBytes: 64 * 1024 * 1024);
var session = new NnrpServerSession(profile, transport, cacheStore: cache);
```

`NnrpServerSession` validates `CachePutMetadata`, stores the object under its canonical
`NnrpCacheObjectId`, and emits `CacheAckMetadata`. References and invalidations use the same identity
widths; applications do not translate them through a smaller local key.

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
1. **`NnrpCacheStore` is server-local state.** A client must not infer a hit from its own state; honor `CacheAck`, `CacheMiss`, lease, and invalidation messages.

2. **Cache identities are not truncated.** `CacheNamespace` is 32-bit and each cache-key word is 64-bit.

3. **`NnrpPacketHeader.PayloadSize` is in bytes**, not section count or tile count.

4. **Store limits are independent.** `MaxEntries` limits entry count and `MaxObjectBytes` limits one object; neither is a total-byte quota.
:::
