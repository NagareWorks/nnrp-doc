# C# 传输 API

在 NNRP SDK 术语中，transport provider 是 NNRP framing/runtime 语义下方的 carrier 边界。它
可以使用传输层协议、WebSocket 这样的应用层 carrier，或本地 IPC；这里的 transport 不会重新
定义 OSI transport layer。

## `NnrpEndpoint`

`NnrpEndpoint.Parse(string)` 只接受用户侧 `nnrp://` 和 `nnrps://` endpoint。不可变值保留
`Authority`、`PathAndQuery` 和 `IsSecure`，并拒绝 credential、fragment、缺失 authority 和
carrier scheme。

角色 API 接受 `NnrpEndpoint`；选择 IPC 或 WebSocket 不会迫使应用配置改写 NNRP scheme。

## `NnrpProviderEndpoint`

`NnrpProviderEndpoint.Parse(string)` 表示显式 carrier-local override，由各 provider 包校验自己
拥有的 locator：

| Provider | 接受的 locator |
|---|---|
| TCP | Host 和 port |
| QUIC | Host 和 port |
| Unix IPC | `unix://` |
| Windows IPC | `npipe://` |
| WebSocket | `ws://` 或 `wss://` |

Provider endpoint 用于诊断、conformance 和受控部署。应用代码仍以 `NnrpEndpoint` 作为逻辑
endpoint，carrier 解析严格遵守以下规则：

1. 未提供 override 时，TCP 与 QUIC 从应用 authority 派生 host 和 port。
2. IPC 必须提供匹配的 `unix://` 或 `npipe://` locator。
3. WebSocket 必须提供匹配的 `ws://` 或 `wss://` locator。
4. 属于其他 provider 的 locator 或与平台不兼容的 IPC locator，必须在 connect、listen 或 probe
   创建 native handle 前拒绝。

无法解析的 client route 必须以 `RouteUnresolved` candidate 保留在诊断中；Auto/Prefer 可以继续选择
其他可用 route，Force 绝不回退。Server Auto/Prefer 下无法解析 route 属于配置错误，因为逻辑 listener
set 必须包含全部允许的已安装 provider。

未知 route key 属于无效配置。为已知但未安装的 transport 提供 route 时，必须产生
`LocalUnavailable` candidate。多个检查同时失败时按协议 rejection registry 顺序选择原因，因此
`RouteUnresolved` 优先于 `SecurityUnsatisfied`。

## Transport Security

| 类型 | 冻结值 |
|---|---|
| `NnrpTransportClientSecurity` | `ServerName`、owned `TrustedCertificateDer` |
| `NnrpTransportServerSecurity` | owned `CertificateDer`、owned `PrivateKeyPkcs8Der` |

Client security 只能用于 connect/probe，server security 只能用于 listen。QUIC、启用 TLS 的 TCP 与
`wss://` 必须提供对应 security。明文 TCP、IPC 与 `ws://` 不满足 `nnrps://` 应用 endpoint。

## Provider Routes

| 类型 | 冻结属性 |
|---|---|
| `NnrpClientProviderRoute` | `ProviderEndpoint`、`Security` |
| `NnrpServerProviderRoute` | `ProviderEndpoint`、`Security` |

`NnrpClientOptions.ProviderRoutes` 与 `NnrpServerOptions.ProviderRoutes` 是按 `TransportId` 索引的
只读 dictionary。每条 route 只持有一个 carrier 的 locator 与 security。Role-wide
`ProviderEndpoint` 与 `Security` 不属于 Preview4 宿主 API。

## Provider 契约

```csharp
public interface INnrpNativeTransportProvider
{
    NnrpTransportProviderDescriptor Descriptor { get; }

    ValueTask<NnrpTransportConnection> ConnectAsync(
        NnrpTransportConnectOptions options,
        CancellationToken cancellationToken = default);

    ValueTask<NnrpTransportListener> ListenAsync(
        NnrpTransportListenOptions options,
        CancellationToken cancellationToken = default);

    ValueTask<NnrpTransportProbeMetrics> ProbeAsync(
        NnrpTransportProbeOptions options,
        CancellationToken cancellationToken = default);
}
```

`NnrpTransportConnection` 和 `NnrpTransportListener` 是 opaque、可释放的 ownership value。它们
可以把 carrier ownership 转交给角色 runtime，但不会向应用暴露 FFI handle、pointer 或 native
buffer。

| Options 类型 | 冻结属性 |
|---|---|
| `NnrpTransportConnectOptions` | `Endpoint`、`ProviderEndpoint`、`Security`、`MaxPacketBytes`、`TimeoutMilliseconds` |
| `NnrpTransportListenOptions` | `Endpoint`、`ProviderEndpoint`、`Security`、`MaxPacketBytes`、`TimeoutMilliseconds` |
| `NnrpTransportProbeOptions` | connect options 加 `SampleCount`、`PayloadBytes`、`IncludeWarmup` |

## Provider Metadata

| C# 类型 | 冻结属性 |
|---|---|
| `NnrpTransportProviderCost` | `ModelId: ushort`、`Units: ulong` |
| `NnrpTransportProviderLimits` | `MaxFrameBytes: ulong` |
| `NnrpTransportProviderLimitation` | `RequiresUdp`、`RequiresTcp`、`LocalHostOnly`、`NativeHostOnly`、`BrowserHostOnly`、`UnixDomainSocket`、`WindowsNamedPipe` |
| `NnrpTransportProviderMetadata` | `Id`、`Cost`、`PreferenceRank`、`Limits`、`Limitations` |
| `NnrpTransportProviderDescriptor` | `Name`、`Version`、`TransportId`、`Kind`、`Available`、`LibraryPath`、`Metadata`、`Diagnostic` |
| `NnrpTransportProbeState` | `NotRun`、`Succeeded`、`Failed`、`Missing` |
| `NnrpTransportProbeMetrics` | `SampleCount`、`SuccessCount`、`MedianThroughputBytesPerSecond`、`MedianRttMicroseconds` |
| `NnrpTransportRejectionReason` | `PolicyDisallowed`、`LocalUnavailable`、`PeerUnsupported`、`LimitExceeded`、`RouteUnresolved`、`SecurityUnsatisfied`、`ProbeMissing`、`ProbeFailed` |
| `NnrpTransportCandidate` | `TransportId`、`Provider`、`LocalAvailable`、`PeerSupported`、`WithinLimits`、`ProbeState`、`Probe`、`SelectionRank`、`RejectionReason`、`Diagnostic` |
| `NnrpTransportSelection` | `SelectedProvider`、有序 `Candidates`、`Policy`、`Diagnostic` |

Metadata 必须与 Rust artifact manifest 一致。C# 使用
[Transport Strategy and Probing](/zh/protocol/v1/transport-strategy) 冻结的 comparator，不创造
自己的加权分数。

## `NnrpNativeTransportRegistry`

| 方法 | 语义 |
|---|---|
| `Register(INnrpNativeTransportProvider)` | 注册一个 provider，拒绝重复 provider 或 transport ID。 |
| `Snapshot()` | 返回不可变、稳定顺序的 provider snapshot。 |
| `Resolve(NnrpTransportSelectionOptions)` | 执行过滤和选择，并返回 typed candidate evidence。 |

安装的一方包会注册 `NnrpNativeTcpTransportProvider`、`NnrpNativeQuicTransportProvider`、
`NnrpNativeIpcTransportProvider` 或 `NnrpNativeWebSocketTransportProvider`。角色 options 可以用显式
provider 列表替换默认 registry。

只有一个有效 provider 时直接选择；多个有效 provider 才进入冻结的 probe/comparison 路径。
被拒绝的 candidate 仍保留在 `NnrpTransportSelection` 中。

## 一方包

| 包 | Provider 和 runtime | 持有的产物 |
|---|---|---|
| `Nnrp.Transport.Tcp` | `NnrpNativeTcpTransportProvider`、`NnrpNativeTcpRuntime` | 仅 TCP |
| `Nnrp.Transport.Quic` | `NnrpNativeQuicTransportProvider`、`NnrpNativeQuicRuntime` | 仅 QUIC |
| `Nnrp.Transport.Ipc` | `NnrpNativeIpcTransportProvider`、`NnrpNativeIpcRuntime` | 仅 IPC |
| `Nnrp.Transport.WebSocket` | `NnrpNativeWebSocketTransportProvider`、`NnrpNativeWebSocketRuntime` | 仅 WebSocket |

每个包拥有自己 provider 的 connect、listen、probe、manifest 校验和 artifact 加载。

## 诊断 Framed Transport

`INnrpMessageSender`、`INnrpMessageReceiver`、`INnrpMessageTransport` 和
`NnrpTcpMessageTransport` 只属于底层 packet 诊断/自定义 carrier 契约。它们不参与生产 provider
选择，也不是 native artifact 缺失时的 fallback。
