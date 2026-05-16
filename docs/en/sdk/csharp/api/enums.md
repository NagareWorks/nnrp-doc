# C# — Enums & Constants

Enums are defined in the `Nnrp.Core` namespace and shared across all other namespaces.

## Import

```csharp
using Nnrp.Core;
```

---

## Wire Format

### `WireFormat`

| Member | Value | Description |
|---|---|---|
| `Current` | `0` | Only supported wire format (NNRP/1) |

---

## Message Types

### `MessageType`

| Member | Value | Direction | Description |
|---|---|---|---|
| `ClientHello` | `0x01` | C→S | Connection setup |
| `ServerHelloAck` | `0x02` | S→C | Handshake acknowledgement |
| `SessionPatch` | `0x03` | C→S | Session parameter update request |
| `SessionPatchAck` | `0x04` | S→C | Session parameter update result |
| `Close` | `0x05` | Both | Graceful close |
| `Error` | `0x06` | Both | Protocol error notification |
| `FrameSubmit` | `0x10` | C→S | Submit a frame |
| `FrameCancel` | `0x11` | C→S | Cancel a frame |
| `ResultPush` | `0x12` | S→C | Push inference result |
| `ResultDrop` | `0x13` | S→C | Notify result dropped |
| `CachePut` | `0x14` | C→S | Store a cache object |
| `CacheAck` | `0x15` | S→C | Cache store result |
| `CacheInvalidate` | `0x16` | C→S | Invalidate cache |
| `FlowUpdate` | `0x17` | Both | Flow control window update |
| `ResultHint` | `0x18` | S→C | Server hint |
| `TransportProbe` | `0x19` | Both | Transport path probe |
| `TransportProbeAck` | `0x1A` | Both | Path probe acknowledgement |
| `SessionMigrate` | `0x1B` | S→C | Session migration notification |
| `SessionMigrateAck` | `0x1C` | C→S | Session migration confirmation |
| `Ping` | `0x20` | Both | Keep-alive probe |
| `Pong` | `0x21` | Both | Keep-alive response |

---

## Header Flags

### `HeaderFlags` (`[Flags]`)

| Member | Mask | Description |
|---|---|---|
| `None` | `0x00` | No flags |
| `AckRequired` | `0x01` | Receiver must acknowledge |
| `CanDrop` | `0x02` | May be dropped under backpressure |
| `Stale` | `0x04` | Data is stale |
| `Eos` | `0x08` | End of stream |
| `Retransmit` | `0x10` | Retransmitted packet |
| `Keyframe` | `0x20` | Keyframe |

---

## Frame Classification

### `FrameClass`

| Member | Value | Description |
|---|---|---|
| `Keyframe` | `0` | Complete keyframe |
| `Delta` | `1` | Delta frame |
| `Retransmit` | `2` | Retransmit frame |
| `Discardable` | `3` | May be skipped |

---

## Error Codes

### `ErrorCode`

| Member | Value | Description |
|---|---|---|
| `UnsupportedVersion` | `0x0001` | Unsupported protocol version |
| `AuthFailed` | `0x0002` | Authentication failed |
| `InvalidState` | `0x0003` | Operation not allowed in current state |
| `MalformedHeader` | `0x0004` | Malformed header |
| `MalformedBody` | `0x0005` | Malformed body |
| `UnsupportedCapability` | `0x0006` | Unsupported capability |
| `LimitExceeded` | `0x0007` | Limit exceeded |
| `FrameExpired` | `0x0008` | Frame expired |
| `FrameCancelled` | `0x0009` | Frame cancelled by client |
| `CacheMiss` | `0x000A` | Cache object not found |
| `ServerBusy` | `0x000B` | Server temporarily unable to process |
| `InternalError` | `0x000C` | Server internal error |

---

## Transport & Connection

### `TransportId`

| Member | Value | Description |
|---|---|---|
| `Unspecified` | `0` | Unspecified |
| `Quic` | `1` | QUIC transport |
| `Tcp` | `2` | TCP transport |

### `TransportPolicy`

| Member | Value | Description |
|---|---|---|
| `Auto` | `0` | Automatic selection |
| `PreferQuic` | `1` | Prefer QUIC |
| `PreferTcp` | `2` | Prefer TCP |
| `ForceQuic` | `3` | Force QUIC |
| `ForceTcp` | `4` | Force TCP |

### `LossTolerance`

| Member | Value | Description |
|---|---|---|
| `Strict` | `0` | No packet loss allowed |
| `BestEffort` | `1` | Best effort |
| `LowLatency` | `2` | Low latency preferred, minor loss tolerated |
| `FireAndForget` | `3` | High loss tolerance |

---

## Data-plane Enums

### `InputProfile`

| Member | Value | Description |
|---|---|---|
| `Unspecified` | `0` | Unspecified |
| `ChangedTilesLuma` | `1` | Luma data for changed tiles only |
| `DenseLumaFrame` | `2` | Full-frame luma data |

### `TileIndexMode`

| Member | Value | Description |
|---|---|---|
| `DenseRange` | `0` | Dense contiguous range |
| `RawU16` | `1` | Raw uint16 list |
| `DeltaU16` | `2` | Delta-encoded uint16 |
| `Bitset` | `3` | Bitset encoding |

### `DTypeId`

| Member | Value | Description |
|---|---|---|
| `Fp16` | `0` | Half-precision float |
| `Fp32` | `1` | Single-precision float |
| `Fp8E4M3` | `2` | FP8 E4M3 |
| `Fp8E5M2` | `3` | FP8 E5M2 |
| `Int8` | `4` | Signed 8-bit integer |
| `Uint8` | `5` | Unsigned 8-bit integer |
| `Int16` | `6` | Signed 16-bit integer |
| `Uint16` | `7` | Unsigned 16-bit integer |

### `SubmitMode`

| Member | Value | Description |
|---|---|---|
| `Inline` | `0` | All objects inlined in body |
| `Reference` | `1` | Objects referenced via cache keys |
| `Mixed` | `2` | Mix of inline and reference |

### `BudgetPolicy` (`[Flags]`)

| Member | Mask | Description |
|---|---|---|
| `None` | `0x00` | Strict; no degradation |
| `AllowPartial` | `0x01` | Allow partial results |
| `AllowStaleReuse` | `0x02` | Allow stale cache reuse |
| `AllowDegraded` | `0x04` | Allow quality degradation |
| `AllowDrop` | `0x08` | Allow dropping the frame |

### `ResultClass`

| Member | Value | Description |
|---|---|---|
| `Complete` | `0` | Complete result |
| `Partial` | `1` | Partial result |
| `StaleReuse` | `2` | Reused stale cached result |
| `Degraded` | `3` | Quality-degraded result |

### `ResultFlags` (`[Flags]`)

| Member | Mask | Description |
|---|---|---|
| `None` | `0x0000` | No flags |
| `Stale` | `0x0001` | Stale result |
| `Fallback` | `0x0002` | Fallback path used |
| `Partial` | `0x0004` | Incomplete result |

---

## Cache Enums

### `CacheObjectKind`

| Member | Value | Description |
|---|---|---|
| `CameraBlock` | `0x0001` | Camera parameter block |
| `TileIndexBlock` | `0x0002` | Tile index block |
| `TensorSectionTable` | `0x0003` | Tensor section table |
| `CodecTable` | `0x0004` | Codec auxiliary table |
| `ReusableResultObject` | `0x0005` | Reusable result |
| `PayloadLayoutTemplate` | `0x0006` | Payload layout template |
| `PromptSegment` | `0x0007` | Prompt segment (LLM) |
| `ToolSchema` | `0x0008` | Tool schema |
| `StructuredEventSchema` | `0x0009` | Structured event schema |

### `CacheAckStatus`

| Member | Value | Description |
|---|---|---|
| `Stored` | `0` | Successfully stored |
| `Rejected` | `1` | Rejected (capacity or policy) |
| `Duplicate` | `2` | Duplicate (already exists) |

### `CacheInvalidateScope`

| Member | Value | Description |
|---|---|---|
| `Single` | `0` | Single object by key |
| `ByKind` | `1` | All objects of specified kind |
| `All` | `2` | All objects in session |

### `CachePutFlags` (`[Flags]`)

| Member | Mask | Description |
|---|---|---|
| `None` | `0x00` | Default |
| `Pinned` | `0x01` | Pinned; exempt from LRU eviction |
| `Reusable` | `0x02` | Cross-frame reusable |

---

## Session Patch Enums

### `SessionPatchField` (`[Flags]`)

| Member | Mask | Description |
|---|---|---|
| `TargetCadence` | `0x0001` | Target frame rate |
| `QualityTier` | `0x0002` | Quality tier |
| `ActiveLaneMask` | `0x0004` | Active view mask |
| `PreferredCodec` | `0x0008` | Preferred codec |
| `PreferredCompression` | `0x0010` | Preferred compression level |

### `SessionPatchAckStatus`

| Member | Value | Description |
|---|---|---|
| `Applied` | `0` | Patch applied successfully |
| `PartiallyApplied` | `1` | Partially applied |
| `Rejected` | `2` | Patch rejected |

### `SessionPatchRejectReason`

| Member | Value | Description |
|---|---|---|
| `None` | `0` | No rejection |
| `InvalidValue` | `1` | Invalid value |
| `UnsupportedField` | `2` | Unsupported field |
| `StateConflict` | `3` | Conflicts with current state |

---

## Flow Control Enums

### `FlowUpdateScopeKind`

| Member | Value | Description |
|---|---|---|
| `Connection` | `0` | Connection level |
| `Session` | `1` | Session level |
| `Operation` | `2` | Operation level |

### `FlowUpdateReason`

| Member | Value | Description |
|---|---|---|
| `Grant` | `0` | Grant more credit |
| `Reduce` | `1` | Reduce credit |
| `Pause` | `2` | Pause |
| `Resume` | `3` | Resume |
| `Congestion` | `4` | Congestion notification |

### `FlowUpdateBackpressureLevel`

| Member | Value | Description |
|---|---|---|
| `None` | `0` | No backpressure |
| `Soft` | `1` | Soft (advisory) |
| `Hard` | `2` | Hard (mandatory) |

### `FlowUpdateFlags` (`[Flags]`)

| Member | Mask | Description |
|---|---|---|
| `None` | `0x00` | None |
| `CreditValid` | `0x01` | Credit field is valid |
| `RetryAfterValid` | `0x02` | `RetryAfterMs` is valid |
| `BackgroundOnly` | `0x04` | Applies only to background ops |
| `DrainInFlightOnly` | `0x08` | Takes effect after in-flight ops drain |

---

## Use-Case Guide

### Connecting and Negotiating Transport

```csharp
var profile = new NnrpClientProfile
{
    TransportPolicy = TransportPolicy.PreferQuic,
    LossTolerance   = LossTolerance.LowLatency,
};
```

::: warning Pitfalls
- `ForceQuic` hard-fails in TCP-only firewalls. Use `PreferQuic` in production.
- `LossTolerance.FireAndForget` does not guarantee ordering; do not use it on the main frame path.
:::

### Submitting Frames with Budget Policy

```csharp
var req = new NnrpSubmitRequest
{
    FrameId           = frameId,
    TileIds           = changedTiles,
    Sections          = new[] { tensorSection },
    InputProfile      = InputProfile.ChangedTilesLuma,
    SubmitMode        = SubmitMode.Inline,
    BudgetPolicy      = BudgetPolicy.AllowPartial | BudgetPolicy.AllowStaleReuse,
    InferenceBudgetMs = 8,
};
```

::: warning Pitfalls
- `BudgetPolicy` is a bitmask. Combine values with `|`.
- `SubmitMode.Reference` requires a prior `PutCacheAsync()` call.
:::

### Result Handling

```csharp
switch (result.ResultClass)
{
    case ResultClass.Complete:   ApplyFull(result);   break;
    case ResultClass.Partial:    ApplyPartial(result); break;
    case ResultClass.StaleReuse: break;
    case ResultClass.Degraded:
        Log.Warn("Degraded: {0}", result.AppliedBudgetPolicy);
        break;
}
```

### Error Handling

```csharp
catch (NnrpProtocolException ex)
{
    if (ex.ErrorScope == ErrorScope.Connection)
    {
        await session.DisposeAsync();
        session = await client.OpenSessionAsync();
    }
    else if (ex.ErrorCode == ErrorCode.FrameExpired)
    {
        // Frame-level; skip and continue
    }
}
```

::: warning Pitfalls
- `ErrorScope.Connection` errors are fatal. Do not retry on the same session.
:::
