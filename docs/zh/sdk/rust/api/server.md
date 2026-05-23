# Rust — 服务端（Preview3）

`nnrp-runtime` 已经暴露 Preview3 TCP 服务端 API。服务端负责监听、接收 `SESSION_OPEN`、执行 profile/schema/resume 校验，随后在 session 上接收 submit、返回 result/drop/flow update，并处理 patch、migrate、close。

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

Builder 方法：

| 方法 | 说明 |
|---|---|
| `with_transport(RuntimeTransportKind)` | 选择 TCP 或 QUIC provider 对应的 runtime slot |
| `with_supported_profiles(impl Into<Vec<u16>>)` | 设置允许的 profile |
| `with_supported_cache_objects(impl Into<Vec<CacheObjectKind>>)` | 设置允许的缓存对象 kind |
| `with_cache_limits(usize, u32)` | 设置缓存对象数量和单对象大小上限 |
| `with_schema_registry(SchemaRegistry)` | 替换 schema registry |
| `with_resume_token_bytes(u32)` | 设置恢复 token 字节数 |
| `with_application_policy(P)` | 接入应用层 session open 校验 |

默认配置使用 TCP、标准 token profile、Preview3 标准 schema registry、`max_in_flight_operations = 4`、`granted_operation_credit = 2`、`lease_ttl_ms = 30000`、`resume_window_ms = 120000`。

## 应用层策略

```rust
pub trait NnrpServerPolicy: Send + Sync {
    fn validate_session_open(&self, open: &SessionOpenMetadata) -> Result<(), u32>;
}

pub struct AllowAllServerPolicy;
```

策略返回 `Err(session_error_code)` 时，服务端会拒绝 `SESSION_OPEN`。

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

`bind_tcp` 使用 runtime 内置的 `TcpFramedListener`。`nnrp-runtime::NnrpServer::bind_quic` 仍只保留抽象 API 位置；开箱 QUIC listener 由独立包 `nnrp-transport-quic` 提供。

```rust
use nnrp_runtime::{NnrpServerConfig, RuntimeTransportKind};
use nnrp_transport_quic::{QuicProvider, QuicServerEndpointConfig};

let bind_addr = "127.0.0.1:4433".parse()?;
let (endpoint_config, certificate) =
    QuicServerEndpointConfig::self_signed_localhost(bind_addr)?;
let config = NnrpServerConfig::default().with_transport(RuntimeTransportKind::Quic);
let server = QuicProvider::bind(endpoint_config, config).await?;
```

生产环境通常传入正式证书链和 PKCS#8 私钥；测试或本地 bring-up 可使用 `self_signed_localhost` 并把返回的 `certificate.certificate_der` 配给客户端信任根。平台 QUIC、native addon 或 WASM-facing 后端仍可实现 `FramedListener`，再通过 `from_listener` / `from_boxed_listener` 注入。

## Listener slot

```rust
pub trait FramedListener: Send + Sync {
    fn transport_kind(&self) -> RuntimeTransportKind;
    fn local_addr(&self) -> Result<std::net::SocketAddr, RuntimeError>;
    async fn accept(&self) -> Result<BoxedFramedTransport, RuntimeError>;
}

pub type BoxedFramedListener = Box<dyn FramedListener>;

pub struct TcpFramedListener { /* private */ }
```

`from_listener` 会校验 `listener.transport_kind()` 必须等于 `NnrpServerConfig.transport`。`accept` 返回 boxed `FramedTransport`，所以 server session 不再绑定具体 TCP 类型。

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

## 数据结构

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

`RuntimeSessionRecord` 记录服务端 runtime 中的 session 状态：`session_id`、profile/schema、resume 状态、token 字节数和最后 operation id。

## 示例

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

## 常见坑点

::: warning
1. **超时帧必须发送 `send_result_drop`。** 默默跳过会让客户端等待结果时卡住。
2. **`receive_*` 是顺序读取。** 如果你的应用需要同时处理 cancel、patch、migrate 和 submit，需要在上层设计明确的事件循环。
3. **同步推理不要直接阻塞 tokio runtime。** CPU/GPU 阻塞式调用应放到专用线程池或 `spawn_blocking`。
:::
