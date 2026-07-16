# C# — Message Types

Message types for control-plane and data-plane operations. All message classes are in `Nnrp.Core`.

## Import

```csharp
using Nnrp.Core;
```

---

## Handshake Messages

### `ClientHelloMessage`

| Property | Type | Description |
|---|---|---|
| `SessionId` | `uint` | Client-assigned session ID |
| `MaxViews` | `int` | Max concurrent views |
| `EnableCache` | `bool` | Enable server-side cache |
| `PayloadKindMask` | `PayloadKind` | Supported payload type mask |
| `AuthBlock` | `ReadOnlyMemory<byte>` | Auth block (application-defined) |
| `Extensions` | `IReadOnlyList<ControlExtensionEntry>` | Extension entries |

```csharp
public static ClientHelloMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build();
```

### `ServerHelloAckMessage`

| Property | Type | Description |
|---|---|---|
| `SessionId` | `uint` | Server-confirmed session ID |
| `TransportId` | `TransportId` | Selected transport |
| `EnableCache` | `bool` | Cache enabled |
| `MaxCacheEntries` | `int` | Max cache entries |
| `MaxCacheBytes` | `long` | Max cache bytes |
| `PayloadKindMask` | `PayloadKind` | Server supported payload types |
| `Extensions` | `IReadOnlyList<ControlExtensionEntry>` | Extension entries |

```csharp
public static ServerHelloAckMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build();
```

---

## Session Management Messages

### `SessionPatchMessage`

| Property | Type | Description |
|---|---|---|
| `PatchFields` | `SessionPatchField` | Fields to update |
| `TargetCadence` | `int` | Target frame rate |
| `QualityTier` | `int` | Quality tier |
| `ActiveLaneMask` | `uint` | Active view mask |
| `PreferredCodec` | `int` | Preferred codec ID |
| `PreferredCompression` | `int` | Preferred compression level |

```csharp
public static SessionPatchMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build(uint sessionId);
```

### `SessionPatchAckMessage`

| Property | Type | Description |
|---|---|---|
| `PatchFields` | `SessionPatchField` | Successfully applied fields |
| `Status` | `SessionPatchAckStatus` | Application result |
| `RejectReason` | `SessionPatchRejectReason` | Reject reason (valid when Status is Rejected) |

```csharp
public static SessionPatchAckMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build(uint sessionId);
```

### `CloseMessage`

```csharp
public static CloseMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build(uint sessionId, HeaderFlags flags = HeaderFlags.None);
```

### `ErrorMessage`

| Property | Type | Description |
|---|---|---|
| `ErrorCode` | `ErrorCode` | Error code |
| `ErrorScope` | `ErrorScope` | Error scope |
| `FrameId` | `uint` | Related frame ID |

```csharp
public static ErrorMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build(uint sessionId);
public static NnrpFramedMessage BuildFrom(NnrpProtocolFailure failure);
```

---

## Data-plane Messages

### `FrameSubmitMessage`

| Property | Type | Description |
|---|---|---|
| `OperationId` | `ulong` | Non-zero wire operation identity from metadata offset 40 |
| `InputProfile` | `InputProfile` | Input data format |
| `SubmitMode` | `SubmitMode` | Submission mode |
| `BudgetPolicy` | `BudgetPolicy` | Allowed degradation |
| `PayloadKindBitmap` | `PayloadKind` | Payload type bitmask |
| `TileCount` | `int` | Total tile count |
| `SectionCount` | `int` | Tensor section count |
| `InferenceBudgetMs` | `int` | Max inference budget (ms) |
| `DeadlineMs` | `long` | Absolute deadline |
| `BodyBytes` | `ReadOnlyMemory<byte>` | Raw body bytes |

```csharp
public static FrameSubmitMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build(uint sessionId, uint frameId);
```

### `FrameCancelMessage`

```csharp
public static FrameCancelMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build(uint sessionId, uint frameId);
```

### `ResultPushMessage`

| Property | Type | Description |
|---|---|---|
| `ResultClass` | `ResultClass` | Result completeness class |
| `ResultFlags` | `ResultFlags` | Result flags |
| `AppliedBudgetPolicy` | `BudgetPolicy` | Applied degradation policy |
| `ActiveProfileId` | `int` | Inference profile ID used |
| `InferenceMs` | `int` | Inference time (ms) |
| `QueueMs` | `int` | Queue wait time (ms) |
| `ServerTotalMs` | `int` | Total server time (ms) |
| `StatusCode` | `int` | Status code |
| `TileIndexMode` | `TileIndexMode` | Tile index encoding |
| `CoveredTileCount` | `int` | Covered tile count |
| `DroppedTileCount` | `int` | Dropped tile count |
| `ReusedFrameId` | `uint` | Reused frame ID |
| `PayloadKindBitmap` | `PayloadKind` | Actual payload types present |
| `BodyBytes` | `ReadOnlyMemory<byte>` | Raw result body |

```csharp
public static ResultPushMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build(uint sessionId, uint frameId);
```

### `ResultDropMessage`

```csharp
public static ResultDropMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build(uint sessionId, uint frameId);
```

---

## Cache Messages

### `CachePutMessage`

| Property | Type | Description |
|---|---|---|
| `Key` | `NnrpCacheKey` | Cache object key |
| `Flags` | `CachePutFlags` | Put flags (Pinned, Reusable) |
| `ObjectBytes` | `ReadOnlyMemory<byte>` | Cache object data |

```csharp
public static CachePutMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build(uint sessionId);
```

### `CacheAckMessage`

| Property | Type | Description |
|---|---|---|
| `Key` | `NnrpCacheKey` | Cache object key |
| `Status` | `CacheAckStatus` | Store result |

```csharp
public static CacheAckMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build(uint sessionId);
```

### `CacheInvalidateMessage`

| Property | Type | Description |
|---|---|---|
| `Scope` | `CacheInvalidateScope` | Invalidation scope |
| `Key` | `NnrpCacheKey` | Target key (valid for `Single` scope) |
| `Kind` | `CacheObjectKind` | Target kind (valid for `ByKind` scope) |

```csharp
public static CacheInvalidateMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build(uint sessionId);
```

---

## Flow Control Messages

### `FlowUpdateMessage`

| Property | Type | Description |
|---|---|---|
| `ScopeKind` | `FlowUpdateScopeKind` | Update scope |
| `UpdateReason` | `FlowUpdateReason` | Update reason |
| `BackpressureLevel` | `FlowUpdateBackpressureLevel` | Backpressure level |
| `ConnectionCredit` | `int` | Connection-level credit delta |
| `SessionCredit` | `int` | Session-level credit delta |
| `OperationCredit` | `int` | Operation-level credit delta |
| `OperationId` | `uint` | Target operation ID |
| `RetryAfterMs` | `int` | Suggested retry delay (ms) |
| `CreditEpoch` | `uint` | Credit epoch |
| `Flags` | `FlowUpdateFlags` | Flow update flags |

```csharp
public static FlowUpdateMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build(uint sessionId);
```

### `ResultHintMessage`

| Property | Type | Description |
|---|---|---|
| `BudgetPolicy` | `ResultHintBudgetPolicy` | Suggested budget policy |
| `CongestionState` | `ResultHintCongestionState` | Current congestion state |
| `Reason` | `ResultHintReason` | Hint reason |
| `FrameId` | `uint` | Related frame ID |
| `QueueDepth` | `int` | Current queue depth |
| `EstimatedWaitMs` | `int` | Estimated wait (ms) |

```csharp
public static ResultHintMessage Parse(NnrpFramedMessage msg);
public NnrpFramedMessage Build(uint sessionId);
```

---

## Control Extension Type

### `ControlExtensionEntry`

```csharp
public readonly struct ControlExtensionEntry
{
    public ushort TypeId { get; }
    public ControlExtensionFlags Flags { get; }
    public ReadOnlyMemory<byte> Payload { get; }
}
```

Built-in extension types: `ClientHelloTransportPolicyExtension`, `ServerHelloAckTransportPolicyExtension`, `ClientHelloLossToleranceExtension`, `ServerHelloAckLossToleranceExtension`, `ClientHelloPayloadCapabilitiesExtension`, `ServerHelloAckPayloadCapabilitiesExtension`.

---

## Typical Use Cases

### Building a FRAME_SUBMIT packet (low-level)

```csharp
var metadata = new FrameSubmitMetadata
{
    FrameId           = 42,
    InputProfile      = InputProfile.ChangedTilesLuma,
    SubmitMode        = SubmitMode.Inline,
    BudgetPolicy      = BudgetPolicy.AllowPartial,
    InferenceBudgetMs = 8,
    TileIds           = new ushort[] { 3, 7, 12 },
};
var packet = NnrpMessageBuilder.BuildFrameSubmit(
    sessionId: 42, metadata: metadata, sections: new[] { tensorSection });
await transport.SendAsync(packet.Pack());
```

### Parsing control extensions

```csharp
var entries = ControlExtensionParser.Unpack(packet.Metadata);
foreach (var entry in entries)
{
    if (entry.TypeId == NnrpExtensionTypeIds.ClientHelloTransportPolicy)
    {
        var ext = ClientHelloTransportPolicyExtension.Unpack(entry.Payload.Span);
        Console.WriteLine("Requested policy: " + ext.Policy);
    }
}
```

---

## Common Pitfalls

::: warning
1. **`Metadata` vs `Body`**: `NnrpPacket.Metadata` contains small structured fields; `NnrpPacket.Body` contains large binary payloads. Do not call Tensor unpack on `Metadata`.

2. **`TileIds` and `TilePayloads` must be index-aligned.** Mismatched order causes tile reconstruction errors.

3. **`ReadOnlyMemory<byte>` slices from a pooled packet share lifetime with the packet.** If the packet is returned to the pool before you finish reading the slice, you will read garbage data.
:::
