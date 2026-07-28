# Python — Transport & Providers

Preview4 Python has two transport layers:

1. **Native transport providers**: Rust-backed providers used by production host APIs. Wheels can carry `tcp`, `quic`, `ipc`, and `websocket` transport-scoped artifacts.
2. **Packet transport adapters**: Python TCP/QUIC packet helpers under `nnrp.adapters`, used for smoke tests, diagnostics, and custom transports. They are not the preview4 native hot path.

## Import

Native provider:

```python
from nnrp import (
    NativeTransportClientSecurity,
    NativeTransportServerSecurity,
    diagnose_native_transport_endpoint_support,
    diagnose_nnrp_endpoint_support,
    discover_native_transport_providers,
    native_transport_slot_names,
    load_native_transport_binding,
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
from nnrp import (
    NativeTransportCandidateReadiness,
    discover_native_transport_providers,
    select_native_transport_provider,
)

providers = discover_native_transport_providers()
selection = select_native_transport_provider(
    "auto",
    candidate_readiness=[
        NativeTransportCandidateReadiness.ready(provider)
        for provider in providers
    ],
)

print([provider.name for provider in providers])
print(selection.selected_transport_name, selection.diagnostic)
```

| API | Description |
|---|---|
| `discover_native_transport_providers(root=None, native_platform=None)` | Scans provider artifacts in the current platform wheel. |
| `select_native_transport_provider(...)` | Selects with explicit readiness and probe observations; returns `NativeTransportSelection` or raises `NativeTransportSelectionError` with complete candidates. |
| `resolve_native_transport_provider(name, root=None, native_platform=None)` | Returns one `NativeTransportProvider`. |
| `diagnose_nnrp_endpoint_support(endpoint, ...)` | Diagnoses application-facing `nnrp://` / `nnrps://` endpoints. |
| `diagnose_native_transport_endpoint_support(endpoint, ...)` | Diagnoses provider-local endpoints. |
| `native_transport_slot_names(mask)` | Maps a native capability bitmask to `tcp`, `quic`, `ipc`, and `websocket` names. |

| Endpoint layer | Examples | Use |
|---|---|---|
| Application endpoint | `nnrp://runtime.example/session/default`, `nnrps://runtime.example/session/default` | Preferred for users and config files. |
| Provider-local endpoint | `unix:///tmp/nnrp.sock`, `npipe://./pipe/nnrp`, `ws://host/nnrp`, `wss://host/nnrp` | Diagnostics, conformance fixtures, or explicit provider overrides. |

`NativeTransportProvider` reports artifact path, manifest path, transport slots, enabled features, platform tag, and
the exact metadata below. It is not a configuration switch; each provider is backed by the Rust artifact that owns the
actual transport behavior.

| Python type | Frozen fields |
|---|---|
| `NativeTransportProviderCost` | `model_id: int`, `units: int` |
| `NativeTransportProviderLimits` | `max_frame_bytes: int` |
| `NativeTransportProviderLimitation` | `REQUIRES_UDP`, `REQUIRES_TCP`, `LOCAL_HOST_ONLY`, `NATIVE_HOST_ONLY`, `BROWSER_HOST_ONLY`, `UNIX_DOMAIN_SOCKET`, `WINDOWS_NAMED_PIPE` |
| `NativeTransportProviderMetadata` | `id`, `cost`, `preference_rank`, `limits`, `limitations` |
| `NativeTransportProvider` | `name`, `artifact_path`, `manifest_path`, `transport_slots`, `enabled_features`, `package`, `transport_scope`, `platform_tag`, `metadata` |
| `NativeTransportCandidateReadiness` | `transport_id`, `provider_id`, `route_resolved`, `security_satisfied`, `diagnostic` |
| `NativeTransportProbeState` | `NOT_RUN`, `SUCCEEDED`, `FAILED`, `MISSING` |
| `NativeTransportProbeMetrics` | `sample_count`, `success_count`, `median_throughput_bytes_per_sec`, `median_rtt_us` |
| `NativeTransportProbeObservation` | `transport_id`, `provider_id`, `state`, `metrics`, `diagnostic`; state is `SUCCEEDED` or `FAILED` |
| `NativeTransportRejectionReason` | `POLICY_DISALLOWED`, `LOCAL_UNAVAILABLE`, `PEER_UNSUPPORTED`, `LIMIT_EXCEEDED`, `ROUTE_UNRESOLVED`, `SECURITY_UNSATISFIED`, `PROBE_MISSING`, `PROBE_FAILED` |
| `NativeTransportCandidateDiagnostic` | `transport_name`, `provider`, `local_available`, `peer_supported`, `within_limits`, `probe_state`, `probe`, `selection_rank`, `rejection_reason`, `diagnostic` |
| `NativeTransportSelection` | `selected_provider`, ordered `candidates`, `policy`, `diagnostic` |
| `NativeTransportSelectionError` | `code`, optional `policy`, complete ordered `candidates` for valid selection failures, and `diagnostic`; `INVALID_EVIDENCE` is raised before selection |

Python exposes cost and limitations through the typed models above, validates the frozen provider object from the
official Rust artifact, and follows the common deterministic comparator.

`select_native_transport_provider` accepts `candidate_readiness` and optional `probe_observations`. Evidence is matched
by `(transport_id, provider_id)` and duplicate, unmatched, or incomplete readiness is rejected. The absence of a probe
observation means `MISSING`; a failed observation remains distinct from missing metrics. Raw
`NativeTransportProbeSample` values remain available to probe/conformance code and are summarized before selection.

Discovery rejects duplicate transport IDs and duplicate provider metadata IDs. It never chooses one duplicate by
directory order.

## Native Transport Binding

### Role Runtime Adoption

| Endpoint layer | Accepted forms | Purpose |
|---|---|---|
| Application endpoint | `nnrp://`, `nnrps://` | Normal client/server configuration and provider selection. |
| Provider-local locator | TCP/QUIC authority, `unix://`, `npipe://`, `ws://`, `wss://` | A locator inside one client/server provider route. |

Production host APIs do not expose a Python packet pump between `NativeTransportConnection` and the
native runtime. `connect_native_client_connection(...)` selects and opens one provider carrier, then
transfers that carrier to the role runtime in the same transport-scoped Rust library. Native server
bind/accept follows the same listener-ownership rule. Session handshake, submit/result traffic,
control and object/cache frames, event decoding, and close all run inside Rust after transfer.

Raw transport handles remain private. A successful transfer invalidates the packet-level connection
or listener wrapper and makes the role connection/server its sole owner. Failed transfer leaves the
packet-level object open for deterministic cleanup. A provider that cannot complete this transfer is
not a valid production provider even if its standalone packet loopback succeeds.

`NativeTransportBinding.connect()` and `.listen()` remain packet-level diagnostic, conformance, and
custom-carrier APIs. They do not back a logical-only native client, and the Python SDK must not
synthesize results or runtime events when no carrier-backed role session exists.

`load_native_transport_binding()` loads the Rust artifact owned by one provider and returns the host-facing execution
surface. The binding crosses FFI with ordered batches of complete NNRP packets; it does not expose socket chunks or raw
native handles.

```python
binding = load_native_transport_binding("ipc")
listener = await binding.listen("unix:///tmp/nnrp.sock")

accepting = asyncio.create_task(listener.accept(timeout_ms=10_000))
client = await binding.connect(listener.endpoint, timeout_ms=10_000)
server = await accepting

await client.send(packet.pack())
received = await server.receive(max_packets=1, timeout_ms=10_000)
```

### `load_native_transport_binding`

```python
def load_native_transport_binding(
    name: str,
    *,
    root: Path | str | None = None,
    native_platform: NativePlatform | None = None,
) -> NativeTransportBinding: ...
```

The artifact must advertise exactly the requested provider slot. Missing artifacts, missing ABI symbols, or a slot
mismatch raise `NativeArtifactError`; there is no Python socket fallback for this API.

### `NativeTransportBinding`

```python
@property
def kind(self) -> str: ...

@property
def local_available(self) -> bool: ...

@property
def diagnostic(self) -> str | None: ...

@classmethod
def unavailable(
    cls,
    provider: NativeTransportProvider,
    diagnostic: str,
) -> NativeTransportBinding: ...

async def probe(
    self,
    endpoint: str | NativeTransportEndpoint,
    *,
    security: NativeTransportClientSecurity | None = None,
    sample_count: int = 0,
    probe_payload_bytes: int = 0,
    max_packet_bytes: int = 0,
    timeout_ms: int = 0,
) -> NativeTransportProbeMetrics: ...

async def connect(
    self,
    endpoint: str | NativeTransportEndpoint,
    *,
    security: NativeTransportClientSecurity | None = None,
    max_packet_bytes: int = 0,
    timeout_ms: int = 0,
) -> NativeTransportConnection: ...

async def listen(
    self,
    endpoint: str | NativeTransportEndpoint,
    *,
    security: NativeTransportServerSecurity | None = None,
    max_packet_bytes: int = 0,
    timeout_ms: int = 0,
) -> NativeTransportListener: ...
```

An unavailable binding retains the exact provider metadata and participates in selection as
`local-unavailable`; it is never probed, connected, listened on, or used for role adoption. This preserves a known but
uninstalled third-party provider ID without inventing an executable implementation. `diagnostic` must
be non-empty for unavailable bindings. Loaded artifact bindings report `local_available=True` and
`diagnostic=None`.

`0` selects the Rust ABI default for sample count, payload size, packet limit, or timeout. A provider rejects endpoint
locators owned by a different provider.

### Security Types

| Type | Frozen fields |
|---|---|
| `NativeTransportClientSecurity` | `server_name: str`, `trusted_certificate_der: bytes` |
| `NativeTransportServerSecurity` | `certificate_der: bytes`, `private_key_pkcs8_der: bytes` |

Supplying the matching security value enables TLS on TCP and is required by QUIC and native `wss://`. Plain TCP, IPC,
and `ws://` use `None`; those plain routes do not satisfy an `nnrps://` application endpoint. Security values remain
route-local and role-specific.

### Provider Route Types

```python
@dataclass(frozen=True)
class NativeClientProviderRoute:
    provider_endpoint: str | NativeTransportEndpoint | None = None
    security: NativeTransportClientSecurity | None = None

@dataclass(frozen=True)
class NativeServerProviderRoute:
    provider_endpoint: str | NativeTransportEndpoint | None = None
    security: NativeTransportServerSecurity | None = None
```

High-level role APIs accept `provider_routes` as a `Mapping[str, NativeClientProviderRoute]` or
`Mapping[str, NativeServerProviderRoute]`, keyed by canonical `tcp`, `quic`, `ipc`, or `websocket`.
They do not accept one role-wide `provider_endpoint` or `security` value. Client Auto/Prefer keeps
unresolved routes in candidate diagnostics; server Auto/Prefer atomically opens every allowed
installed provider route.

Both role APIs also accept `transports: Sequence[NativeTransportBinding] | None`. `None` discovers
installed official bindings; an explicit sequence is authoritative, rejects duplicate transport kinds
and provider IDs, and is not supplemented by discovery. Available bindings own probe/connect/listen
and role adoption. Unavailable bindings preserve known provider identity and diagnostics without being
invoked. A route remains provider-local configuration.

Application security intent is filtered before probing or binding. Native TCP TLS, QUIC TLS, and WSS can satisfy
`nnrps://`; resolved plain TCP, IPC, and WS routes remain visible as `security-unsatisfied`. A missing client locator
remains visible as `route-unresolved`, which takes precedence over security validation; a missing locator for an
otherwise eligible server provider fails the atomic listen operation.

### Connection And Listener

```python
class NativeTransportConnection:
    kind: str
    endpoint: NativeTransportEndpoint
    connected: bool

    async def send(
        self,
        packets: bytes | bytearray | memoryview | Iterable[bytes | bytearray | memoryview],
    ) -> None: ...

    async def receive(
        self,
        *,
        max_packets: int = 0,
        max_bytes: int = 0,
        timeout_ms: int = 0,
    ) -> tuple[bytes, ...]: ...

    async def close(self) -> None: ...

class NativeTransportListener:
    kind: str
    endpoint: NativeTransportEndpoint
    listening: bool

    async def accept(self, *, timeout_ms: int = 0) -> NativeTransportConnection: ...
    async def close(self) -> None: ...
```

`send()` preserves packet order. `receive()` returns complete serialized NNRP packets and releases the Rust-owned batch
buffer before returning. Both close methods are idempotent. Blocking carrier work runs outside the Python event-loop
thread.

## Transport Artifact Boundary

| Provider | Native artifact | Python packet adapter |
|---|---|---|
| `tcp` | Yes | `nnrp.adapters.tcp` can be used for smoke/custom transport |
| `quic` | Yes | `nnrp.adapters.quic` can be used for smoke/custom transport |
| `ipc` | Yes | No Python packet adapter |
| `websocket` | Yes | No Python packet adapter; WebSocket binary frame helpers live in [Runtime Control & Objects](./runtime) |

When production code needs runtime sessions, prefer `connect_native_client_connection("nnrps://...", provider_routes=...)`. Use the packet adapters below only for protocol tests, diagnostic tooling, or custom transports.

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
