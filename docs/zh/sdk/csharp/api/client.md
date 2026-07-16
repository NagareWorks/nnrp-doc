# C# — Client API

C# client API 以 `NnrpClient` 为入口：连接、提交、接收事件、迁移、关闭。低层协议对象保留，但应用代码应优先从这些方法开始。

## 导入

```csharp
using Nnrp.Client;
using Nnrp.Core;
```

## Client 使用流程

1. 构造 [`ClientProfile`](#clientprofile)。
2. 创建 `INnrpMessageTransport`，或交给 bridge/bootstrap helper 选择。
3. 构造 [`NnrpClient`](#nnrpclient)，调用 [`ConnectAsync`](#nnrpclient-connectasync)。
4. 简单请求用 [`SubmitAsync`](#nnrpclient-submitasync)；多帧并发用
   [`SendSubmitAsync`](#nnrpclient-sendsubmitasync) + [`ReceiveResultAsync`](#nnrpclient-receiveresultasync)。
5. 需要 flow update / result hint 时调用 [`ReceiveNextEventAsync`](#nnrpclient-receivenexteventasync)。
6. 用 [`CloseAsync`](#nnrpclient-closeasync) 关闭。

## `NnrpClient`

### 构造函数

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `profile` | [`ClientProfile`](#clientprofile) | 是 | 非空 | 客户端 capability 和偏好。 |
| `transport` | [`INnrpMessageTransport`](./transport#innrpmessagetransport) | 是 | 已连接 transport | TCP、QUIC bridge 或自定义 framed transport。 |

| 返回 | 可能抛出 |
|---|---|
| `NnrpClient` | `ArgumentNullException`。 |

```csharp
var client = new NnrpClient(profile, transport);
```

### `NnrpClient.ConnectAsync`

发送 `CLIENT_HELLO`，校验 `SERVER_HELLO_ACK`，激活 session state。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `requestedSessionId` | `uint` | 否 | `0` 表示服务端分配 | 请求的 session id。 |
| `traceId` | `ulong` | 否 | 任意 trace id | 追踪关联值。 |
| `cancellationToken` | `CancellationToken` | 否 | 默认 `default` | 取消 transport I/O。 |

| 返回 | 可能抛出 |
|---|---|
| [`NnrpClientConnectResult`](#nnrpclientconnectresult) | transport 异常；部分握手错误会体现在失败结果里。 |

```csharp
var connect = await client.ConnectAsync(requestedSessionId: 1, cancellationToken: ct);
if (!connect.IsConnected)
{
    throw new InvalidOperationException(connect.Failure.ToString());
}
```

### `NnrpClient.SubmitAsync`

提交一帧并等待匹配的 `RESULT_PUSH`。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `submitRequest` | [`NnrpSubmitRequest`](#nnrpsubmitrequest) | 是 | `FrameId` 在 in-flight 中唯一 | 结构化 inline tensor 请求。 |
| `cancellationToken` | `CancellationToken` | 否 | 默认 `default` | 取消发送或接收。 |

| 返回 | 可能抛出 |
|---|---|
| [`NnrpSubmitResult`](#nnrpsubmitresult) | transport、drop 或关联错误。 |

```csharp
var result = await client.SubmitAsync(request, ct);
```

### `NnrpClient.SendSubmitAsync`

只发送，不等待结果。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `submitRequest` | [`NnrpSubmitRequest`](#nnrpsubmitrequest) | 是 | `FrameId` 在 in-flight 中唯一 | 要序列化并发送的请求。 |
| `cancellationToken` | `CancellationToken` | 否 | 默认 `default` | 取消发送。 |

| 返回 | 可能抛出 |
|---|---|
| [`NnrpSubmittedFrame`](#nnrpsubmittedframe) | 序列化、transport 或重复 frame 错误。 |

```csharp
var submitted = await client.SendSubmitAsync(request, ct);
```

### `NnrpClient.ReceiveResultAsync`

等待之前提交帧的结果。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `expectedFrameId` | `uint` | 是 | 已 in-flight 的 frame | 目标 frame id。 |
| `expectedViewId` | `ushort` | 否 | 默认 `0` | 目标 view id。 |
| `cancellationToken` | `CancellationToken` | 否 | 默认 `default` | 取消接收。 |

| 返回 | 可能抛出 |
|---|---|
| `ResultPushMessage` | drop、包格式错误、session mismatch 或关联错误。 |

```csharp
var resultMessage = await client.ReceiveResultAsync(submitted.FrameId, submitted.ViewId, ct);
```

### `NnrpClient.ReceiveNextEventAsync`

接收下一条 session event，包括 result、drop、flow update、result hint。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `cancellationToken` | `CancellationToken` | 否 | 默认 `default` | 取消接收。 |

| 返回 | 可能抛出 |
|---|---|
| [`NnrpSessionEvent`](#nnrpsessionevent) | transport 或解析错误。 |

```csharp
var sessionEvent = await client.ReceiveNextEventAsync(ct);
```

### `NnrpClient.CloseAsync`

发送 `CLOSE` 并清理本地 in-flight 状态。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `reason` | `string` | 否 | 默认 `""` | 关闭原因。 |
| `traceId` | `ulong` | 否 | 任意 trace id | 追踪关联值。 |
| `cancellationToken` | `CancellationToken` | 否 | 默认 `default` | 取消发送。 |

| 返回 | 可能抛出 |
|---|---|
| [`NnrpProtocolFailure`](./protocol#nnrpprotocolfailure) | transport 错误。 |

```csharp
await client.CloseAsync("shutdown", cancellationToken: ct);
```

## 核心类型

### `ClientProfile`

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `TransportPolicy` | [`TransportPolicy`](./enums#transport-policy) | 仓库默认值 | transport 偏好。 |
| `SessionLossTolerance` | [`LossTolerance`](./enums#loss-tolerance) | 仓库默认值 | 可接受 loss 策略。 |
| `MaxViews` | `int` | `1` | 最大并发 view。 |
| `EnableCache` | `bool` | `true` | 是否请求 cache。 |
| `MaxCacheEntries` | `int` | `256` | 请求的 cache 条目数。 |
| `SupportedCodecs` | `CodecId[]` | 标准集合 | codec capability。 |
| `SupportedDTypes` | `DTypeId[]` | 标准集合 | dtype capability。 |
| `SupportedTensorLayouts` | `TensorLayoutId[]` | 标准集合 | layout capability。 |

### `NnrpSubmitRequest`

| 属性 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `OperationId` | `ulong` | 是 | 非零生命周期 id，与 `FrameId` 独立。 |
| `FrameId` | `uint` | 是 | in-flight 内唯一。 |
| `SourceWidth` / `SourceHeight` | `ushort` | 是 | 源尺寸。 |
| `TileWidth` / `TileHeight` | `ushort` | 是 | tile 尺寸。 |
| `CameraBlock` | `ReadOnlyMemory<byte>` | 是 | camera metadata。 |
| `TileIds` | `ReadOnlyMemory<ushort>` | 是 | tile id。 |
| `Sections` | `ReadOnlyMemory<TensorSectionBlock>` | 是 | tensor sections。 |
| `ViewId` | `ushort` | 否 | 默认 `0`。 |
| `TraceId` | `ulong` | 否 | 默认 `0`。 |
| `FrameClass` | [`FrameClass`](./enums#frame-classification) | 否 | 默认 `Keyframe`。 |
| `InputProfile` | [`InputProfile`](./enums#frame-classification) | 否 | 默认 `DenseLumaFrame`。 |
| `TileIndexMode` | [`TileIndexMode`](./enums#data-plane-enums) | 否 | 默认 `RawUInt16`。 |
| `LatencyBudgetMilliseconds` | `ushort` | 否 | 默认 `16`。 |

### `NnrpSubmitResult`

| 属性 | 类型 | 说明 |
|---|---|---|
| `SessionId` | `uint` | 协商后的 session id。 |
| `FrameId` | `uint` | 结果 frame id。 |
| `ViewId` | `ushort` | 结果 view id。 |
| `StatusCode` | `ResultStatusCode` | 结果状态。 |
| `ResultClass` | [`ResultClass`](./enums#data-plane-enums) | 完整性分类。 |
| `ResultFlags` | [`ResultFlags`](./enums#data-plane-enums) | 结果 flags。 |
| `InferenceMilliseconds` | `ushort` | 推理耗时。 |
| `TileIds` | `ReadOnlyMemory<ushort>` | 结果 tile id。 |
| `Sections` | `ReadOnlyMemory<TensorSectionBlock>` | 结果 tensor sections。 |

### `NnrpClientConnectResult`

| 属性 | 类型 | 说明 |
|---|---|---|
| `IsConnected` | `bool` | capability negotiation 成功时为 `true`。 |
| `NegotiationResult` | `NnrpCapabilityNegotiationResult` | capability negotiation 细节。 |
| `Failure` | [`NnrpProtocolFailure`](./protocol#nnrpprotocolfailure) | 未连接时的失败信息。 |

### `NnrpSubmittedFrame`

| 属性 | 类型 | 说明 |
|---|---|---|
| `SessionId` | `uint` | submit 使用的 session id。 |
| `FrameId` | `uint` | 已提交 frame id。 |
| `ViewId` | `ushort` | view id。 |
| `TraceId` | `ulong` | trace id。 |
| `WireFormat` | `byte` | 当前 NNRP wire format。 |

## 常见坑

::: warning
1. `NnrpClient` 不负责创建任意 transport；先选择或构造 transport。
2. `FrameId` + `ViewId` 在 in-flight 内必须唯一。
3. 服务端可能插入 flow update / result hint 时，使用 `ReceiveNextEventAsync`。
4. 关闭 client 后也要释放底层 transport 或 bridge。
:::
