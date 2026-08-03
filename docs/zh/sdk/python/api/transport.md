# Python — 传输与 Provider

Preview4 Python SDK 有两个 transport 层级：

1. **Native transport provider**：生产 host API 使用的 Rust-backed provider。当前 wheel 可以携带 `tcp`、`quic`、`ipc`、`websocket` 四类 transport-scoped artifact。
2. **Packet transport adapter**：`nnrp.adapters` 下的 Python TCP/QUIC packet helper，用于 smoke、诊断和自定义 transport，不是 preview4 native hot path。

## 导入

Native provider：

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

Packet adapter：

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

## Native Transport Provider

Preview4 native artifact 按 transport 粒度发布。安装包里只有某个 provider 时，选择逻辑直接使用它；安装多个 provider 时，`auto` / `probe` 策略再做选择。

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

| API | 说明 |
|---|---|
| `discover_native_transport_providers(root=None, native_platform=None)` | 扫描当前 platform wheel 中的 provider artifacts。 |
| `select_native_transport_provider(...)` | 使用显式 readiness 与 probe observation 选择；返回 `NativeTransportSelection`，或抛出携带完整 candidates 的 `NativeTransportSelectionError`。 |
| `resolve_native_transport_provider(name, root=None, native_platform=None)` | 返回指定 `NativeTransportProvider`。 |
| `diagnose_nnrp_endpoint_support(endpoint, ...)` | 诊断应用侧 `nnrp://` / `nnrps://` endpoint。 |
| `diagnose_native_transport_endpoint_support(endpoint, ...)` | 诊断 provider-local endpoint。 |
| `native_transport_slot_names(mask)` | 将 native capability bitmask 映射为 `tcp`、`quic`、`ipc`、`websocket` 名称。 |

| Endpoint 层级 | 示例 | 用途 |
|---|---|---|
| 应用侧 endpoint | `nnrp://runtime.example/session/default`、`nnrps://runtime.example/session/default` | 推荐暴露给用户和配置文件。 |
| Provider-local endpoint | `unix:///tmp/nnrp.sock`、`npipe://./pipe/nnrp`、`ws://host/nnrp`、`wss://host/nnrp` | 诊断、conformance fixture 或显式 provider override。 |

`NativeTransportProvider` 会报告 artifact path、manifest path、transport slot、enabled features、platform tag 与
下面精确冻结的元数据。它不是配置开关；每个 provider 都由对应 Rust artifact 拥有实际 transport 行为。

| Python 类型 | 冻结字段 |
|---|---|
| `NativeTransportProviderCost` | `model_id: int`、`units: int` |
| `NativeTransportProviderLimits` | `max_frame_bytes: int` |
| `NativeTransportProviderLimitation` | `REQUIRES_UDP`、`REQUIRES_TCP`、`LOCAL_HOST_ONLY`、`NATIVE_HOST_ONLY`、`BROWSER_HOST_ONLY`、`UNIX_DOMAIN_SOCKET`、`WINDOWS_NAMED_PIPE` |
| `NativeTransportProviderMetadata` | `id`、`cost`、`preference_rank`、`limits`、`limitations` |
| `NativeTransportProvider` | `name`、`artifact_path`、`manifest_path`、`transport_slots`、`enabled_features`、`package`、`transport_scope`、`platform_tag`、`metadata` |
| `NativeTransportCandidateReadiness` | `transport_id`、`provider_id`、`route_resolved`、`security_satisfied`、`diagnostic` |
| `NativeTransportProbeState` | `NOT_RUN`、`SUCCEEDED`、`FAILED`、`MISSING` |
| `NativeTransportProbeMetrics` | `sample_count`、`success_count`、`median_throughput_bytes_per_sec`、`median_rtt_us` |
| `NativeTransportProbeObservation` | `transport_id`、`provider_id`、`state`、`metrics`、`diagnostic`；state 只能是 `SUCCEEDED` 或 `FAILED` |
| `NativeTransportRejectionReason` | `POLICY_DISALLOWED`、`LOCAL_UNAVAILABLE`、`PEER_UNSUPPORTED`、`LIMIT_EXCEEDED`、`ROUTE_UNRESOLVED`、`SECURITY_UNSATISFIED`、`PROBE_MISSING`、`PROBE_FAILED` |
| `NativeTransportCandidateDiagnostic` | `transport_name`、`provider`、`local_available`、`peer_supported`、`within_limits`、`probe_state`、`probe`、`selection_rank`、`rejection_reason`、`diagnostic` |
| `NativeTransportSelection` | `selected_provider`、有序 `candidates`、`policy`、`diagnostic` |
| `NativeTransportSelectionError` | `code`、可选 `policy`、有效 selection 失败时的完整有序 `candidates` 与 `diagnostic`；`INVALID_EVIDENCE` 在 selection 前抛出 |

Python 通过上述类型化模型公开 cost 与 limitations，必须校验官方 Rust artifact 里的冻结 provider 对象，
并使用公共确定性 comparator。

`select_native_transport_provider` 接收 `candidate_readiness` 与可选 `probe_observations`。Evidence 按
`(transport_id, provider_id)` 匹配；重复、无法匹配或不完整的 readiness 都会被拒绝。缺少 probe observation
表示 `MISSING`，失败 observation 不得退化成缺少 metrics。原始 `NativeTransportProbeSample` 继续供 probe 与
conformance 代码使用，并在进入 selection 前聚合。

Discovery 必须拒绝重复 transport ID 与重复 provider metadata ID，不能依赖目录顺序静默选择其中一个。

## Native Transport Binding

### 角色 Runtime 接管

| Endpoint 层级 | 接受形式 | 用途 |
|---|---|---|
| 应用 endpoint | `nnrp://`、`nnrps://` | 常规 client/server 配置与 Provider 选择。 |
| Provider-local locator | TCP/QUIC authority、`unix://`、`npipe://`、`ws://`、`wss://` | 单条 client/server provider route 内的 locator。 |

生产 host API 不会在 `NativeTransportConnection` 与 native runtime 之间暴露 Python packet pump。
`connect_native_client_connection(...)` 选择并打开一个 provider carrier，然后把该 carrier 移交给同一个
transport-scoped Rust library 内的角色 runtime。native server bind/accept 使用相同的 listener 所有权
规则。移交后，session handshake、submit/result、control 与 object/cache frame、event decode 和 close
都在 Rust 内执行。

raw transport handle 保持私有。移交成功会使 packet-level connection/listener wrapper 失效，由角色
connection/server 成为唯一所有者；移交失败时 packet-level object 保持打开，以便确定性清理。即使独立
packet loopback 成功，只要 provider 不能完成角色接管，它就不是有效的生产 provider。

`NativeTransportBinding.connect()` 与 `.listen()` 仍是 packet-level 诊断、conformance 和自定义 carrier
API。它们不能支撑逻辑-only native client；没有 carrier-backed role session 时，Python SDK 不得合成
result 或 runtime event。

`load_native_transport_binding()` 加载指定 provider 自己拥有的 Rust artifact，并返回面向 host 的执行面。
FFI 边界一次传递一批有序的完整 NNRP packet，不向用户暴露 socket chunk 或裸 native handle。

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

artifact 必须声明请求的 provider slot。artifact 缺失、ABI symbol 缺失或 slot 不匹配都会抛出
`NativeArtifactError`；此 API 不会回退到 Python socket 实现。

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

不可用 binding 会保留准确的 Provider 元数据，并以 `local-unavailable` 参与选择；它绝不能被
probe、connect、listen 或用于 role adoption（角色接管）。显式注册表由此可以保留“已知但未安装”的第三方 Provider ID，
而不伪造可执行实现。不可用 binding 的 `diagnostic` 必须非空；从 artifact 加载的 binding 返回
`local_available=True` 和 `diagnostic=None`。

sample count、payload size、packet limit 或 timeout 传 `0` 时使用 Rust ABI 默认值。provider 会拒绝属于其他
provider 的 endpoint locator。

### 安全配置类型

| 类型 | 冻结字段 |
|---|---|
| `NativeTransportClientSecurity` | `server_name: str`、`trusted_certificate_der: bytes` |
| `NativeTransportServerSecurity` | `certificate_der: bytes`、`private_key_pkcs8_der: bytes` |

为 TCP 提供匹配的 security 会启用 TLS；QUIC 与 native `wss://` 必须提供对应 security。明文 TCP、IPC 与
`ws://` 使用 `None`，且这些明文 route 不满足 `nnrps://` 应用 endpoint。security 始终按 route 与角色隔离。

### Provider Route 类型

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

高层 role API 的 `provider_routes` 使用
`Mapping[str, NativeClientProviderRoute]` 或 `Mapping[str, NativeServerProviderRoute]`，键只能是
规范 `tcp`、`quic`、`ipc` 或 `websocket`。它们不接受 role-wide 单数 `provider_endpoint` 或
`security`。Client Auto/Prefer 必须在 candidate 诊断中保留无法解析的 route；server Auto/Prefer 原子
打开全部允许的已安装 provider route。

两个 role API 还接受 `transports: Sequence[NativeTransportBinding] | None`。`None` 自动发现
已安装的官方 binding；显式序列具有决定性、禁止重复 transport kind 和 Provider ID，且不会再补入
发现结果。可用 binding 负责 probe/connect/listen 和 role adoption；不可用 binding 只保留已知
Provider 身份与诊断，绝不会被调用。route 仍只是 Provider 局部配置。

应用安全意图必须在 probe 或 bind 前过滤。Native TCP TLS、QUIC TLS 与 WSS 可以满足 `nnrps://`；已解析的
明文 TCP、IPC 与 WS route 以 `security-unsatisfied` 留在诊断中。缺少 client locator 时以优先级更高的
`route-unresolved` 留在诊断中；否则 eligible 的 server provider 缺少 locator 时必须让原子 listen 失败。

### Connection 与 Listener

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

`send()` 保留 packet 顺序；`receive()` 返回完整序列化 NNRP packet，并在返回前释放 Rust-owned batch buffer。
两个 close 方法都幂等。可能阻塞的 carrier 操作不会占用 Python event-loop 线程。

## Transport Artifact 边界

| Provider | Native artifact | Python packet adapter |
|---|---|---|
| `tcp` | 是 | `nnrp.adapters.tcp` 可用于 smoke/custom transport |
| `quic` | 是 | `nnrp.adapters.quic` 可用于 smoke/custom transport |
| `ipc` | 是 | 无 Python packet adapter |
| `websocket` | 是 | 无 Python packet adapter；WebSocket binary frame helper 在 [运行时控制与对象](./runtime) |

生产代码需要打开 runtime session 时，向 `connect_native_client_connection(options)` 传入单个
`NativeClientOptions`。只有协议测试、诊断工具或自定义 transport 才直接使用下面的 packet adapter。

---

## 常量

| 名称                | 值         | 说明                  |
| ------------------- | ---------- | --------------------- |
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

| 异常                            | 说明              |
| ------------------------------- | ----------------- |
| `NnrpQuicError`                 | QUIC 传输基础异常 |
| `NnrpQuicConnectionClosedError` | 连接已关闭        |
| `NnrpQuicProtocolError`         | QUIC 协议层错误   |

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

| 异常                               | 说明                               |
| ---------------------------------- | ---------------------------------- |
| `NnrpTcpError`                     | TCP 传输基础异常                   |
| `NnrpTcpConnectionClosedError`     | 连接已关闭                         |
| `NnrpTcpProtocolError`             | 协议层错误（帧格式非法等）         |
| `NnrpTcpUnsupportedOperationError` | 不支持的操作（TCP 无 Datagram 等） |

### `NnrpTcpClientConfiguration`

TCP 客户端配置（`@dataclass`）。

| 字段              | 类型         | 默认值               | 说明                    |
| ----------------- | ------------ | -------------------- | ----------------------- |
| `wire_format`     | `WireFormat` | `WireFormat.CURRENT` | 线路格式                |
| `connect_timeout` | `float`      | `10.0`               | 连接超时（秒）          |
| `idle_timeout`    | `float`      | `30.0`               | 空闲超时（秒）          |
| `max_frame_size`  | `int`        | `33554432`           | 单帧最大字节数（32 MB） |

### `NnrpTcpServerConfiguration`

TCP 服务端配置（`@dataclass`）。

| 字段             | 类型         | 默认值               | 说明                    |
| ---------------- | ------------ | -------------------- | ----------------------- |
| `wire_format`    | `WireFormat` | `WireFormat.CURRENT` | 线路格式                |
| `idle_timeout`   | `float`      | `30.0`               | 空闲超时（秒）          |
| `max_frame_size` | `int`        | `33554432`           | 单帧最大字节数（32 MB） |

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

| 场景                      | 推荐                        |
| ------------------------- | --------------------------- |
| 生产环境、低延迟神经渲染  | QUIC（支持 Datagram 0-RTT） |
| 企业内网、TCP Only 防火墙 | TCP                         |
| 开发 / 测试环境           | TCP（无需证书，配置简单）   |
| 多路径迁移                | QUIC（首选）+ TCP（备用）   |

---

## 典型使用场景

### 场景一：QUIC 客户端快速接入

```python
import ssl
from nnrp.adapters.quic import create_quic_client_configuration, connect_quic
from nnrp.client import ClientProfile, connect_client_control
from nnrp import TransportId

# 生产环境：验证服务端证书
quic_cfg = create_quic_client_configuration(
    cafile="/etc/nnrp/ca-bundle.pem",   # CA 证书
    idle_timeout=30.0,
)

# 开发环境：跳过证书验证（仅限本地）
dev_cfg = create_quic_client_configuration(
    verify_mode=ssl.CERT_NONE,
)

async with connect_client_control(
    "render.example.com",
    quic_port=4433,
    quic_configuration=quic_cfg,
    client_profile=ClientProfile(),
    selected_transport_id=TransportId.QUIC,
) as bootstrap:
    session = bootstrap.session
```

### 场景二：TCP 备用传输

适合部署在不支持 UDP 的网络（如某些企业代理）。TCP 传输与 QUIC 在 API 上完全对称。

```python
from nnrp.adapters.tcp import (
    NnrpTcpClientConfiguration, connect_tcp,
)
from nnrp import WireFormat

tcp_cfg = NnrpTcpClientConfiguration(
    wire_format=WireFormat.CURRENT,
    connect_timeout=5.0,
    idle_timeout=60.0,
)
connection = await connect_tcp("render.example.com", 4434, tcp_cfg)
# 直接用底层 connection，或通过 connect_client_control 选择传输
```

### 场景三：服务端同时监听 QUIC 和 TCP

```python
import asyncio
from nnrp.adapters.quic import create_quic_server_configuration, serve_quic
from nnrp.adapters.tcp import NnrpTcpServerConfiguration, serve_tcp
from nnrp.server import ServerProfile, accept_server_session

quic_cfg = create_quic_server_configuration("cert.pem", "key.pem")
tcp_cfg = NnrpTcpServerConfiguration()
profile = ServerProfile()

async def accept_loop(listener):
    while True:
        session = await accept_server_session(listener, server_profile=profile)
        asyncio.create_task(handle_session(session))

async def main():
    async with (
        serve_quic("0.0.0.0", 4433, quic_cfg) as quic_listener,
        serve_tcp("0.0.0.0", 4434, tcp_cfg) as tcp_listener,
    ):
        await asyncio.gather(
            accept_loop(quic_listener),
            accept_loop(tcp_listener),
        )
```

---

## 常见坑点

::: warning

1. **QUIC 需要正确的 ALPN 协议名**：默认为 `nnrp/1`（通过 `NNRP_CURRENT_ALPN`
   常量获取）。若服务端和客户端使用的 ALPN 不一致，握手会被 TLS 层拒绝，报错为
   `SSL handshake failed` 而非 NNRP 协议错误。不要手动拼写 ALPN 字符串，始终用
   `alpn_for_wire_format(WireFormat.CURRENT)`。

2. **`verify_mode=ssl.CERT_NONE`
   只用于本地开发**：它跳过所有证书验证，中间人攻击无法被检测。CI/staging 环境应使用自签名 CA
   证书（`cafile` 参数），而非禁用验证。

3. **TCP 传输不支持 Datagram 消息类型**（如 `TRANSPORT_PROBE`）；若客户端发起探测，会抛出
   `NnrpTcpUnsupportedOperationError`，调用方需捕获并降级处理。

4. **`serve_quic` / `serve_tcp` 是异步上下文管理器，退出时会关闭监听器但不会关闭已建立的
   Session**；若需优雅关闭所有会话，应在 `__aexit__` 前先 cancel 所有 `handle_session` 任务并 await
   其完成。

5. **`idle_timeout` 参数在 QUIC 和 TCP 侧独立计时**：若客户端 QUIC 端设为 30 秒，服务端设为 10
   秒，服务端会先超时关闭连接，客户端收到的是 `ConnectionResetError` 而非 NNRP
   协议关闭帧。两端超时应保持一致，或服务端略大于客户端。 :::
