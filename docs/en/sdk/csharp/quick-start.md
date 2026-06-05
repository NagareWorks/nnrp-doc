# C# Quick Start

Use the C# SDK through the Preview3 native bridge when you want the same Rust-backed hot path used
by the Python and JavaScript bindings. Managed client/server packages remain available for tests,
diagnostics, and custom framed transports, but the normal application path is native bridge plus
explicit transport packages.

## Requirements

1. .NET 6 or newer application runtime.
2. `netstandard2.1`-compatible project.
3. A platform covered by the native artifacts packaged in the selected transport packages.

## Backend Client

Install the native bridge and the transports the client is allowed to probe:

```powershell
dotnet add package Nnrp.NativeBridge --prerelease
dotnet add package Nnrp.Transport.Tcp --prerelease
dotnet add package Nnrp.Transport.Quic --prerelease
```

The bridge probes the installed providers and uses the configured transport policy to choose the
active path. QUIC being available does not force QUIC; the selected provider is the one with the best
score under policy and peer capability constraints.

## Backend Server

Servers use the same native bridge and transport packages:

```powershell
dotnet add package Nnrp.NativeBridge --prerelease
dotnet add package Nnrp.Transport.Tcp --prerelease
dotnet add package Nnrp.Transport.Quic --prerelease
```

Install `Nnrp.Transport.Tcp` or `Nnrp.Transport.Quic` only when that transport is allowed in the
deployment. A server package should not hide transport artifacts inside its role package.

## Managed Helpers

If you are writing protocol tests, conformance adapters, or a custom framed transport integration,
install the managed entry packages explicitly:

```powershell
dotnet add package Nnrp.Client --prerelease
dotnet add package Nnrp.Server --prerelease
dotnet add package Nnrp.Core --prerelease
```

Use this path when you need C# session helpers over an existing `INnrpMessageTransport`; use the
native bridge for production host integration.

## Unity Project

If you are integrating from Unity, do not install the SDK through NuGet.

The recommended path is to install it through OpenUPM:

```bash
openupm add com.nnrp.client
```

Package page: <https://openupm.com/packages/com.nnrp.client/>

If you do not want to use the OpenUPM CLI, update `Packages/manifest.json` directly:

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
		"com.nnrp.client": "<current-preview-version>"
	}
}
```

GitHub Release assets are still published by CI, but they are a fallback distribution path rather
than the recommended Unity installation flow.
