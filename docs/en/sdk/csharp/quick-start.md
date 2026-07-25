# C# Quick Start

## Client

Install the client role and every transport that this deployment permits:

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

The example assumes `trustedCertificateDer` is a `byte[]` loaded from deployment trust configuration.

The default provider registry contains providers registered by the installed transport packages. Set
`NnrpClientOptions.Transports` only for controlled deployments or tests that need an explicit list.

## Server

Install the server role and the transport packages on which the server may listen:

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

IPC and WebSocket deployments set the matching entry in `ProviderRoutes` to a `unix://`, `npipe://`,
`ws://`, or `wss://` locator. The example uses a Unix-domain socket; Windows IPC uses a `npipe://`
locator. Provider routes do not replace the application-facing NNRP endpoint.

## Unity

Install the client package through OpenUPM:

```bash
openupm add com.nnrp.client
```

The Unity package contains the client role and transport-scoped plugins. It does not contain server
assemblies. Plugin import settings select the platform artifact; they do not merge transport
implementations into one library.

## Diagnostic Packet APIs

Managed packet builders and `INnrpMessageTransport` adapters are diagnostic and custom-carrier
surfaces. Production client and server traffic starts from `NnrpClient.ConnectAsync` and
`NnrpServer.ListenAsync` so protocol execution remains on the Rust-backed path.
