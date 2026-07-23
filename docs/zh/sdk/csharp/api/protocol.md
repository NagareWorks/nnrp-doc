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

## 缓存对象身份

Preview 4 只使用 [`NnrpCacheObjectId`](./runtime.md#本地缓存租约状态) 表示托管侧缓存身份。它包含协议定义的
`CacheNamespace`、两个 64 位 cache-key word 和 `ObjectKind`。`CachePutMetadata`、
`CacheAckMetadata`、`CacheInvalidateMetadata` 使用完全相同的字段；SDK 不再定义另一套更窄的缓存键。

---

## `NnrpCacheStore`

线程安全的服务端本地缓存实现（`sealed class`），由 `NnrpServerSession` 使用。它不是客户端上传队列，
也不能代表远端一定命中缓存。

```csharp
public sealed class NnrpCacheStore
{
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
}
```

---

## 典型使用场景

### 服务端缓存处理

```csharp
var cache = new NnrpCacheStore(maxEntries: 512, maxObjectBytes: 64 * 1024 * 1024);
var session = new NnrpServerSession(profile, transport, cacheStore: cache);
```

`NnrpServerSession` 校验 `CachePutMetadata`，按规范的 `NnrpCacheObjectId` 存储对象，并发送
`CacheAckMetadata`。引用与失效操作使用同样的身份字段宽度，应用不需要转换到更窄的本地 key。

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
1. **`NnrpCacheStore` 是服务端本地状态。** 客户端不能根据自身状态推断命中；必须处理 `CacheAck`、`CacheMiss`、租约和失效消息。

2. **缓存身份不可截断。** `CacheNamespace` 为 32 位，两个 cache-key word 均为 64 位。

3. **`NnrpPacketHeader.PayloadSize` 单位是字节。** 不要传入 Section 数量或 Tile 数量。

4. **存储限制彼此独立。** `MaxEntries` 限制条目数，`MaxObjectBytes` 限制单个对象大小；二者都不是总字节配额。
:::
