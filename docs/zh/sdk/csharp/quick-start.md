# C# 快速使用

根据宿主类型不同，C# SDK 的获取方式也不同。

## 选择安装方式

### 普通 .NET Client 项目

如果你在做普通 .NET client 项目，直接从 NuGet 安装客户端包：

```powershell
dotnet add package Nnrp.Client
```

这条路径适合需要托管 client 会话辅助能力和 C# client API 的集成方式。

### 普通 .NET Server 项目

如果你在做普通 .NET server 项目，直接从 NuGet 安装服务端包：

```powershell
dotnet add package Nnrp.Server
```

这条路径适合服务端会话辅助能力和协议侧 server 集成。

### Unity 项目

如果你在 Unity 中接入，不要通过 NuGet 安装 SDK。

正确方式是：

1. 打开 `NagareWorks/nnrp-cs` 的最新 GitHub Release。
2. 找到名为 `com.nnrp.client-<version>.zip` 的 release asset。
3. 下载这个 zip，并将其作为该版本的 Unity 风格包进行导入或解压使用。

这个 Unity 包由 CI 自动产出，是当前 Unity 侧包布局的分发方式。

## 说明

1. 对普通 .NET 应用来说，`Nnrp.Client` 和 `Nnrp.Server` 是主要入口包。
2. 如果你需要更底层的传输层或 wire 级控制，也可以按需使用 `Nnrp.Core`、`Nnrp.Transport.Tcp`、`Nnrp.NativeBridge` 等包。
3. 当前 Unity 包通过 GitHub Release asset 分发，还不是公开 UPM registry 包。