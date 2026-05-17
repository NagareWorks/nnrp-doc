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

The recommended path is to install it through OpenUPM:

```bash
openupm add com.nnrp.client
```

Package page: <https://openupm.com/packages/com.nnrp.client/>

If you do not want to use the OpenUPM CLI, you can update `Packages/manifest.json` directly:

```json
{
	"scopedRegistries": [
		{
			"name": "package.openupm.com",
			"url": "https://package.openupm.com",
			"scopes": [
				"com.nnrp.client"
			]
		}
	],
	"dependencies": {
		"com.nnrp.client": "<version>"
	}
}
```

GitHub Release assets are still published by CI, but they are now a fallback distribution path rather than the recommended Unity installation flow.

## Notes

1. `Nnrp.Client` and `Nnrp.Server` are the primary entry packages for regular .NET applications.
2. Lower-level packages such as `Nnrp.Core`, `Nnrp.Transport.Tcp`, and `Nnrp.NativeBridge` are still available when you need more control over transport or wire-level integration.
3. The Unity package is now available on OpenUPM, and the preferred install path is OpenUPM CLI or a direct `Packages/manifest.json` update.