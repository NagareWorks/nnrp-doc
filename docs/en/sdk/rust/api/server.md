# Rust — Server (Preview3)

> **This page describes the planned runtime API for Preview3. The protocol core, FFI ABI surface, and conformance fixtures exist; `NnrpServer` and `NnrpServerSession` are not implemented yet.**

---

## Planned API

### `NnrpServerConfig`

```rust
pub struct NnrpServerConfig {
    pub max_concurrent_frames: u32,
    pub enable_cache: bool,
    pub max_sections: u32,
    pub max_body_bytes: u32,
    pub model_name: String,
    pub idle_timeout: Duration,
}

impl Default for NnrpServerConfig { ... }
```

### `NnrpServer`

```rust
pub struct NnrpServer { /* private */ }

impl NnrpServer {
    pub async fn bind_tcp(host: &str, port: u16, config: NnrpServerConfig) -> Result<Self, NnrpError>;
    pub async fn bind_quic(host: &str, port: u16, config: NnrpServerConfig, tls: TlsConfig) -> Result<Self, NnrpError>;

    /// Accept next client connection (with default allow-all auth)
    pub async fn accept(&self) -> Result<NnrpServerSession, NnrpError>;

    /// Accept with auth validator; returns Err if validator returns false
    pub async fn accept_with_auth<F>(&self, auth_fn: F) -> Result<NnrpServerSession, NnrpError>
    where
        F: Fn(&[u8]) -> bool;
}
```

### `NnrpServerSession`

```rust
pub struct NnrpServerSession { /* private */ }

impl NnrpServerSession {
    pub fn session_id(&self) -> u32;
    pub fn client_hello(&self) -> &ClientHelloMetadata;

    pub async fn receive_submit(&self) -> Result<NnrpFrameSubmit, NnrpError>;
    pub async fn send_result(&self, result: NnrpServerResult) -> Result<(), NnrpError>;
    pub async fn send_result_drop(&self, frame_id: u32) -> Result<(), NnrpError>;
    pub async fn send_flow_update(&self, update: FlowUpdate) -> Result<(), NnrpError>;
    pub async fn close(self) -> Result<(), NnrpError>;
}
```

### `NnrpFrameSubmit`

```rust
pub struct NnrpFrameSubmit {
    pub frame_id: u32,
    pub session_id: u32,
    pub input_profile: InputProfile,
    pub budget_policy: BudgetPolicy,
    pub inference_budget_ms: u32,
    pub deadline_ms: u64,
    pub sections: Vec<NnrpTensorSection>,
    pub typed_payloads: Vec<NnrpTypedPayload>,
}
```

### `NnrpServerResult`

```rust
pub struct NnrpServerResult {
    pub frame_id: u32,
    pub result_class: ResultClass,
    pub result_flags: ResultFlags,
    pub applied_budget_policy: BudgetPolicy,
    pub inference_ms: u32,
    pub queue_ms: u32,
    pub server_total_ms: u32,
    pub status_code: u32,
    pub sections: Vec<NnrpTensorSection>,
    pub typed_payloads: Vec<NnrpTypedPayload>,
}
```

---

## Example

```rust
use nnrp::server::{NnrpServer, NnrpServerConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = NnrpServerConfig {
        max_concurrent_frames: 4,
        enable_cache: true,
        ..Default::default()
    };

    let server = NnrpServer::bind_tcp("0.0.0.0", 4433, config).await?;

    loop {
        let session = server.accept_with_auth(|auth| validate_auth(auth)).await?;

        tokio::spawn(async move {
            loop {
                let submit = session.receive_submit().await?;
                let result = run_inference(&submit);
                session.send_result(result).await?;
            }
            Ok::<_, Box<dyn std::error::Error>>(())
        });
    }
}
```

---

## Preview3 Checklist

- [ ] `NnrpServerConfig` and `NnrpServer::bind_tcp/quic`
- [ ] `NnrpServerSession::receive_submit`
- [ ] `NnrpServerSession::send_result` / `send_result_drop`
- [ ] `NnrpServerSession::send_flow_update`
- [ ] FFI bindings for server exposed via `nnrp-ffi`
- [ ] Server conformance tests in `nnrp-conformance`

The Rust implementation tracks this work in `nnrp-rs/doc/todo/v1-preview3/06-client-server-runtime.md`.

---

## Typical Use Cases (Preview3 Plan)

### Full server accept loop

```rust
// Expected Preview3 usage
use nnrp_server::{NnrpServer, NnrpServerConfig};
use nnrp_core::{ResultClass, NnrpServerResult};

let config = NnrpServerConfig::builder()
    .bind("0.0.0.0:4433")
    .transport(TransportPolicy::PreferQuic)
    .max_concurrent_frames(8)
    .build()?;

let server = NnrpServer::bind(config).await?;
while let Ok(mut session) = server.accept().await {
    tokio::spawn(async move {
        while let Ok(submit) = session.receive_submit().await {
            let sections = run_inference(&submit.sections).await;
            session.send_result(NnrpServerResult {
                frame_id: submit.frame_id,
                sections,
                result_class: ResultClass::Complete,
                ..Default::default()
            }).await?;
        }
        Ok::<_, Box<dyn std::error::Error>>(())
    });
}
```

### Backpressure signaling

```rust
if queue_len > MAX_QUEUE {
    session.send_result_drop(submit.frame_id).await?;
    session.send_flow_update(NnrpFlowUpdate {
        flags: FlowUpdateFlags::CREDIT_VALID,
        credit: 0, // pause client sends
        ..Default::default()
    }).await?;
}
```

---

## Common Pitfalls

::: warning
1. **Timed-out frames must receive `send_result_drop`.** Silently skipping them leaves the client's `submit().await` hanging forever.

2. **Authentication is not built-in.** Implement it in the application layer before Preview3 ships a middleware API.

3. **Do not block inside `tokio::spawn`.** Wrap synchronous inference in `tokio::task::spawn_blocking`; blocking the async runtime causes PING timeouts.
:::
