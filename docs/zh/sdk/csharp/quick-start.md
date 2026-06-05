# C# 快速使用

如果希望获得和 Python、JavaScript binding 一致的 Rust 热路径，C# SDK 的 Preview3 推荐入口是
native bridge 加显式 transport 包。托管 client/server 包仍然可用于测试、诊断和自定义 framed
transport，但普通应用集成不再把它们当作默认热路径。

## 环境要求

1. .NET 6 或更新版本应用运行时。
2. 兼容 `netstandard2.1` 的项目。
3. 所选 transport 包内 native artifact 覆盖的平台。

## 后端 Client

安装 native bridge，以及允许 client 探测的 transport：

```powershell
dotnet add package Nnrp.NativeBridge --prerelease
dotnet add package Nnrp.Transport.Tcp --prerelease
dotnet add package Nnrp.Transport.Quic --prerelease
```

Bridge 会探测已安装 provider，并根据 transport policy 选择 active path。QUIC 可用不等于一定走
QUIC；最终选择的是在策略、peer capability 和评分约束下得分最高的 provider。

## 后端 Server

Server 使用同一组 native bridge 与 transport 包：

```powershell
dotnet add package Nnrp.NativeBridge --prerelease
dotnet add package Nnrp.Transport.Tcp --prerelease
dotnet add package Nnrp.Transport.Quic --prerelease
```

部署允许哪个 transport，就安装哪个 transport 包。Server role package 不应把 transport artifact
隐藏打进自己包内。

## 托管 Helper

如果你在写协议测试、conformance adapter，或者需要接入自定义 framed transport，再显式安装托管入口包：

```powershell
dotnet add package Nnrp.Client --prerelease
dotnet add package Nnrp.Server --prerelease
dotnet add package Nnrp.Core --prerelease
```

这条路径适合在已有 `INnrpMessageTransport` 上使用 C# session helper；生产宿主集成优先使用
native bridge。

## Unity 项目

如果你在 Unity 中接入，不要通过 NuGet 安装 SDK。

推荐方式是通过 OpenUPM 安装：

```bash
openupm add com.nnrp.client
```

包页面：<https://openupm.com/packages/com.nnrp.client/>

如果你不使用 OpenUPM CLI，也可以直接修改 Unity 项目的 `Packages/manifest.json`：

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

GitHub Release asset 仍然会继续发布，但它是备用分发方式，而不是推荐的 Unity 安装路径。
