# Rust — Client (Preview3)

`nnrp-runtime` now exposes the Preview3 TCP client API. The client owns transport setup, sends `SESSION_OPEN`, submits operations, receives result / drop / flow-update events, and closes the session explicitly.

## Dependencies

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

Builder methods:

| Method | Description |
|---|---|
| `with_transport(RuntimeTransportKind)` | Select TCP or the QUIC slot used by an external provider |
| `with_cache_hints(impl Into<Vec<CacheObjectKind>>)` | Declare cache object kinds the client expects to use |
| `with_resume(u32)` | Enable recovery semantics and set resume token length |

Defaults use TCP, the standard token profile/schema, `Balanced` priority, `default_deadline_ms = 500`, `max_in_flight_operations = 4`, and `lease_ttl_hint_ms = 30000`.

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

`connect_tcp` uses the built-in `TcpTransport`. `connect_quic` currently validates configuration and returns `UnsupportedTransport` because the Rust SDK does not freeze a TLS / QUIC provider in the public layer. To plug in QUIC, implement `FramedTransport` in the provider and inject it through `from_transport` or `from_boxed_transport`.

## Transport Slot

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

`from_transport` verifies that `transport.transport_kind()` matches `NnrpClientConfig.transport`, preventing accidental TCP/QUIC slot mismatches.

## Provider Registry

```rust
use nnrp_core::TransportId;
use nnrp_transport_provider::{
    ProbeSample, RemoteTransportSupport, TransportPolicy, TransportProviderRegistry,
};
use nnrp_transport_tcp::TcpProvider;

let registry = TransportProviderRegistry::new().with_provider(TcpProvider::descriptor());
let remote = RemoteTransportSupport::new([TransportId::Tcp]);
let selection = registry.select(&remote, TransportPolicy::ForceTcp)?;
assert_eq!(selection.selected.transport_id, TransportId::Tcp);
```

When multiple paths are viable, pass measured probe samples into the score selector:

```rust
use nnrp_transport_provider::select_transport_with_probe;

let samples = [
    ProbeSample::success(TransportId::Tcp, TcpProvider::NAME, 20_000, 4_800, 1024, 1024),
    ProbeSample::success(TransportId::Tcp, TcpProvider::NAME, 20_000, 5_100, 1024, 1024),
];
let probed = select_transport_with_probe(
    registry.providers(),
    &remote,
    TransportPolicy::PreferTcp,
    &samples,
)?;
assert_eq!(probed.selected.transport_id, TransportId::Tcp);
```

`nnrp-transport-provider` owns the local provider list, native library detection, policy selection, probe sample scoring, and rejected-candidate diagnostics. Scoring combines RTT, timeout/failure rate, effective throughput, and local policy; providers with missing samples or all failed probes appear in rejected candidates with structured reasons. `nnrp-transport-tcp` is the standalone TCP provider package; the QUIC provider will use the same registry and slot contract.

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

## Results and Events

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

`await_result` only accepts `RESULT_PUSH`; if the server returns `RESULT_DROP` or `FLOW_UPDATE`, it reports `UnexpectedMessage`. Use `await_event` for a full event loop.

## Example

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

## Common Pitfalls

::: warning
1. **`open_session(self)` consumes the client.** The Preview3 runtime currently uses the minimal model of one transport bound to one session.
2. **`submit` does not automatically wait for a result.** It returns the assigned `frame_id`; consume output with `await_result` or `await_event`.
3. **Prefer `close()` for normal shutdown.** Call `close_transport()` only on exceptional paths or in tests.
:::
