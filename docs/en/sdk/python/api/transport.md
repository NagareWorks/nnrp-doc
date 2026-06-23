# Python — Transport & Providers

Preview4 Python has two transport layers:

1. **Native transport providers**: Rust-backed providers used by production host APIs. Wheels can carry `tcp`, `quic`, `ipc`, and `websocket` transport-scoped artifacts.
2. **Packet transport adapters**: Python TCP/QUIC packet helpers under `nnrp.adapters`, used for smoke tests, diagnostics, and custom transports. They are not the preview4 native hot path.

## Import

Native provider:

```python
from nnrp import (
    diagnose_native_transport_endpoint_support,
    diagnose_nnrp_endpoint_support,
    discover_native_transport_providers,
    native_transport_slot_names,
    resolve_native_transport_provider,
    select_native_transport_provider,
)
```

Packet adapter:

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

## Native Transport Providers

Preview4 native artifacts are published per transport. If an installation contains one provider, selection uses it directly; if several providers are installed, `auto` / `probe` policies choose among them.

```python
from nnrp import discover_native_transport_providers, select_native_transport_provider

providers = discover_native_transport_providers()
selection = select_native_transport_provider("auto")

print([provider.name for provider in providers])
print(selection.selected_transport_name, selection.diagnostic)
```

| API | Description |
|---|---|
| `discover_native_transport_providers(root=None, native_platform=None)` | Scans provider artifacts in the current platform wheel. |
| `select_native_transport_provider(policy_or_name="auto", root=None, native_platform=None)` | Returns `NativeTransportSelection` with selected provider, rejected providers, and diagnostics. |
| `resolve_native_transport_provider(name, root=None, native_platform=None)` | Returns one `NativeTransportProvider`. |
| `diagnose_nnrp_endpoint_support(endpoint, ...)` | Diagnoses application-facing `nnrp://` / `nnrps://` endpoints. |
| `diagnose_native_transport_endpoint_support(endpoint, ...)` | Diagnoses provider-local endpoints. |
| `native_transport_slot_names(mask)` | Maps a native capability bitmask to `tcp`, `quic`, `ipc`, and `websocket` names. |

| Endpoint layer | Examples | Use |
|---|---|---|
| Application endpoint | `nnrp://runtime.example/session/default`, `nnrps://runtime.example/session/default` | Preferred for users and config files. |
| Provider-local endpoint | `unix:///tmp/nnrp.sock`, `npipe://./pipe/nnrp`, `ws://host/nnrp`, `wss://host/nnrp` | Diagnostics, conformance fixtures, or explicit provider overrides. |

`NativeTransportProvider` reports artifact path, manifest path, transport slots, enabled features, platform tag, cost/preference hints, and limitations. It is not a configuration switch; each provider is backed by the Rust artifact that owns the actual transport behavior.

## Transport Artifact Boundary

| Provider | Native artifact | Python packet adapter |
|---|---|---|
| `tcp` | Yes | `nnrp.adapters.tcp` can be used for smoke/custom transport |
| `quic` | Yes | `nnrp.adapters.quic` can be used for smoke/custom transport |
| `ipc` | Yes | No Python packet adapter |
| `websocket` | Yes | No Python packet adapter; WebSocket binary frame helpers live in [Runtime Control & Objects](./runtime) |

When production code needs runtime sessions, prefer `connect_native_client_connection(require_native=True, transport=...)`. Use the packet adapters below only for protocol tests, diagnostic tooling, or custom transports.

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
