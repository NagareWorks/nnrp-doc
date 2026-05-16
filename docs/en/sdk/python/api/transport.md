# Python — Transport Adapters

Transport adapters wrap the underlying QUIC and TCP connections. All types are exported from `nnrp.adapters` and also accessible via the top-level `nnrp` namespace.

## Import

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

## Constants

| Name | Value | Description |
|---|---|---|
| `NNRP_CURRENT_ALPN` | `"nnrp/1"` | Current QUIC ALPN identifier |

---

## QUIC Transport

### `NnrpQuicConnection`

```python
async def send_packet(self, packet: NnrpPacket) -> None: ...
async def receive_packet(self, *, timeout: float | None = None) -> NnrpPacket: ...
async def receive_submit_packet(self, *, timeout: float | None = None) -> NnrpPacket: ...
async def close(self, error_code: int = 0) -> None: ...
@property
def is_closed(self) -> bool: ...
```

### `NnrpQuicListener`

```python
async def accept(self) -> NnrpQuicConnection: ...
async def close(self) -> None: ...
```

### QUIC Exceptions

| Exception | Description |
|---|---|
| `NnrpQuicError` | Base QUIC transport exception |
| `NnrpQuicConnectionClosedError` | Connection closed |
| `NnrpQuicProtocolError` | QUIC protocol-level error |

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
    Create QUIC client configuration.
    Use verify_mode=ssl.CERT_NONE for development (skip certificate verification).
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
    """certificate and private_key may be PEM file paths or PEM bytes."""
```

### `connect_quic`

```python
async def connect_quic(host: str, port: int, config: QuicConfiguration) -> NnrpQuicConnection: ...
```

### `serve_quic`

```python
@asynccontextmanager
async def serve_quic(
    host: str, port: int, config: QuicConfiguration,
) -> AsyncIterator[NnrpQuicListener]:
    """
    async with serve_quic("0.0.0.0", 4433, config) as listener:
        conn = await listener.accept()
    """
```

---

## TCP Transport

TCP transport uses length-prefixed framing for reliable ordered delivery, suitable for networks where QUIC is unavailable.

### `NnrpTcpConnection`

```python
async def send_packet(self, packet: NnrpPacket) -> None: ...
async def receive_packet(self, *, timeout: float | None = None) -> NnrpPacket: ...
async def receive_submit_packet(self, *, timeout: float | None = None) -> NnrpPacket: ...
async def close(self) -> None: ...
@property
def is_closed(self) -> bool: ...
```

### `NnrpTcpListener`

```python
async def accept(self) -> NnrpTcpConnection: ...
async def close(self) -> None: ...
```

### TCP Exceptions

| Exception | Description |
|---|---|
| `NnrpTcpError` | Base TCP transport exception |
| `NnrpTcpConnectionClosedError` | Connection closed |
| `NnrpTcpProtocolError` | Protocol-level error |
| `NnrpTcpUnsupportedOperationError` | Unsupported operation |

### `NnrpTcpClientConfiguration`

```python
@dataclass
class NnrpTcpClientConfiguration:
    wire_format: WireFormat = WireFormat.CURRENT
    connect_timeout: float = 10.0
    idle_timeout: float = 30.0
    max_frame_size: int = 33554432  # 32 MB
```

### `NnrpTcpServerConfiguration`

```python
@dataclass
class NnrpTcpServerConfiguration:
    wire_format: WireFormat = WireFormat.CURRENT
    idle_timeout: float = 30.0
    max_frame_size: int = 33554432
```

### `connect_tcp`

```python
async def connect_tcp(
    host: str, port: int, config: NnrpTcpClientConfiguration,
) -> NnrpTcpConnection: ...
```

### `serve_tcp`

```python
@asynccontextmanager
async def serve_tcp(
    host: str, port: int, config: NnrpTcpServerConfiguration,
) -> AsyncIterator[NnrpTcpListener]: ...
```

---

## QUIC vs TCP Guidance

| Scenario | Recommendation |
|---|---|
| Production, low-latency neural rendering | QUIC (Datagram, 0-RTT support) |
| Enterprise intranet, TCP-only firewall | TCP |
| Development / testing | TCP (no certificate required) |
| Multi-path migration | QUIC (primary) + TCP (fallback) |
