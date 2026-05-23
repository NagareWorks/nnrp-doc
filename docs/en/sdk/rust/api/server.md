# Rust — Server (Preview3)

`nnrp-runtime` now exposes the Preview3 TCP server API. The server listens, receives `SESSION_OPEN`, validates profile/schema/resume state, then receives submit, sends result/drop/flow update, and handles patch, migrate, and close on the session.

## `NnrpServerConfig`

```rust
pub struct NnrpServerConfig {
    pub transport: RuntimeTransportKind,
    pub supported_profiles: Vec<u16>,
    pub supported_cache_objects: Vec<CacheObjectKind>,
    pub max_cache_objects: usize,
    pub max_cache_object_bytes: u32,
    pub schema_registry: SchemaRegistry,
    pub resume_token_bytes: u32,
    pub max_in_flight_operations: u16,
    pub granted_operation_credit: u16,
    pub lease_ttl_ms: u32,
    pub resume_window_ms: u32,
    pub application_policy: Arc<dyn NnrpServerPolicy>,
}
```

Builder methods:

| Method | Description |
|---|---|
| `with_transport(RuntimeTransportKind)` | Select TCP or the QUIC slot used by an external provider |
| `with_supported_profiles(impl Into<Vec<u16>>)` | Set accepted profiles |
| `with_supported_cache_objects(impl Into<Vec<CacheObjectKind>>)` | Set accepted cache object kinds |
| `with_cache_limits(usize, u32)` | Set cache object count and per-object byte limits |
| `with_schema_registry(SchemaRegistry)` | Replace the schema registry |
| `with_resume_token_bytes(u32)` | Set resume token length |
| `with_application_policy(P)` | Attach application-level session-open validation |

Defaults use TCP, the standard token profile, the Preview3 standard schema registry, `max_in_flight_operations = 4`, `granted_operation_credit = 2`, `lease_ttl_ms = 30000`, and `resume_window_ms = 120000`.

## Application Policy

```rust
pub trait NnrpServerPolicy: Send + Sync {
    fn validate_session_open(&self, open: &SessionOpenMetadata) -> Result<(), u32>;
}

pub struct AllowAllServerPolicy;
```

Returning `Err(session_error_code)` rejects `SESSION_OPEN`.

## `NnrpServer`

```rust
impl NnrpServer {
    pub async fn bind_tcp(
        addr: impl tokio::net::ToSocketAddrs,
        config: NnrpServerConfig,
    ) -> Result<Self, RuntimeError>;

    pub async fn bind_quic(
        endpoint: &str,
        config: NnrpServerConfig,
    ) -> Result<Self, RuntimeError>;

    pub fn from_listener<L>(
        listener: L,
        config: NnrpServerConfig,
    ) -> Result<Self, RuntimeError>
    where
        L: FramedListener + 'static;

    pub fn from_boxed_listener(
        listener: BoxedFramedListener,
        config: NnrpServerConfig,
    ) -> Result<Self, RuntimeError>;

    pub fn local_addr(&self) -> Result<std::net::SocketAddr, RuntimeError>;
    pub fn session_count(&self) -> Result<usize, RuntimeError>;
    pub async fn accept(&self) -> Result<NnrpServerSession, RuntimeError>;
}
```

`bind_tcp` uses the built-in `TcpFramedListener`. `bind_quic` currently reserves the public API slot and returns `UnsupportedTransport`. To plug in QUIC, implement `FramedListener` in the provider and inject it through `from_listener` or `from_boxed_listener`.

## Listener Slot

```rust
pub trait FramedListener: Send + Sync {
    fn transport_kind(&self) -> RuntimeTransportKind;
    fn local_addr(&self) -> Result<std::net::SocketAddr, RuntimeError>;
    async fn accept(&self) -> Result<BoxedFramedTransport, RuntimeError>;
}

pub type BoxedFramedListener = Box<dyn FramedListener>;

pub struct TcpFramedListener { /* private */ }
```

`from_listener` verifies that `listener.transport_kind()` matches `NnrpServerConfig.transport`. `accept` returns a boxed `FramedTransport`, so server sessions are no longer tied to the concrete TCP type.

## `NnrpServerSession`

```rust
impl NnrpServerSession {
    pub fn session_id(&self) -> u32;
    pub fn client_open(&self) -> &SessionOpenMetadata;
    pub fn lifecycle(&self) -> &ConnectionLifecycle;
    pub fn operations(&self) -> &OperationRegistry;
    pub fn cache_object_count(&self) -> usize;

    pub async fn receive_submit(&mut self) -> Result<NnrpSubmit, RuntimeError>;
    pub async fn send_result(
        &mut self,
        frame_id: u32,
        metadata: ResultPushMetadata,
        body: Vec<u8>,
    ) -> Result<(), RuntimeError>;
    pub async fn send_result_drop(&mut self, frame_id: u32) -> Result<(), RuntimeError>;
    pub async fn receive_cancel(&mut self) -> Result<NnrpCancel, RuntimeError>;
    pub fn track_cache_object(&mut self, object_id: CacheObjectId) -> Result<(), RuntimeError>;
    pub async fn receive_patch(&mut self) -> Result<SessionPatchMetadata, RuntimeError>;
    pub async fn send_patch_ack(&mut self, ack: SessionPatchAckMetadata) -> Result<(), RuntimeError>;
    pub async fn send_flow_update(&mut self, metadata: FlowUpdateMetadata) -> Result<(), RuntimeError>;
    pub async fn receive_migrate(&mut self) -> Result<NnrpMigration, RuntimeError>;
    pub async fn send_migrate_ack(
        &mut self,
        request: &SessionMigrateMetadata,
        ack: SessionMigrateAckMetadata,
    ) -> Result<(), RuntimeError>;
    pub async fn receive_close(&mut self) -> Result<SessionCloseMetadata, RuntimeError>;
    pub async fn ack_close(&mut self, close: &SessionCloseMetadata) -> Result<(), RuntimeError>;
    pub async fn close(self) -> Result<(), RuntimeError>;
}
```

## Data Types

```rust
pub struct NnrpSubmit {
    pub frame_id: u32,
    pub metadata: FrameSubmitMetadata,
    pub body: Vec<u8>,
}

pub struct NnrpCancel {
    pub frame_id: u32,
}

pub struct NnrpMigration {
    pub metadata: SessionMigrateMetadata,
}
```

`RuntimeSessionRecord` stores server runtime session state: `session_id`, profile/schema, resume state, token length, and last operation id.

## Example

```rust
use nnrp_core::ResultPushMetadata;
use nnrp_runtime::{NnrpServer, NnrpServerConfig};

let server = NnrpServer::bind_tcp("127.0.0.1:4433", NnrpServerConfig::default()).await?;

loop {
    let mut session = server.accept().await?;
    tokio::spawn(async move {
        let submit = session.receive_submit().await?;
        let output = run_model(submit.body).await;
        session
            .send_result(submit.frame_id, ResultPushMetadata::default(), output)
            .await?;

        let close = session.receive_close().await?;
        session.ack_close(&close).await?;
        session.close().await
    });
}
```

## Common Pitfalls

::: warning
1. **Timed-out frames must receive `send_result_drop`.** Silently skipping them leaves clients blocked while waiting for a result.
2. **`receive_*` calls read sequentially.** If your application needs to handle cancel, patch, migrate, and submit concurrently, build an explicit event loop above this API.
3. **Do not block the tokio runtime with synchronous inference.** CPU/GPU blocking calls should run in a dedicated thread pool or `spawn_blocking`.
:::
