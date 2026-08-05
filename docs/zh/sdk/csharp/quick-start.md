# C# 快速使用

## Client

安装 client 角色，以及当前部署允许使用的全部 transport：

```powershell
dotnet add package Nnrp.Client --prerelease
dotnet add package Nnrp.Transport.Quic --prerelease
dotnet add package Nnrp.Transport.Tcp --prerelease
```

```csharp
using System.Collections.Generic;
using Nnrp.Client;
using Nnrp.Core;

await using var client = await NnrpClient.ConnectAsync(
    new NnrpClientOptions(
        NnrpEndpoint.Parse("nnrps://runtime.example/session/default"))
    {
        TransportPolicy = TransportPolicy.Auto,
        ProviderRoutes = new Dictionary<TransportId, NnrpClientProviderRoute>
        {
            [TransportId.Quic] = new()
            {
                Security = new NnrpTransportClientSecurity("runtime.example", trustedCertificateDer),
            },
            [TransportId.Tcp] = new()
            {
                Security = new NnrpTransportClientSecurity("runtime.example", trustedCertificateDer),
            },
        },
    },
    cancellationToken);

await using var session = client.OpenSession(new NnrpClientSessionOptions());
var result = await session.SubmitAsync(request, cancellationToken);
```

下面假设 `trustedCertificateDer` 是从部署信任配置加载的 `byte[]`。

默认 provider registry 包含已安装 transport 包注册的 provider。安装 provider 会提供真实 carrier
实现及其 scoped native artifact；应用 options 保持 transport-neutral，不携带 provider instance 列表。

## Server

安装 server 角色，以及 server 允许监听的 transport：

```powershell
dotnet add package Nnrp.Server --prerelease
dotnet add package Nnrp.Transport.Ipc --prerelease
dotnet add package Nnrp.Transport.WebSocket --prerelease
```

```csharp
using System.Collections.Generic;
using Nnrp.Core;
using Nnrp.Server;

await using var server = await NnrpServer.ListenAsync(
    new NnrpServerOptions(NnrpEndpoint.Parse("nnrp://localhost/runtime/default"))
    {
        TransportPolicy = TransportPolicy.PreferIpc,
        ProviderRoutes = new Dictionary<TransportId, NnrpServerProviderRoute>
        {
            [TransportId.Ipc] = new()
            {
                ProviderEndpoint = NnrpProviderEndpoint.Parse("unix:///run/nnrp/runtime.sock"),
            },
        },
    },
    cancellationToken);

await using var session = await server.AcceptAsync(
    new NnrpServerAcceptOptions(),
    cancellationToken);
var operation = await session.ReceiveSubmitAsync(cancellationToken);
await operation.SendResultAsync(resultMetadata, resultBody, cancellationToken);
```

IPC 和 WebSocket 部署必须在 `ProviderRoutes` 的对应项中设置匹配的 `unix://`、`npipe://`、`ws://`
或 `wss://` locator。示例使用 Unix-domain socket；Windows IPC 使用 `npipe://` locator。Provider
route 不会替换用户侧 NNRP endpoint。

## Unity

通过 OpenUPM 安装 client 包：

```bash
openupm add com.nnrp.client
```

Unity 包包含 client 角色和 transport-scoped plugin，不包含 server assembly。Plugin import
settings 负责选择平台产物，不会把多个 transport 实现合并进同一个链接库。

## 诊断 Packet API

托管 packet builder 和 `INnrpMessageTransport` adapter 只用于诊断和自定义 carrier。生产 client
和 server 流量分别从 `NnrpClient.ConnectAsync` 与 `NnrpServer.ListenAsync` 开始，确保协议执行
保持在 Rust-backed 路径。
