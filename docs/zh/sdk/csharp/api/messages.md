# C# - 消息类型

`Nnrp.Core` 提供与承载方式无关的 NNRP 线路模型。应用代码通常使用
[`Nnrp.Client`](./client) 和 [`Nnrp.Server`](./server) 的角色 API；本页类型面向传输提供者、
诊断工具、测试套件 target 和协议工具。

```csharp
using Nnrp.Core;
```

## 统一消息结构

每种具体消息都是 `readonly struct`，由 [`NnrpHeader`](./protocol#nnrpheader)、零个或一个定长
metadata 值，以及该消息定义的 body 区域组成。以 `TransportProbeAckMessage` 为例，它公开以下
精确结构：

```csharp
public NnrpHeader Header { get; }
public TransportProbeAckMetadata Metadata { get; }

public NnrpFramedMessage ToFramedMessage();
public byte[] ToArray();

public static bool TryParse(
    ReadOnlyMemory<byte> source,
    out TransportProbeAckMessage message,
    out NnrpParseError error);
```

`PingMessage`、`PongMessage` 和 `ResultDropMessage` 只有 header；`CloseMessage` 有 body 但没有
metadata。Metadata 类型提供 `ToArray()` 和 `TryParse(ReadOnlySpan<byte>, ...)`。严格解析重载会
拒绝保留值和非零保留字段；消息解析还会验证消息类型、定长 metadata、body 分区长度和尾随数据。

## 连接握手

### `ClientHelloMessage`

| 属性 | 类型 | 含义 |
|---|---|---|
| `Header` | `NnrpHeader` | `ClientHello` 帧头 |
| `Metadata` | `ClientHelloMetadata` | 版本、profile、payload、codec、缓存、lane 和预算能力 |
| `AuthBlock` | `ReadOnlyMemory<byte>` | 应用认证数据 |
| `Extensions` | `ReadOnlyMemory<ControlExtensionBlock>` | 对齐的控制扩展块 |

以下 typed accessor 分别解析客户端传输策略、丢失容忍度和 payload 能力：

```csharp
bool TryGetClientTransportPolicyExtension(
    out ClientTransportPolicyExtension extension,
    out NnrpParseError error);
bool TryGetClientLossToleranceExtension(
    out ClientLossToleranceExtension extension,
    out NnrpParseError error);
bool TryGetClientPayloadCapabilitiesExtension(
    out ClientPayloadCapabilitiesExtension extension,
    out NnrpParseError error);
```

### `ServerHelloAckMessage`

| 属性 | 类型 | 含义 |
|---|---|---|
| `Header` | `NnrpHeader` | `ServerHelloAck` 帧头 |
| `Metadata` | `ServerHelloAckMetadata` | 已选择能力、限制、重试策略和服务端标志 |
| `Extensions` | `ReadOnlyMemory<ControlExtensionBlock>` | 服务端接受的控制扩展块 |

以下 typed accessor 分别解析服务端接受的传输策略、丢失容忍度和 payload 能力：

```csharp
bool TryGetServerTransportPolicyAckExtension(
    out ServerTransportPolicyAckExtension extension,
    out NnrpParseError error);
bool TryGetServerLossToleranceAckExtension(
    out ServerLossToleranceAckExtension extension,
    out NnrpParseError error);
bool TryGetServerPayloadCapabilitiesAckExtension(
    out ServerPayloadCapabilitiesAckExtension extension,
    out NnrpParseError error);
```

`PingMessage`、`PongMessage`、`CloseMessage` 和 `ErrorMessage` 构成其余连接控制面。
`ErrorMessage` 由 `ErrorMetadata` 和可选诊断字节组成。

## 会话生命周期

| 消息 | Metadata/body |
|---|---|
| `SessionOpenMessage` | `SessionOpenMetadata`，以及认证、resume token 和扩展数据 |
| `SessionOpenAckMessage` | `SessionOpenAckMetadata`，以及 resume token 和扩展数据 |
| `SessionPatchMessage` | `SessionPatchMetadata` 和可选 `TensorProfilePatchBlock` |
| `SessionPatchAckMessage` | `SessionPatchAckMetadata` 和可选 `TensorProfilePatchAckBlock` |
| `SessionCloseMessage` | `SessionCloseMetadata` |
| `SessionCloseAckMessage` | `SessionCloseAckMetadata` |
| `SessionMigrateMessage` | `SessionMigrateMetadata` |
| `SessionMigrateAckMessage` | `SessionMigrateAckMetadata` |

角色 API 负责维护生命周期顺序。底层调用者必须通过
[`NnrpSessionStateMachine`](./protocol#nnrpsessionstatemachine) 执行相同状态迁移。

Preview4 面向应用的生命周期模型见
[`NnrpConnectionLifecycle` 与 `NnrpSessionLifecycle`](./runtime#连接与会话生命周期)。关闭请求被拒绝时，
该模型会保留会话此前由 open 或 resume 建立的状态。

## 提交与结果

### `FrameSubmitMessage`

`FrameSubmitMessage` 包含：

- `FrameSubmitMetadata`
- 一个 `TensorSubmitBlock`
- 可选 camera block
- tile ID
- tensor section block

`FrameSubmitMetadata` 包含尺寸、帧和输入 profile、延迟预算、cadence、提交和预算策略、对象引用
mask、依赖帧、payload-kind bitmap 与 payload-frame 数量。线路 `operation_id` 由 Preview4
运行时控制 tail 和角色 API 管理，不与 `FrameId` 互为别名。

### `ResultPushMessage`

`ResultPushMessage` 包含：

- `ResultPushMetadata`
- 一个 `TensorResultBlock`
- tile ID 与 tensor section
- typed payload descriptor
- typed payload frame 字节与已校验 frame view
- typed profile coverage 记录

解析器在暴露 view 前校验 typed-payload 范围和 profile coverage。数据需要脱离解码帧长期保存时，
应使用角色 API 提供的 snapshot 类型。

### 其他数据消息

| 消息 | 含义 |
|---|---|
| `FrameCancelMessage` | 取消其帧头标识的帧 |
| `ResultDropMessage` | 不携带 payload 地终止结果 |
| `ResultHintMessage` | 携带已应用预算策略、拥塞状态、原因和重试延迟 |
| `SubmitOutcome` | 包含 `ResultPushMessage` 或 `ResultDropMessage` 的判别结果 |

## 缓存消息

Preview4 使用完整缓存身份：namespace、高低两个 key word 和 object kind。

| 消息 | 公共 payload |
|---|---|
| `CachePutMessage` | `CachePutMetadata` 和 `ObjectBytes` |
| `CacheAckMessage` | `CacheAckMetadata` |
| `CacheInvalidateMessage` | `CacheInvalidateMetadata` |

角色层缓存操作统一使用 [`NnrpCacheObjectId`](./runtime#本地缓存租约状态)，不再暴露第二套较窄
的 key 类型。

## 流控与传输探测消息

`FlowUpdateMessage` 包装 `FlowUpdateMetadata`，其中包含 scope、原因、背压级别、连接/会话/操作
credit、64 位 operation ID、重试延迟、credit epoch 和标志。

`TransportProbeMessage` 携带 `TransportProbeMetadata` 和探测 payload；
`TransportProbeAckMessage` 携带 `TransportProbeAckMetadata`。Provider 选择通过 typed provider API
消费探测结果，应用无需自行解析探测包。

## `ControlExtensionBlock`

`ControlExtensionBlock` 是握手消息使用的公共对齐 TLV 值。

```csharp
public readonly struct ControlExtensionBlock
{
    public ushort ExtensionType { get; }
    public ReadOnlyMemory<byte> Value { get; }
    public uint Length { get; }
    public int TotalLength { get; }
    public int PaddingLength { get; }
    public bool IsCritical { get; }
    public ushort TypeCode { get; }
    public ControlExtensionType TypedType { get; }

    public void WriteTo(Span<byte> destination);
    public byte[] ToArray();
    public static bool TryParse(
        ReadOnlySpan<byte> source,
        out ControlExtensionBlock block,
        out int bytesConsumed,
        out NnrpParseError error);
}
```

未知 critical 扩展会导致协商失败。未知非 critical 扩展可以忽略，但仍必须消费其完整对齐线路长度。

## 生命周期规则

::: warning
`ReadOnlyMemory<byte>` 和 typed frame view 可能引用输入包或 native-owned buffer，不得超过文档规定
的 owner 生命周期保存。需要独立生命周期时，角色 API 返回复制后的 snapshot。
:::
