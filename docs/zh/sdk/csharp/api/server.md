# C# — Server API

C# server API 以 session 为中心：接受握手、接收提交、发送结果或 drop、关闭。

## 导入

```csharp
using Nnrp.Server;
using Nnrp.Core;
```

## Server 使用流程

1. 构造 [`ServerProfile`](#serverprofile)。
2. 为已接受连接创建 `INnrpMessageTransport`。
3. 构造 [`NnrpServerSession`](#nnrpserversession)，调用 [`AcceptAsync`](#nnrpserversession-acceptasync)。
4. 循环调用 [`ReceiveSubmitAsync`](#nnrpserversession-receivesubmitasync)。
5. 用 [`SendResultAsync`](#nnrpserversession-sendresultasync) 或
   [`SendResultDropAsync`](#nnrpserversession-sendresultdropasync) 回答。
6. 用 [`CloseAsync`](#nnrpserversession-closeasync) 关闭。

## `NnrpServerSession`

### 构造函数

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `profile` | [`ServerProfile`](#serverprofile) | 是 | 非空 | 服务端 capability 和限制。 |
| `transport` | [`INnrpMessageTransport`](./transport#innrpmessagetransport) | 是 | 已接受连接 | 当前 peer 的 framed transport。 |
| `sessionIdAllocator` | `Func<uint, uint>?` | 否 | 默认 echo-or-one | session id 分配函数。 |
| `cacheStore` | [`NnrpCacheStore`](./protocol#nnrpcachestore)`?` | 否 | 可选 | 启用 cache 消息处理。 |

| 返回 | 可能抛出 |
|---|---|
| `NnrpServerSession` | `ArgumentNullException`。 |

```csharp
var session = new NnrpServerSession(profile, transport);
```

### `NnrpServerSession.AcceptAsync`

接收 `CLIENT_HELLO`，协商 capability，发送 `SERVER_HELLO_ACK`。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `cancellationToken` | `CancellationToken` | 是 | 任意 token | 取消接收或发送。 |

| 返回 | 可能抛出 |
|---|---|
| [`NnrpProtocolFailure`](./protocol#nnrpprotocolfailure) | transport 异常；协商失败通过返回值表达。 |

```csharp
var failure = await session.AcceptAsync(ct);
if (failure.IsFailure) return;
```

### `NnrpServerSession.ReceiveSubmitAsync`

接收并解析下一帧提交。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `cancellationToken` | `CancellationToken` | 是 | 任意 token | 取消接收。 |

| 返回 | 可能抛出 |
|---|---|
| [`NnrpFrameSubmit`](#nnrpframesubmit) | close、submit 格式错误、session mismatch、生命周期错误。 |

```csharp
var submit = await session.ReceiveSubmitAsync(ct);
```

### `NnrpServerSession.SendResultAsync`

发送提交帧的结果。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `result` | [`NnrpResult`](#nnrpresult) | 是 | `FrameId` 匹配已提交帧 | 要序列化为 `RESULT_PUSH` 的结果。 |
| `cancellationToken` | `CancellationToken` | 是 | 任意 token | 取消发送。 |

| 返回 | 可能抛出 |
|---|---|
| `ValueTask` | 生命周期、关联、序列化或 transport 错误。 |

```csharp
await session.SendResultAsync(result, ct);
```

### `NnrpServerSession.SendResultDropAsync`

发送 `RESULT_DROP`。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `dropMessage` | `ResultDropMessage` | 是 | 必须匹配当前 session | drop 消息。 |
| `cancellationToken` | `CancellationToken` | 是 | 任意 token | 取消发送。 |

| 返回 | 可能抛出 |
|---|---|
| `ValueTask` | 生命周期、关联或 transport 错误。 |

```csharp
await session.SendResultDropAsync(ResultDropMessage.Create(session.SessionId, submit.FrameId), ct);
```

## 核心类型

### `ServerProfile`

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `MaxConcurrentFrames` | `int` | `1` | 协议层 in-flight 限制。 |
| `EnableCache` | `bool` | `true` | 是否启用 cache 协商。 |
| `MaxSections` | `int` | `16` | 每帧最大 section 数。 |
| `MaxBodyBytes` | `int` | `33554432` | 最大请求 body 字节数。 |
| `ModelName` | `string` | `""` | 握手返回的模型名。 |

### `NnrpFrameSubmit`

| 属性 | 类型 | 说明 |
|---|---|---|
| `SessionId` | `uint` | session id。 |
| `FrameId` | `uint` | 提交 frame id。 |
| `ViewId` | `ushort` | view id。 |
| `TraceId` | `ulong` | trace id。 |
| `CameraBlock` | `ReadOnlyMemory<byte>` | camera metadata。 |
| `TileIds` | `ReadOnlyMemory<ushort>` | tile id。 |
| `Sections` | `ReadOnlyMemory<TensorSectionBlock>` | tensor sections。 |
| `FrameClass` | [`FrameClass`](./enums#frame-classification) | frame class。 |
| `InputProfile` | [`InputProfile`](./enums#frame-classification) | input profile。 |

### `NnrpResult`

| 属性 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `FrameId` | `uint` | 是 | 要回答的 frame。 |
| `TileIds` | `ReadOnlyMemory<ushort>` | 否 | 结果 tile id。 |
| `Sections` | `ReadOnlyMemory<TensorSectionBlock>` | 否 | 结果 tensor sections。 |
| `ViewId` | `ushort` | 否 | 默认 `0`。 |
| `TraceId` | `ulong` | 否 | 默认 `0`。 |
| `ResultClass` | [`ResultClass`](./enums#data-plane-enums) | 否 | 完整性分类。 |
| `ResultFlags` | [`ResultFlags`](./enums#data-plane-enums) | 否 | 结果 flags。 |
| `AppliedBudgetPolicy` | [`BudgetPolicy`](./enums#data-plane-enums) | 否 | 实际使用的降级策略。 |

## 示例

```csharp
var session = new NnrpServerSession(profile, transport);
var failure = await session.AcceptAsync(ct);
if (!failure.IsFailure)
{
    var submit = await session.ReceiveSubmitAsync(ct);
    var result = await RunInferenceAsync(submit, ct);
    await session.SendResultAsync(result, ct);
}
```

## 常见坑

::: warning
1. 每个收到的 frame 都需要 result 或 drop。
2. 不要在 I/O loop 里阻塞推理。
3. 进入 submit loop 前检查 `AcceptAsync` 返回值。
4. Cache helper 需要配置 `NnrpCacheStore`。
:::
