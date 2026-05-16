# C# — 消息类型

所有消息类定义在 `Nnrp.Core` 命名空间中。每类消息提供从 `NnrpFramedMessage` 解析的静态 `Parse` 方法，以及序列化为 `NnrpFramedMessage` 的 `ToFramedMessage()` 方法。

## 导入

```csharp
using Nnrp.Core;
using Nnrp.Core.Messages;
```

---

## 控制消息

### `ClientHelloMessage`

```csharp
public sealed class ClientHelloMessage
{
    public uint SessionId { get; init; }
    public byte MaxViews { get; init; }
    public bool EnableCache { get; init; }
    public PayloadKind PayloadKindMask { get; init; }
    public ReadOnlyMemory<byte> AuthBlock { get; init; }
    public IReadOnlyList<ControlExtensionEntry> Extensions { get; init; }

    public static ClientHelloMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage();
}
```

### `ServerHelloAckMessage`

```csharp
public sealed class ServerHelloAckMessage
{
    public uint SessionId { get; init; }
    public TransportId TransportId { get; init; }
    public bool EnableCache { get; init; }
    public uint MaxCacheEntries { get; init; }
    public uint MaxCacheBytes { get; init; }
    public PayloadKind PayloadKindMask { get; init; }
    public IReadOnlyList<ControlExtensionEntry> Extensions { get; init; }

    public static ServerHelloAckMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage();
}
```

### `SessionPatchMessage`

```csharp
public sealed class SessionPatchMessage
{
    public SessionPatchField PatchFields { get; init; }
    public uint TargetCadence { get; init; }
    public byte QualityTier { get; init; }
    public byte ActiveLaneMask { get; init; }
    public byte PreferredCodec { get; init; }
    public byte PreferredCompression { get; init; }

    public static SessionPatchMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage(uint sessionId);
}
```

### `SessionPatchAckMessage`

```csharp
public sealed class SessionPatchAckMessage
{
    public SessionPatchField AppliedFields { get; init; }
    public SessionPatchAckStatus Status { get; init; }
    public SessionPatchRejectReason RejectReason { get; init; }

    public static SessionPatchAckMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage(uint sessionId);
}
```

### `CloseMessage`

```csharp
public sealed class CloseMessage
{
    public uint SessionId { get; init; }

    public static CloseMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage();
}
```

### `ErrorMessage`

```csharp
public sealed class ErrorMessage
{
    public ErrorCode Code { get; init; }
    public ErrorScope Scope { get; init; }
    public uint SessionId { get; init; }
    public uint FrameId { get; init; }
    public string? Description { get; init; }

    public static ErrorMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage();
}
```

---

## 数据消息

### `FrameSubmitMessage`

```csharp
public sealed class FrameSubmitMessage
{
    public uint SessionId { get; init; }
    public uint FrameId { get; init; }
    public InputProfile InputProfile { get; init; }
    public SubmitMode SubmitMode { get; init; }
    public BudgetPolicy BudgetPolicy { get; init; }
    public PayloadKind PayloadKindBitmap { get; init; }
    public ushort TileCount { get; init; }
    public byte SectionCount { get; init; }
    public uint InferenceBudgetMs { get; init; }
    public uint DeadlineMs { get; init; }
    public ReadOnlyMemory<byte> Body { get; init; }

    public static FrameSubmitMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage();
}
```

### `FrameCancelMessage`

```csharp
public sealed class FrameCancelMessage
{
    public uint SessionId { get; init; }
    public uint FrameId { get; init; }

    public static FrameCancelMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage();
}
```

### `ResultPushMessage`

```csharp
public sealed class ResultPushMessage
{
    public uint SessionId { get; init; }
    public uint FrameId { get; init; }
    public ResultClass ResultClass { get; init; }
    public ResultFlags ResultFlags { get; init; }
    public BudgetPolicy AppliedBudgetPolicy { get; init; }
    public byte ActiveProfileId { get; init; }
    public uint InferenceMs { get; init; }
    public uint QueueMs { get; init; }
    public uint ServerTotalMs { get; init; }
    public ushort StatusCode { get; init; }
    public TileIndexMode TileIndexMode { get; init; }
    public ushort TileBaseId { get; init; }
    public ushort CoveredTileCount { get; init; }
    public ushort DroppedTileCount { get; init; }
    public uint ReusedFrameId { get; init; }
    public PayloadKind PayloadKindBitmap { get; init; }
    public uint PayloadFrameCount { get; init; }
    public ReadOnlyMemory<byte> Body { get; init; }

    public static ResultPushMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage();
}
```

### `ResultDropMessage`

```csharp
public sealed class ResultDropMessage
{
    public uint SessionId { get; init; }
    public uint FrameId { get; init; }
    public ResultClass ResultClass { get; init; }

    public static ResultDropMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage();
}
```

---

## 缓存消息

### `CachePutMessage`

```csharp
public sealed class CachePutMessage
{
    public CacheObjectKind ObjectKind { get; init; }
    public uint ObjectKey { get; init; }
    public uint NamespaceId { get; init; }
    public CachePutFlags Flags { get; init; }
    public ReadOnlyMemory<byte> Data { get; init; }

    public static CachePutMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage(uint sessionId);
}
```

### `CacheAckMessage`

```csharp
public sealed class CacheAckMessage
{
    public CacheObjectKind ObjectKind { get; init; }
    public uint ObjectKey { get; init; }
    public CacheAckStatus Status { get; init; }

    public static CacheAckMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage(uint sessionId);
}
```

### `CacheInvalidateMessage`

```csharp
public sealed class CacheInvalidateMessage
{
    public CacheInvalidateScope Scope { get; init; }
    public CacheObjectKind ObjectKind { get; init; }
    public uint NamespaceId { get; init; }
    public uint ObjectKey { get; init; }

    public static CacheInvalidateMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage(uint sessionId);
}
```

---

## 流控与提示消息

### `FlowUpdateMessage`

```csharp
public sealed class FlowUpdateMessage
{
    public FlowUpdateScopeKind ScopeKind { get; init; }
    public FlowUpdateReason Reason { get; init; }
    public FlowUpdateBackpressureLevel BackpressureLevel { get; init; }
    public int ConnectionCredit { get; init; }
    public int SessionCredit { get; init; }
    public int OperationCredit { get; init; }
    public uint OperationId { get; init; }
    public uint RetryAfterMs { get; init; }
    public uint CreditEpoch { get; init; }
    public FlowUpdateFlags Flags { get; init; }

    public static FlowUpdateMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage(uint sessionId);
}
```

### `ResultHintMessage`

```csharp
public sealed class ResultHintMessage
{
    public ResultHintBudgetPolicy BudgetPolicy { get; init; }
    public ResultHintCongestionState CongestionState { get; init; }
    public ResultHintReason Reason { get; init; }
    public uint FrameId { get; init; }
    public uint QueueDepth { get; init; }
    public uint EstimatedWaitMs { get; init; }

    public static ResultHintMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage(uint sessionId);
}
```

---

## 传输探测消息

### `TransportProbeMessage` / `TransportProbeAckMessage`

```csharp
public sealed class TransportProbeMessage
{
    public uint ProbeId { get; init; }
    public TransportId TransportId { get; init; }
    public ulong SendTimestampUs { get; init; }

    public static TransportProbeMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage(uint sessionId);
}

public sealed class TransportProbeAckMessage
{
    public uint ProbeId { get; init; }
    public TransportId TransportId { get; init; }
    public ulong SendTimestampUs { get; init; }
    public ulong RecvTimestampUs { get; init; }

    public static TransportProbeAckMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage(uint sessionId);
}
```

---

## 会话迁移消息

### `SessionMigrateMessage` / `SessionMigrateAckMessage`

```csharp
public sealed class SessionMigrateMessage
{
    public uint SessionId { get; init; }
    public uint TargetSessionId { get; init; }
    public ReadOnlyMemory<byte> MigrationToken { get; init; }

    public static SessionMigrateMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage();
}

public sealed class SessionMigrateAckMessage
{
    public uint SessionId { get; init; }
    public uint TargetSessionId { get; init; }

    public static SessionMigrateAckMessage Parse(NnrpFramedMessage msg);
    public NnrpFramedMessage ToFramedMessage();
}
```

---

## 控制扩展类型

```csharp
public readonly struct ControlExtensionEntry
{
    public ushort TypeId { get; }
    public ControlExtensionFlags Flags { get; }
    public ReadOnlyMemory<byte> Payload { get; }
}

// 预定义扩展
public sealed class TransportPolicyExtension { public TransportPolicy Policy { get; } }
public sealed class LossToleranceExtension    { public LossTolerance Tolerance { get; } }
public sealed class PayloadCapabilitiesExtension { public PayloadKind SupportedKinds { get; } }
```
