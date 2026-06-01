# C# — Transport API

Transport API 分布在 `Nnrp.Core`、`Nnrp.Transport.Tcp` 和 `Nnrp.NativeBridge`。应用通常有两条路：

1. 明确使用 TCP 时，直接用 `NnrpTcpMessageTransport`。
2. 需要 QUIC/TCP 探测和 fallback 时，用 native bridge 的 `NnrpAutoTransportClient`。

## 导入

```csharp
using Nnrp.Core;
using Nnrp.Transport.Tcp;
using Nnrp.NativeBridge;
```

## `NnrpTcpMessageTransport.ConnectAsync`

打开 TCP 连接并返回 framed NNRP transport。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `host` | `string` | 是 | 非空 hostname 或 IP | 远端 host。 |
| `port` | `int` | 是 | `1..65535` | 远端 TCP 端口。 |
| `cancellationToken` | `CancellationToken` | 否 | 默认 `default` | 取消连接。 |

| 返回 | 可能抛出 |
|---|---|
| `ValueTask<NnrpTcpMessageTransport>` | 参数、连接或取消错误。 |

```csharp
await using var transport = await NnrpTcpMessageTransport.ConnectAsync("127.0.0.1", 4433, ct);
```

## `INnrpMessageTransport.SendAsync`

发送一条 framed message。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `message` | [`NnrpFramedMessage`](./protocol#nnrpframedmessage) | 是 | 有效 framed message | 要写出的消息。 |
| `cancellationToken` | `CancellationToken` | 是 | 任意 token | 取消写入。 |

| 返回 | 可能抛出 |
|---|---|
| `ValueTask` | transport、disposed 或取消错误。 |

## `INnrpMessageTransport.ReceiveAsync`

接收一条 framed message。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `cancellationToken` | `CancellationToken` | 是 | 任意 token | 取消接收。 |

| 返回 | 可能抛出 |
|---|---|
| `ValueTask<NnrpFramedMessage>` | transport、header 格式错误、disposed 或取消错误。 |

## `NnrpAutoTransportClient`

Native bridge client 会探测 QUIC 和 TCP，并根据 `ClientProfile` 选择 transport，然后暴露 submit、ping、cancel、migrate、hint receive helper。见 [Client](./client#auto-transport-bridge)。

| 类型 | 用途 |
|---|---|
| `NnrpAutoTransportClientOptions` | host、port、TLS name、requested model、证书校验。 |
| `NnrpAutoTransportClient` | connect、probe、submit、receive flow update/result hint、migrate、close。 |
| `NnrpTransportProbeOptions` | probe sample 数量、payload 大小、timeout 和评分输入。 |

### `NnrpTransportProbeOptions`

| 属性 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `WarmupProbeCount` | `int` | 否 | `>= 0`，默认 `1` | 不参与评分的预热 probe 数量，避免首次初始化成本影响选择。 |
| `ScoredProbeCount` | `int` | 否 | `> 0`，默认 `3` | 参与 transport 评分的 probe 数量。 |
| `PayloadBytes` | `int` | 否 | `>= 0`，默认 `16384` | probe message 使用的 payload 大小。 |
| `ProbeTimeout` | `TimeSpan` | 否 | `>= TimeSpan.Zero`，默认 `2s` | 每次 probe 尝试的 timeout。 |

## 核心 Transport 类型

### `INnrpMessageSender`

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `SendAsync` | [`NnrpFramedMessage`](./protocol#nnrpframedmessage), `CancellationToken` | `ValueTask` | 写出一条 framed message。 |

### `INnrpMessageReceiver`

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `ReceiveAsync` | `CancellationToken` | `ValueTask<NnrpFramedMessage>` | 读取一条 framed message。 |

### `INnrpMessageTransport`

组合 `INnrpMessageSender` 和 `INnrpMessageReceiver`。

### `INnrpTransportIdentity`

| 属性 | 类型 | 说明 |
|---|---|---|
| `TransportId` | [`TransportId`](./enums#transportid) | 当前 active NNRP transport binding。 |

## 常见坑

::: warning
1. `NnrpTcpMessageTransport` 使用 NNRP header length 做 framing，不要再加一层 length prefix。
2. 发送和接收各自有 gate，但请求顺序仍然由应用层负责。
3. transport 要用 `await using` 或 `DisposeAsync` 释放。
4. QUIC/TCP 自动选择优先用 native bridge，不要在业务代码里手写 probe orchestration。
:::
