# Python — 传输适配器

传输适配器封装了底层 QUIC 和 TCP 连接。所有类型从 `nnrp.adapters` 导出，也可从顶层 `nnrp` 包访问。

## 导入

```python
from nnrp.adapters import (
    # QUIC
    NnrpQuicConnection, NnrpQuicListener,
    NnrpQuicError, NnrpQuicConnectionClosedError, NnrpQuicProtocolError,
    create_quic_client_configuration, create_quic_server_configuration,
    connect_quic, serve_quic, alpn_for_wire_format,
    NNRP_CURRENT_ALPN,
    # TCP
    NnrpTcpConnection, NnrpTcpListener,
    NnrpTcpError, NnrpTcpConnectionClosedError, NnrpTcpProtocolError,
    NnrpTcpUnsupportedOperationError,
    NnrpTcpClientConfiguration, NnrpTcpServerConfiguration,
    create_tcp_client_configuration, create_tcp_server_configuration,
    connect_tcp, serve_tcp,
)
```

---

## 常量

| 名称 | 值 | 说明 |
|---|---|---|
| `NNRP_CURRENT_ALPN` | `"nnrp/1"` | 当前 QUIC ALPN 标识符 |

---

## QUIC 传输

### `NnrpQuicConnection`

QUIC 连接封装，提供与 `NnrpTcpConnection` 对称的异步 API。

```python
async def send_packet(self, packet: NnrpPacket) -> None:
    """发送数据包（内部按消息类型选择 QUIC Stream 或 Datagram）。"""

async def receive_packet(self, *, timeout: float | None = None) -> NnrpPacket:
    """接收下一个数据包。"""

async def receive_submit_packet(self, *, timeout: float | None = None) -> NnrpPacket:
    """专门等待 FRAME_SUBMIT 包（服务端使用）。"""

async def close(self, error_code: int = 0) -> None:
    """关闭连接。"""

@property
def is_closed(self) -> bool: ...
```

### `NnrpQuicListener`

QUIC 监听器（服务端）。

```python
async def accept(self) -> NnrpQuicConnection:
    """等待并接受下一个入连接。"""

async def close(self) -> None: ...
```

### QUIC 异常类型

| 异常 | 说明 |
|---|---|
| `NnrpQuicError` | QUIC 传输基础异常 |
| `NnrpQuicConnectionClosedError` | 连接已关闭 |
| `NnrpQuicProtocolError` | QUIC 协议层错误 |

### `create_quic_client_configuration`

```python
def create_quic_client_configuration(
    *,
    wire_format: WireFormat = WireFormat.CURRENT,
    alpn_protocols: list[str] | None = None,
    verify_mode: int = ssl.CERT_REQUIRED,
    max_datagram_frame_size: int = 65536,
    idle_timeout: float = 30.0,
    cafile: str | None = None,
    capath: str | None = None,
    cadata: str | bytes | None = None,
) -> QuicConfiguration:
    """
    创建 QUIC 客户端配置。

    - alpn_protocols 默认为 [NNRP_CURRENT_ALPN]
    - verify_mode=ssl.CERT_NONE 可用于开发环境跳过证书验证
    """
```

### `create_quic_server_configuration`

```python
def create_quic_server_configuration(
    certificate: str | bytes,
    private_key: str | bytes,
    *,
    wire_format: WireFormat = WireFormat.CURRENT,
    alpn_protocols: list[str] | None = None,
    max_datagram_frame_size: int = 65536,
    idle_timeout: float = 30.0,
) -> QuicConfiguration:
    """
    创建 QUIC 服务端配置。

    - certificate / private_key 可为 PEM 文件路径或 PEM 字节串
    """
```

### `connect_quic`

```python
async def connect_quic(
    host: str,
    port: int,
    config: QuicConfiguration,
) -> NnrpQuicConnection:
    """连接到 QUIC 服务端，返回已建立的 NnrpQuicConnection。"""
```

### `serve_quic`

```python
@asynccontextmanager
async def serve_quic(
    host: str,
    port: int,
    config: QuicConfiguration,
) -> AsyncIterator[NnrpQuicListener]:
    """
    启动 QUIC 服务端监听（异步上下文管理器）。

    async with serve_quic("0.0.0.0", 4433, config) as listener:
        conn = await listener.accept()
    """
```

### `alpn_for_wire_format`

```python
def alpn_for_wire_format(wire_format: WireFormat) -> str:
    """返回指定线路格式对应的 ALPN 字符串。"""
```

---

## TCP 传输

TCP 传输通过长度前缀帧提供与 QUIC 对称的可靠传输，适用于不支持 QUIC 的网络环境。

### `NnrpTcpConnection`

TCP 连接封装（`asyncio` 原生实现）。

```python
async def send_packet(self, packet: NnrpPacket) -> None: ...
async def receive_packet(self, *, timeout: float | None = None) -> NnrpPacket: ...
async def receive_submit_packet(self, *, timeout: float | None = None) -> NnrpPacket: ...
async def close(self) -> None: ...

@property
def is_closed(self) -> bool: ...
```

### `NnrpTcpListener`

TCP 监听器（服务端）。

```python
async def accept(self) -> NnrpTcpConnection: ...
async def close(self) -> None: ...
```

### TCP 异常类型

| 异常 | 说明 |
|---|---|
| `NnrpTcpError` | TCP 传输基础异常 |
| `NnrpTcpConnectionClosedError` | 连接已关闭 |
| `NnrpTcpProtocolError` | 协议层错误（帧格式非法等） |
| `NnrpTcpUnsupportedOperationError` | 不支持的操作（TCP 无 Datagram 等） |

### `NnrpTcpClientConfiguration`

TCP 客户端配置（`@dataclass`）。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `wire_format` | `WireFormat` | `WireFormat.CURRENT` | 线路格式 |
| `connect_timeout` | `float` | `10.0` | 连接超时（秒） |
| `idle_timeout` | `float` | `30.0` | 空闲超时（秒） |
| `max_frame_size` | `int` | `33554432` | 单帧最大字节数（32 MB） |

### `NnrpTcpServerConfiguration`

TCP 服务端配置（`@dataclass`）。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `wire_format` | `WireFormat` | `WireFormat.CURRENT` | 线路格式 |
| `idle_timeout` | `float` | `30.0` | 空闲超时（秒） |
| `max_frame_size` | `int` | `33554432` | 单帧最大字节数（32 MB） |

### `create_tcp_client_configuration` / `create_tcp_server_configuration`

```python
def create_tcp_client_configuration(
    *,
    wire_format: WireFormat = WireFormat.CURRENT,
    connect_timeout: float = 10.0,
    idle_timeout: float = 30.0,
    max_frame_size: int = 33554432,
) -> NnrpTcpClientConfiguration: ...

def create_tcp_server_configuration(
    *,
    wire_format: WireFormat = WireFormat.CURRENT,
    idle_timeout: float = 30.0,
    max_frame_size: int = 33554432,
) -> NnrpTcpServerConfiguration: ...
```

### `connect_tcp`

```python
async def connect_tcp(
    host: str,
    port: int,
    config: NnrpTcpClientConfiguration,
) -> NnrpTcpConnection:
    """连接到 TCP 服务端，返回 NnrpTcpConnection。"""
```

### `serve_tcp`

```python
@asynccontextmanager
async def serve_tcp(
    host: str,
    port: int,
    config: NnrpTcpServerConfiguration,
) -> AsyncIterator[NnrpTcpListener]:
    """
    启动 TCP 服务端监听（异步上下文管理器）。

    async with serve_tcp("0.0.0.0", 4433, config) as listener:
        conn = await listener.accept()
    """
```

---

## QUIC vs TCP 选择建议

| 场景 | 推荐 |
|---|---|
| 生产环境、低延迟神经渲染 | QUIC（支持 Datagram 0-RTT） |
| 企业内网、TCP Only 防火墙 | TCP |
| 开发 / 测试环境 | TCP（无需证书，配置简单） |
| 多路径迁移 | QUIC（首选）+ TCP（备用） |
