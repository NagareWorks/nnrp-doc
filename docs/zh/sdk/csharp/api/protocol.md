# C# — 协议类型

低层协议类型定义在 `Nnrp.Core` 命名空间中。

## 导入

```csharp
using Nnrp.Core;
```

---

## `NnrpHeader`

固定 40 字节包头（`readonly struct`）。

### 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `WireFormat` | `WireFormat` | 线路格式（当前固定 `Current`） |
| `VersionMajor` | `byte` | 协议主版本 |
| `MsgType` | `MessageType` | 消息类型 |
| `Flags` | `HeaderFlags` | 包头标志 |
| `MetaLen` | `uint` | 元数据字节数 |
| `BodyLen` | `uint` | 包体字节数 |
| `SessionId` | `uint` | 会话 ID |
| `FrameId` | `uint` | 帧 ID |
| `ViewId` | `uint` | 视角 ID |
| `RouteId` | `ushort` | 路由 ID |
| `TraceId` | `ushort` | 追踪 ID |

### 方法

```csharp
// 从字节 Span 解析（不分配堆内存）
public static bool TryParse(ReadOnlySpan<byte> span, out NnrpHeader header);

// 将包头写入 Span
public void WriteTo(Span<byte> destination);

// 计算完整包总长度
public int TotalLength => HeaderLength + (int)MetaLen + (int)BodyLen;

public const int HeaderLength = 40;
public static ReadOnlySpan<byte> Magic => "NNRP"u8;
```

---

## `NnrpFramedMessage`

包头 + 元数据 + 包体的完整消息容器（`readonly struct`）。

```csharp
public readonly struct NnrpFramedMessage
{
    public NnrpHeader Header { get; }
    public ReadOnlyMemory<byte> Metadata { get; }
    public ReadOnlyMemory<byte> Body { get; }

    // 构造（低层使用）
    public NnrpFramedMessage(NnrpHeader header, ReadOnlyMemory<byte> metadata, ReadOnlyMemory<byte> body);
}
```

---

## `NnrpProtocolFailure`

协议级失败描述（`readonly struct`），用于需要向对端发送 ERROR 消息的场景。

```csharp
public readonly struct NnrpProtocolFailure
{
    public ErrorCode Code { get; }
    public ErrorScope Scope { get; }
    public string? Message { get; }

    // 工厂方法
    public static NnrpProtocolFailure MalformedHeader(string? message = null);
    public static NnrpProtocolFailure MalformedBody(string? message = null);
    public static NnrpProtocolFailure AuthFailed(string? message = null);
    public static NnrpProtocolFailure UnsupportedCapability(string? message = null);
    public static NnrpProtocolFailure InvalidState(string? message = null);
    public static NnrpProtocolFailure LimitExceeded(string? message = null);
    public static NnrpProtocolFailure InternalError(string? message = null);
}
```

---

## `NnrpCapabilitySelection`

握手完成后双方协商一致的能力集（`readonly struct`）。

```csharp
public readonly struct NnrpCapabilitySelection
{
    public TransportId SelectedTransport { get; }
    public LossTolerance LossTolerance { get; }
    public PayloadKind SupportedPayloads { get; }
    public bool CacheEnabled { get; }
    public uint MaxCacheEntries { get; }
    public uint MaxCacheBytes { get; }
}
```

---

## `NnrpSessionStateMachine`

会话状态机，跟踪当前握手/操作状态（类），仅服务端内部使用。

```csharp
public class NnrpSessionStateMachine
{
    public SessionState State { get; }

    public NnrpProtocolFailure? TryTransition(MessageType incoming);
    public void Reset();
}

public enum SessionState
{
    AwaitingHello,
    Active,
    Migrating,
    Closed,
    Faulted,
}
```

---

## `NnrpCacheKey`

缓存对象键（`readonly struct`，值类型相等语义）。

```csharp
public readonly struct NnrpCacheKey : IEquatable<NnrpCacheKey>
{
    public CacheObjectKind Kind { get; }
    public uint Key { get; }
    public uint NamespaceId { get; }

    public NnrpCacheKey(CacheObjectKind kind, uint key, uint namespaceId = 0);
}
```

---

## `NnrpCacheStore`

客户端本地缓存存储（类），管理已上传的缓存对象生命周期。

```csharp
public sealed class NnrpCacheStore
{
    public NnrpCacheStore(int maxEntries = 256, long maxBytes = 8 * 1024 * 1024);

    public bool TryGet(NnrpCacheKey key, out ReadOnlyMemory<byte> data);
    public void Put(NnrpCacheKey key, ReadOnlyMemory<byte> data, CachePutFlags flags = CachePutFlags.None);
    public void Invalidate(NnrpCacheKey key);
    public void InvalidateAll();

    public int Count { get; }
    public long BytesUsed { get; }
}
```

---

## 典型使用场景

### 缓存预热与复用

```csharp
// 上传静态背景层到服务端缓存
var key = new NnrpCacheKey { KindId = CacheObjectKind.BackgroundTile, ObjectId = bgHash };
await session.PutCacheAsync(key, bgTensorData, CachePutFlags.Persistent);

// 后续帧直接引用缓存，减少带宽
var req = new NnrpSubmitRequest
{
    FrameId      = frameId,
    InputProfile = InputProfile.ChangedTilesLuma,
    SubmitMode   = SubmitMode.Reference,   // 引用缓存，不重复传输
    BudgetPolicy = BudgetPolicy.AllowPartial,
    CacheRefs    = new[] { key },
    Sections     = new[] { deltaSection }, // 只传变化量
};
```

### 低层包头构造与验证

```csharp
// 手动构造包头（调试/适配场景）
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

## 常见坑点

::: warning
1. **`NnrpCacheStore` 是本地客户端缓存，不等于服务端缓存。** 向服务端引用缓存对象前，必须先调用 `PutCacheAsync()` 将数据上传到服务端；仅更新本地 `CacheStore` 不会同步服务端。

2. **`SubmitMode.Reference` 依赖服务端缓存命中。** 若服务端因重启或淘汰策略清空了缓存，引用提交会返回 `ErrorCode.CacheMiss`，客户端须降级为 `SubmitMode.Inline`。

3. **`NnrpPacketHeader.PayloadSize` 单位是字节。** 不要传入 Section 数量或 Tile 数量。

4. **`NnrpCacheStore(maxEntries, maxBytes)` 两个限制取其先。** 默认 256 条 / 8 MiB；对大 Tensor 场景适当增大 `maxBytes`。
:::
