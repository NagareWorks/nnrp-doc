# C# - 协议类型

本页类型是 `Nnrp.Core` 提供的底层、与承载方式无关的模型。应用代码通常从
[`NnrpClient`](./client) 或 [`NnrpServer`](./server) 开始。

```csharp
using Nnrp.Core;
```

## `NnrpHeader`

`NnrpHeader` 是不可变的 40 字节公共帧头。

| 属性 | 类型 | 含义 |
|---|---|---|
| `VersionMajor` | `byte` | NNRP 协议主版本 |
| `WireFormat` | `byte` | 已选择线路格式 |
| `MessageType` | `MessageType` | 消息类型 |
| `HeaderLengthValue` | `byte` | 编码帧头长度，必须为 `40` |
| `Flags` | `HeaderFlags` | 公共帧头标志 |
| `MetaLength` | `uint` | Metadata 字节数 |
| `BodyLength` | `uint` | Body 字节数 |
| `SessionId` | `uint` | 会话身份 |
| `FrameId` | `uint` | 帧身份 |
| `ViewId` | `ushort` | 视角身份 |
| `RouteId` | `ushort` | 路由身份 |
| `TraceId` | `ulong` | 追踪身份 |

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

处理不可信线路输入时必须使用 `NnrpHeaderParseOptions.Strict`。严格解析拒绝不支持的版本、未知
消息类型、保留标志、无效 wire format 和超限消息。

## `NnrpFramedMessage`

`NnrpFramedMessage` 表示一个完整、与承载方式无关的帧。构造函数会验证帧头长度与传入内存区域一致。

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

`NnrpProtocolFailure` 保留 typed 协议错误、scope、诊断文本、fatal 标记，以及存在时的原始解析错误。

| 属性 | 类型 |
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

`NnrpCapabilitySelection` 是协商后的协议能力集。传输选择属于 provider registry，不存放在此值中。

| 属性 | 类型 |
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

底层 host 使用此状态机保证连接和会话顺序。

### `NnrpSessionState`

| 值 | 含义 |
|---|---|
| `Init` | 尚未开始协商 |
| `Negotiating` | 正在握手 |
| `Active` | 可以接受提交 |
| `Draining` | 正在排空已有工作，拒绝新提交 |
| `Closed` | 终态 |

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

## 缓存对象身份

Preview4 只使用 [`NnrpCacheObjectId`](./runtime#本地缓存租约状态) 作为托管侧缓存身份。它包含
`CacheNamespace`、两个 64 位 key word 和 `ObjectKind`。缓存消息、lease、dependency、运行时对象引用
和本地 cache store 使用同一个值；公共 API 不再暴露第二套更窄的 key。

## `NnrpCacheStore`

`NnrpCacheStore` 是应用侧、服务端本地缓存。它不能证明远端命中，也不能替代缓存引用协议消息。

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
客户端必须遵守 `CacheAck`、`CacheMiss`、lease、version 和 invalidation 语义。本地字典查询不能证明
远端缓存命中。
:::
