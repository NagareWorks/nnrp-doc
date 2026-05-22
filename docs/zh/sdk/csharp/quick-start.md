# C# 快速使用

根据宿主类型不同，C# SDK 的获取方式也不同。

## 选择安装方式

NNRP 文档按最终稳定线 `1.0.0` 组织。预览开发阶段，安装命令应固定到当前预览包，避免误读为已经发布稳定包；当前 C# 预览包线是 `1.0.0-preview.2`。

### 普通 .NET Client 项目

如果你在做普通 .NET client 项目，直接从 NuGet 安装客户端包：

```powershell
dotnet add package Nnrp.Client --version 1.0.0-preview.2
```

这条路径适合需要托管 client 会话辅助能力和 C# client API 的集成方式。

### 普通 .NET Server 项目

如果你在做普通 .NET server 项目，直接从 NuGet 安装服务端包：

```powershell
dotnet add package Nnrp.Server --version 1.0.0-preview.2
```

这条路径适合服务端会话辅助能力和协议侧 server 集成。

### Unity 项目

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

GitHub Release asset 仍然会继续发布，但它现在是备用分发方式，而不是推荐的 Unity 安装路径。

## 说明

1. 对普通 .NET 应用来说，`Nnrp.Client` 和 `Nnrp.Server` 是主要入口包。
2. 如果你需要更底层的传输层或 wire 级控制，也可以按需使用 `Nnrp.Core`、`Nnrp.Transport.Tcp`、`Nnrp.NativeBridge` 等包。
3. 当前 Unity 包已经收录到 OpenUPM，推荐使用 OpenUPM CLI 或直接修改 `Packages/manifest.json` 完成安装。
