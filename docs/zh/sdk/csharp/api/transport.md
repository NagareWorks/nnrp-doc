# C# — Transport API

Transport API 分布在 `Nnrp.Core`、`Nnrp.Transport.Tcp`、`Nnrp.Transport.Quic` 和
`Nnrp.NativeBridge`。应用通常有两条路：

1. 明确使用 TCP 时，直接用 `NnrpTcpMessageTransport`。
2. 需要 Rust-backed connection、session、submit/result、cancel 和 control path 时，使用 native
   bridge host surface 与 TCP/QUIC runtime package。

## 导入

```csharp
using Nnrp.Core;
using Nnrp.Transport.Tcp;
using Nnrp.Transport.Quic;
using Nnrp.NativeBridge;
```

## `NnrpTcpMessageTransport.ConnectAsync`

打开 TCP 连接并返回 framed NNRP transport。

| 参数                | 类型                | 必填 | 取值 / 范围         | 说明            |
| ------------------- | ------------------- | ---: | ------------------- | --------------- |
| `host`              | `string`            |   是 | 非空 hostname 或 IP | 远端 host。     |
| `port`              | `int`               |   是 | `1..65535`          | 远端 TCP 端口。 |
| `cancellationToken` | `CancellationToken` |   否 | 默认 `default`      | 取消连接。      |

| 返回                                 | 可能抛出               |
| ------------------------------------ | ---------------------- |
| `ValueTask<NnrpTcpMessageTransport>` | 参数、连接或取消错误。 |

```csharp
await using var transport = await NnrpTcpMessageTransport.ConnectAsync("127.0.0.1", 4433, ct);
```

## `INnrpMessageTransport.SendAsync`

发送一条 framed message。

| 参数                | 类型                                                | 必填 | 取值 / 范围         | 说明           |
| ------------------- | --------------------------------------------------- | ---: | ------------------- | -------------- |
| `message`           | [`NnrpFramedMessage`](./protocol#nnrpframedmessage) |   是 | 有效 framed message | 要写出的消息。 |
| `cancellationToken` | `CancellationToken`                                 |   是 | 任意 token          | 取消写入。     |

| 返回        | 可能抛出                         |
| ----------- | -------------------------------- |
| `ValueTask` | transport、disposed 或取消错误。 |

## `INnrpMessageTransport.ReceiveAsync`

接收一条 framed message。

| 参数                | 类型                | 必填 | 取值 / 范围 | 说明       |
| ------------------- | ------------------- | ---: | ----------- | ---------- |
| `cancellationToken` | `CancellationToken` |   是 | 任意 token  | 取消接收。 |

| 返回                           | 可能抛出                                          |
| ------------------------------ | ------------------------------------------------- |
| `ValueTask<NnrpFramedMessage>` | transport、header 格式错误、disposed 或取消错误。 |

## Native Runtime Transport Provider

`Nnrp.Transport.Tcp`、`Nnrp.Transport.Quic`、`Nnrp.Transport.Ipc` 与 `Nnrp.Transport.WebSocket`
分别暴露 provider 和 runtime helper，把 package 边界映射到 Rust native transport slot。它们与 [Client](./client#native-runtime-bridge) 中的 native
bridge host facade 配合使用。

| 类型                              | 用途                                                  |
| --------------------------------- | ----------------------------------------------------- |
| `NnrpNativeTcpTransportProvider`  | TCP native runtime provider identity。                |
| `NnrpNativeQuicTransportProvider` | QUIC native runtime provider identity。               |
| `NnrpNativeIpcTransportProvider` | IPC native runtime provider identity。               |
| `NnrpNativeWebSocketTransportProvider` | WebSocket native runtime provider identity。       |
| `NnrpNativeTcpRuntime`            | 打开 TCP-backed session、connection 和 server host。  |
| `NnrpNativeQuicRuntime`           | 打开 QUIC-backed session、connection 和 server host。 |
| `NnrpNativeIpcRuntime`            | 打开 IPC-backed session、connection 和 server host。 |
| `NnrpNativeWebSocketRuntime`      | 打开 WebSocket-backed session、connection 和 server host。 |

```csharp
using var host = NnrpNativeTcpRuntime.OpenConnectionHost(
    new NnrpNativeTcpRuntimeConnectionHostOptions(connectionId: 1, connectionGeneration: 1));
```

### Provider 选择模型

| C# 类型 | 冻结属性 |
|---|---|
| `NnrpTransportProviderCost` | `ModelId: ushort`、`Units: ulong` |
| `NnrpTransportProviderLimits` | `MaxFrameBytes: ulong` |
| `NnrpTransportProviderLimitation` | `RequiresUdp`、`RequiresTcp`、`LocalHostOnly`、`NativeHostOnly`、`BrowserHostOnly`、`UnixDomainSocket`、`WindowsNamedPipe` |
| `NnrpTransportProviderMetadata` | `Id`、`Cost`、`PreferenceRank`、`Limits`、`Limitations` |
| `NnrpTransportProviderDescriptor` | `Name`、`Version`、`TransportId`、`Kind`、`Available`、`LibraryPath`、`Metadata`、`Diagnostic` |
| `NnrpTransportProbeState` | `NotRun`、`Succeeded`、`Failed`、`Missing` |
| `NnrpTransportProbeMetrics` | `SampleCount`、`SuccessCount`、`MedianThroughputBytesPerSecond`、`MedianRttMicroseconds` |
| `NnrpTransportRejectionReason` | `PolicyDisallowed`、`LocalUnavailable`、`PeerUnsupported`、`LimitExceeded`、`ProbeMissing`、`ProbeFailed` |
| `NnrpTransportCandidate` | `TransportId`、`Provider`、`LocalAvailable`、`PeerSupported`、`WithinLimits`、`ProbeState`、`Probe`、`SelectionRank`、`RejectionReason`、`Diagnostic` |
| `NnrpTransportSelection` | `SelectedProvider`、有序 `Candidates`、`Policy`、`Diagnostic` |

C# 必须校验每个 Rust artifact 的 provider 元数据，并使用[传输策略与探测](/zh/protocol/v1/transport-strategy)
冻结的 comparator；不得公开 C# 私有的加权 score。

## 核心 Transport 类型

### `INnrpMessageSender`

| 方法        | 参数                                                                     | 返回        | 说明                      |
| ----------- | ------------------------------------------------------------------------ | ----------- | ------------------------- |
| `SendAsync` | [`NnrpFramedMessage`](./protocol#nnrpframedmessage), `CancellationToken` | `ValueTask` | 写出一条 framed message。 |

### `INnrpMessageReceiver`

| 方法           | 参数                | 返回                           | 说明                      |
| -------------- | ------------------- | ------------------------------ | ------------------------- |
| `ReceiveAsync` | `CancellationToken` | `ValueTask<NnrpFramedMessage>` | 读取一条 framed message。 |

### `INnrpMessageTransport`

组合 `INnrpMessageSender` 和 `INnrpMessageReceiver`。

### `INnrpTransportIdentity`

| 属性          | 类型                                 | 说明                                 |
| ------------- | ------------------------------------ | ------------------------------------ |
| `TransportId` | [`TransportId`](./enums#transportid) | 当前 active NNRP transport binding。 |

## 常见坑

::: warning

1. `NnrpTcpMessageTransport` 使用 NNRP header length 做 framing，不要再加一层 length prefix。
2. 发送和接收各自有 gate，但请求顺序仍然由应用层负责。
3. transport 要用 `await using` 或 `DisposeAsync` 释放。
4. Rust-backed runtime path 使用 `NnrpNativeTcpRuntime` 或 `NnrpNativeQuicRuntime`；
   `NnrpTcpMessageTransport` 只适合底层 TCP framing 测试和诊断。 :::
