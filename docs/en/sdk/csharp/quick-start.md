# C# Quick Start

Use the C# SDK in different ways depending on the host type.

## Choose the installation path

### Regular .NET client application

If you are building a regular .NET client application, install the client package from NuGet:

```powershell
dotnet add package Nnrp.Client
```

Use this path for managed client-side integrations that want the C# session helpers and client-facing API surface.

### Regular .NET server application

If you are building a regular .NET server application, install the server package from NuGet:

```powershell
dotnet add package Nnrp.Server
```

Use this path for server-side session helpers and protocol-facing server integration.

### Unity project

If you are integrating from Unity, do not install the SDK through NuGet.

Instead:

1. Open the latest GitHub Release for `NagareWorks/nnrp-cs`.
2. Find the release asset named `com.nnrp.client-<version>.zip`.
3. Download that zip and import or unpack it as the Unity-style package bundle for that version.

This Unity package bundle is produced by CI and is the distribution path for the Unity-facing package layout.

## Notes

1. `Nnrp.Client` and `Nnrp.Server` are the primary entry packages for regular .NET applications.
2. Lower-level packages such as `Nnrp.Core`, `Nnrp.Transport.Tcp`, and `Nnrp.NativeBridge` are still available when you need more control over transport or wire-level integration.
3. The Unity package currently ships as a GitHub Release asset rather than a public UPM registry package.