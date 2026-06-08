# Python — Transport Adapters

Transport adapters wrap the underlying QUIC and TCP connections. All types are exported from
`nnrp.adapters` and also accessible via the top-level `nnrp` namespace.

QUIC is provided as a transport slot through `aioquic`; it is not required for every deployment. TCP
remains the recommended local development path when certificate handling or QUIC support is
unavailable.

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

| Name                | Value      | Description                  |
| ------------------- | ---------- | ---------------------------- |
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

| Exception                       | Description                   |
| ------------------------------- | ----------------------------- |
| `NnrpQuicError`                 | Base QUIC transport exception |
| `NnrpQuicConnectionClosedError` | Connection closed             |
| `NnrpQuicProtocolError`         | QUIC protocol-level error     |

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

TCP transport uses length-prefixed framing for reliable ordered delivery, suitable for networks
where QUIC is unavailable.

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

| Exception                          | Description                  |
| ---------------------------------- | ---------------------------- |
| `NnrpTcpError`                     | Base TCP transport exception |
| `NnrpTcpConnectionClosedError`     | Connection closed            |
| `NnrpTcpProtocolError`             | Protocol-level error         |
| `NnrpTcpUnsupportedOperationError` | Unsupported operation        |

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

| Scenario                                 | Recommendation                  |
| ---------------------------------------- | ------------------------------- |
| Production, low-latency neural rendering | QUIC (Datagram, 0-RTT support)  |
| Enterprise intranet, TCP-only firewall   | TCP                             |
| Development / testing                    | TCP (no certificate required)   |
| Multi-path migration                     | QUIC (primary) + TCP (fallback) |

---

## Typical Use Cases

### Case 1: QUIC Client Quick Start

```python
import ssl
from nnrp.adapters.quic import create_quic_client_configuration, connect_quic
from nnrp.client import ClientProfile, connect_client_control
from nnrp import TransportId

# Production: verify server certificate
quic_cfg = create_quic_client_configuration(
    cafile="/etc/nnrp/ca-bundle.pem",
    idle_timeout=30.0,
)

# Development only: skip verification
dev_cfg = create_quic_client_configuration(verify_mode=ssl.CERT_NONE)

async with connect_client_control(
    "render.example.com",
    quic_port=4433,
    quic_configuration=quic_cfg,
    client_profile=ClientProfile(),
    selected_transport_id=TransportId.QUIC,
) as bootstrap:
    session = bootstrap.session
```

### Case 2: TCP Fallback Transport

```python
from nnrp.adapters.tcp import NnrpTcpClientConfiguration, connect_tcp
from nnrp import WireFormat

tcp_cfg = NnrpTcpClientConfiguration(
    wire_format=WireFormat.CURRENT,
    connect_timeout=5.0,
    idle_timeout=60.0,
)
connection = await connect_tcp("render.example.com", 4434, tcp_cfg)
```

### Case 3: Dual-Protocol Server (QUIC + TCP)

```python
import asyncio
from nnrp.adapters.quic import create_quic_server_configuration, serve_quic
from nnrp.adapters.tcp import NnrpTcpServerConfiguration, serve_tcp
from nnrp.server import ServerProfile, accept_server_session

async def accept_loop(listener):
    while True:
        session = await accept_server_session(listener, server_profile=ServerProfile())
        asyncio.create_task(handle_session(session))

async def main():
    async with (
        serve_quic("0.0.0.0", 4433, create_quic_server_configuration("c.pem", "k.pem")) as ql,
        serve_tcp("0.0.0.0", 4434, NnrpTcpServerConfiguration()) as tl,
    ):
        await asyncio.gather(accept_loop(ql), accept_loop(tl))
```

---

## Common Pitfalls

::: warning

1. **QUIC requires the correct ALPN protocol name.** Default is `nnrp/1` (via `NNRP_CURRENT_ALPN`).
   Mismatched ALPN between client and server causes a TLS-layer rejection, reported as
   `SSL handshake failed`. Always use `alpn_for_wire_format(WireFormat.CURRENT)` instead of
   hardcoding the string.

2. **`verify_mode=ssl.CERT_NONE` is for local development only.** CI/staging should use a
   self-signed CA (`cafile` parameter), not disabled verification.

3. **TCP transport does not support Datagram message types** (e.g., `TRANSPORT_PROBE`). These raise
   `NnrpTcpUnsupportedOperationError`; callers must catch and degrade gracefully.

4. **`serve_quic` / `serve_tcp` do not close established sessions on exit.** Cancel and await all
   `handle_session` tasks before leaving the context manager for a graceful shutdown.

5. **`idle_timeout` is configured independently on client and server.** If the server timeout is
   shorter than the client's, the server closes first, and the client receives a
   `ConnectionResetError` instead of a clean NNRP close frame. Keep timeouts consistent. :::
