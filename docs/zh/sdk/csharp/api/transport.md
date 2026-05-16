# C# — 传输层

传输层接口定义在 `Nnrp.Transport` 命名空间，`Nnrp.Core` 包内附带 TCP 传输实现。

## 导入

```csharp
using Nnrp.Transport;
```

---

## 传输接口

### `INnrpMessageTransport`

传输层顶级接口，抽象 NNRP 消息的发送与接收。

```csharp
public interface INnrpMessageTransport : IAsyncDisposable
{
    bool IsConnected { get; }

    // 发送一个完整消息帧
    ValueTask SendAsync(
        NnrpFramedMessage message,
        CancellationToken cancellationToken = default);

    // 接收下一个完整消息帧
    ValueTask<NnrpFramedMessage> ReceiveAsync(
        CancellationToken cancellationToken = default);

    // 关闭连接（发送 CLOSE 并等待对端确认）
    Task CloseAsync(CancellationToken cancellationToken = default);
}
```

### `INnrpMessageSender`

仅发送方向的接口（用于只写场景）。

```csharp
public interface INnrpMessageSender
{
    ValueTask SendAsync(
        NnrpFramedMessage message,
        CancellationToken cancellationToken = default);
}
```

### `INnrpMessageReceiver`

仅接收方向的接口（用于只读场景）。

```csharp
public interface INnrpMessageReceiver
{
    ValueTask<NnrpFramedMessage> ReceiveAsync(
        CancellationToken cancellationToken = default);
}
```

---

## TCP 传输实现

### `NnrpTcpMessageTransport`

基于 `System.Net.Sockets` 的 TCP 传输实现（`sealed class`）。

使用长度前缀帧（4 字节小端 uint32 总帧长 + 40 字节 NNRP 包头 + 元数据 + 包体）提供可靠有序传输。

```csharp
public sealed class NnrpTcpMessageTransport : INnrpMessageTransport
{
    // 服务端：绑定并监听指定端口
    public NnrpTcpMessageTransport(int port, NnrpTcpServerOptions? options = null);

    // 客户端：连接到远端
    public static Task<NnrpTcpMessageTransport> ConnectAsync(
        string host,
        int port,
        NnrpTcpClientOptions? options = null,
        CancellationToken cancellationToken = default);

    // 接受下一个入连接（服务端模式）
    public Task<NnrpTcpMessageTransport> AcceptAsync(
        CancellationToken cancellationToken = default);

    public bool IsConnected { get; }

    public ValueTask SendAsync(NnrpFramedMessage message, CancellationToken cancellationToken = default);
    public ValueTask<NnrpFramedMessage> ReceiveAsync(CancellationToken cancellationToken = default);
    public Task CloseAsync(CancellationToken cancellationToken = default);
    public ValueTask DisposeAsync();
}
```

### `NnrpTcpClientOptions`

TCP 客户端连接选项。

```csharp
public sealed class NnrpTcpClientOptions
{
    public TimeSpan ConnectTimeout { get; set; } = TimeSpan.FromSeconds(10);
    public TimeSpan IdleTimeout { get; set; } = TimeSpan.FromSeconds(30);
    public int MaxFrameSize { get; set; } = 32 * 1024 * 1024;
    public bool NoDelay { get; set; } = true;
}
```

### `NnrpTcpServerOptions`

TCP 服务端监听选项。

```csharp
public sealed class NnrpTcpServerOptions
{
    public int Backlog { get; set; } = 128;
    public TimeSpan IdleTimeout { get; set; } = TimeSpan.FromSeconds(30);
    public int MaxFrameSize { get; set; } = 32 * 1024 * 1024;
    public bool NoDelay { get; set; } = true;
}
```

---

## QUIC 传输（Preview3）

QUIC 传输实现计划在 Preview3 发布，将作为独立包 `Nnrp.Transport.Quic` 提供，依赖 `System.Net.Quic`（.NET 7+）。

```csharp
// Preview3 计划接口（尚未发布）
// using Nnrp.Transport.Quic;
//
// var transport = await NnrpQuicMessageTransport.ConnectAsync(
//     host: "127.0.0.1",
//     port: 4433,
//     options: new NnrpQuicClientOptions { AlpnProtocol = "nnrp/1" });
```

---

## 自定义传输

实现 `INnrpMessageTransport` 接口即可接入自定义传输层（如 WebSocket、共享内存等）：

```csharp
public sealed class MyCustomTransport : INnrpMessageTransport
{
    public bool IsConnected { get; private set; } = true;

    public async ValueTask SendAsync(NnrpFramedMessage message, CancellationToken ct)
    {
        // 自定义发送逻辑
        var bytes = SerializeFrame(message);
        await _stream.WriteAsync(bytes, ct);
    }

    public async ValueTask<NnrpFramedMessage> ReceiveAsync(CancellationToken ct)
    {
        // 自定义接收逻辑
        var bytes = await _stream.ReadFrameAsync(ct);
        return DeserializeFrame(bytes);
    }

    public async Task CloseAsync(CancellationToken ct) { /* ... */ }
    public async ValueTask DisposeAsync() { /* ... */ }
}
```

---

## 典型使用场景

### QUIC 客户端接入

```csharp
var quicConfig = new NnrpQuicClientConfiguration
{
    CertificateAuthority = X509Certificate2.CreateFromPemFile("ca.pem"),
    IdleTimeout          = TimeSpan.FromSeconds(30),
};
var transport = new NnrpQuicTransport(quicConfig);
var client = new NnrpClient(transport, profile);
await using var session = await client.ConnectAsync("render.example.com", 4433);
```

### TCP 备用传输

```csharp
var tcpConfig = new NnrpTcpClientConfiguration
{
    ConnectTimeout = TimeSpan.FromSeconds(5),
    IdleTimeout    = TimeSpan.FromSeconds(60),
};
var transport = new NnrpTcpTransport(tcpConfig);
```

### 自定义传输适配器（实现 `INnrpTransport`）

```csharp
public class MyWebSocketTransport : INnrpTransport
{
    public async Task SendAsync(ReadOnlyMemory<byte> frame, CancellationToken ct)
        => await _ws.SendAsync(frame, WebSocketMessageType.Binary, true, ct);

    public async Task<ReadOnlyMemory<byte>> ReceiveAsync(CancellationToken ct)
    {
        var result = await _ws.ReceiveAsync(_buffer, ct);
        return _buffer.AsMemory(0, result.Count);
    }
}
```

---

## 常见坑点

::: warning
1. **QUIC 需要正确的 ALPN**：默认为 `nnrp/1`。不要硬编码字符串，使用 `NnrpQuicClientConfiguration.DefaultAlpn`。

2. **`NnrpQuicClientConfiguration.SkipCertificateValidation = true` 只用于本地开发**；生产和 CI 环境必须配置 CA 证书。

3. **TCP 不支持 Datagram 操作**（如路径探测）；调用这些方法会抛出 `NnrpUnsupportedOperationException`。

4. **`await using var transport`**：`NnrpQuicTransport` / `NnrpTcpTransport` 实现 `IAsyncDisposable`，忘记 dispose 会泄漏底层套接字。
:::
