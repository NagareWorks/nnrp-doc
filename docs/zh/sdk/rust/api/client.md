# Rust — 客户端（Preview3）

`nnrp-runtime` 已经暴露 Preview3 TCP 客户端 API。客户端负责建立 transport、发送 `SESSION_OPEN`、提交 operation、接收 result / drop / flow update，并显式关闭 session。

## 依赖

```toml
[dependencies]
nnrp-core = "1.0.0-preview.2"
nnrp-runtime = "1.0.0-preview.2"
tokio = { version = "1", features = ["macros", "rt-multi-thread", "net", "io-util"] }
```

## `NnrpClientConfig`

```rust
pub struct NnrpClientConfig {
    pub transport: RuntimeTransportKind,
    pub requested_session_id: u32,
    pub profile_id: u16,
    pub schema_id: u32,
    pub schema_version: u32,
    pub priority_class: SessionPriorityClass,
    pub default_deadline_ms: u32,
    pub max_in_flight_operations: u16,
    pub lease_ttl_hint_ms: u32,
    pub allow_resume: bool,
    pub resume_token_bytes: u32,
    pub cache_hints: Vec<CacheObjectKind>,
}
```

Builder 方法：

| 方法 | 说明 |
|---|---|
| `with_transport(RuntimeTransportKind)` | 选择 TCP 或外部 provider 对应的 QUIC slot |
| `with_cache_hints(impl Into<Vec<CacheObjectKind>>)` | 声明客户端希望使用的缓存对象 kind |
| `with_resume(u32)` | 打开恢复语义并设置 resume token 字节数 |

默认值使用 TCP、标准 token profile/schema、`Balanced` priority、`default_deadline_ms = 500`、`max_in_flight_operations = 4`、`lease_ttl_hint_ms = 30000`。

## `NnrpClient`

```rust
impl NnrpClient {
    pub async fn connect_tcp(
        addr: impl tokio::net::ToSocketAddrs,
        config: NnrpClientConfig,
    ) -> Result<Self, RuntimeError>;

    pub async fn connect_quic(
        endpoint: &str,
        config: NnrpClientConfig,
    ) -> Result<Self, RuntimeError>;

    pub fn from_transport<T>(
        transport: T,
        config: NnrpClientConfig,
    ) -> Result<Self, RuntimeError>
    where
        T: FramedTransport + 'static;

    pub fn from_boxed_transport(
        transport: BoxedFramedTransport,
        config: NnrpClientConfig,
    ) -> Result<Self, RuntimeError>;

    pub async fn open_session(self) -> Result<NnrpClientSession, RuntimeError>;
}
```

`connect_tcp` 使用内置 `TcpTransport`。`connect_quic` 当前只校验配置并返回 `UnsupportedTransport`，因为 Rust SDK 不在公共层冻结 TLS / QUIC provider。要接入 QUIC，provider 实现 `FramedTransport` 后通过 `from_transport` 或 `from_boxed_transport` 注入。

## Transport slot

```rust
pub enum RuntimeTransportKind {
    Tcp,
    Quic,
}

pub trait FramedTransport: Send {
    fn transport_kind(&self) -> RuntimeTransportKind;
    async fn read_packet(&mut self) -> Result<RuntimePacket, RuntimeError>;
    async fn write_packet(&mut self, packet: &RuntimePacket) -> Result<(), RuntimeError>;
    async fn close(&mut self) -> Result<(), RuntimeError>;
}

pub type BoxedFramedTransport = Box<dyn FramedTransport>;
```

`from_transport` 会校验 `transport.transport_kind()` 必须等于 `NnrpClientConfig.transport`，避免 TCP/QUIC slot 被错误绑定。

## Provider registry

```rust
use nnrp_core::TransportId;
use nnrp_transport_provider::{
    RemoteTransportSupport, TransportPolicy, TransportProviderRegistry,
};
use nnrp_transport_tcp::TcpProvider;

let registry = TransportProviderRegistry::new().with_provider(TcpProvider::descriptor());
let remote = RemoteTransportSupport::new([TransportId::Tcp]);
let selection = registry.select(&remote, TransportPolicy::ForceTcp)?;
assert_eq!(selection.selected.transport_id, TransportId::Tcp);
```

`nnrp-transport-provider` 负责本地 provider 列表、native library 探测、策略选择和被拒候选诊断。`nnrp-transport-tcp` 是独立 TCP provider 包；QUIC provider 会沿用同一个 registry 和 slot contract。

## `NnrpClientSession`

```rust
impl NnrpClientSession {
    pub fn session_id(&self) -> u32;
    pub fn lifecycle(&self) -> &ConnectionLifecycle;

    pub async fn submit(
        &mut self,
        metadata: FrameSubmitMetadata,
        body: Vec<u8>,
    ) -> Result<u32, RuntimeError>;

    pub async fn submit_nowait(
        &mut self,
        metadata: FrameSubmitMetadata,
        body: Vec<u8>,
    ) -> Result<u32, RuntimeError>;

    pub async fn await_result(&mut self) -> Result<NnrpResult, RuntimeError>;
    pub async fn await_event(&mut self) -> Result<NnrpClientEvent, RuntimeError>;
    pub async fn cancel_frame(&mut self, frame_id: u32) -> Result<(), RuntimeError>;
    pub async fn patch_session(
        &mut self,
        patch: SessionPatchMetadata,
    ) -> Result<SessionPatchAckMetadata, RuntimeError>;
    pub async fn migrate_transport(
        &mut self,
        request: SessionMigrateMetadata,
    ) -> Result<SessionMigrateAckMetadata, RuntimeError>;
    pub fn build_migration_request(
        &self,
        new_transport_id: TransportId,
        last_result_frame_id: u64,
        client_migrate_ts_us: u64,
    ) -> SessionMigrateMetadata;
    pub async fn close(self) -> Result<(), RuntimeError>;
    pub async fn close_with(
        &mut self,
        close: SessionCloseMetadata,
    ) -> Result<SessionCloseAckMetadata, RuntimeError>;
    pub async fn close_transport(self) -> Result<(), RuntimeError>;
}
```

## 结果与事件

```rust
pub struct NnrpResult {
    pub frame_id: u32,
    pub metadata: ResultPushMetadata,
    pub body: Vec<u8>,
}

pub enum NnrpClientEvent {
    Result(NnrpResult),
    ResultDrop { frame_id: u32 },
    FlowUpdate(FlowUpdateMetadata),
}
```

`await_result` 只接受 `RESULT_PUSH`；如果服务端返回 `RESULT_DROP` 或 `FLOW_UPDATE`，会报 `UnexpectedMessage`。需要完整事件循环时使用 `await_event`。

## 示例

```rust
use nnrp_core::FrameSubmitMetadata;
use nnrp_runtime::{NnrpClient, NnrpClientConfig, RuntimeTransportKind};

let config = NnrpClientConfig::default().with_transport(RuntimeTransportKind::Tcp);
let client = NnrpClient::connect_tcp("127.0.0.1:4433", config).await?;
let mut session = client.open_session().await?;

let frame_id = session
    .submit(FrameSubmitMetadata::default(), b"delta".to_vec())
    .await?;

match session.await_event().await? {
    nnrp_runtime::NnrpClientEvent::Result(result) => {
        assert_eq!(result.frame_id, frame_id);
    }
    nnrp_runtime::NnrpClientEvent::ResultDrop { frame_id } => {
        eprintln!("frame dropped: {frame_id}");
    }
    nnrp_runtime::NnrpClientEvent::FlowUpdate(update) => {
        eprintln!("flow update: {:?}", update);
    }
}

session.close().await?;
```

## 常见坑点

::: warning
1. **`open_session(self)` 会消费 client。** Preview3 runtime 当前是一条 transport 绑定一个 session 的最小模型。
2. **`submit` 不会自动等待结果。** 它返回分配出的 `frame_id`，结果需要通过 `await_result` 或 `await_event` 消费。
3. **关闭时优先使用 `close()`。** 只有在异常路径或测试场景中才直接调用 `close_transport()`。
:::
