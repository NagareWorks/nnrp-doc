# Rust — Client (Preview3)

> **This page describes the planned runtime API for Preview3. The protocol core, FFI ABI surface, and conformance fixtures exist; `NnrpClient` and `NnrpClientSession` are not implemented yet.**

---

## Planned API

### `NnrpClientConfig`

```rust
pub struct NnrpClientConfig {
    pub max_views: u32,
    pub enable_cache: bool,
    pub max_cache_entries: u32,
    pub max_cache_bytes: u64,
    pub transport_policy: TransportPolicy,
    pub loss_tolerance: LossTolerance,
    pub connect_timeout: Duration,
    pub idle_timeout: Duration,
}

impl Default for NnrpClientConfig { ... }
```

### `NnrpClient`

```rust
pub struct NnrpClient { /* private */ }

impl NnrpClient {
    pub async fn connect_tcp(host: &str, port: u16, config: NnrpClientConfig) -> Result<Self, NnrpError>;
    pub async fn connect_quic(host: &str, port: u16, config: NnrpClientConfig) -> Result<Self, NnrpError>;
    pub async fn open_session(&self) -> Result<NnrpClientSession, NnrpError>;
}
```

### `NnrpClientSession`

```rust
pub struct NnrpClientSession { /* private */ }

impl NnrpClientSession {
    pub async fn submit(&self, request: NnrpSubmitRequest) -> Result<NnrpResult, NnrpError>;
    pub async fn submit_nowait(&self, request: NnrpSubmitRequest) -> Result<(), NnrpError>;
    pub async fn await_result(&self, frame_id: u32) -> Result<NnrpResult, NnrpError>;
    pub async fn cancel_frame(&self, frame_id: u32) -> Result<(), NnrpError>;
    pub async fn patch_session(&self, patch: SessionPatch) -> Result<SessionPatchAck, NnrpError>;
    pub async fn close(self) -> Result<(), NnrpError>;
}
```

### `NnrpSubmitRequest`

```rust
pub struct NnrpSubmitRequest {
    pub frame_id: u32,
    pub tile_ids: Vec<u16>,
    pub sections: Vec<NnrpTensorSection>,
    pub typed_payloads: Vec<NnrpTypedPayload>,
    pub input_profile: InputProfile,
    pub submit_mode: SubmitMode,
    pub budget_policy: BudgetPolicy,
    pub inference_budget_ms: u32,
    pub deadline_ms: u64,
}
```

### `NnrpResult`

```rust
pub struct NnrpResult {
    pub frame_id: u32,
    pub result_class: ResultClass,
    pub result_flags: ResultFlags,
    pub inference_ms: u32,
    pub server_total_ms: u32,
    pub sections: Vec<NnrpTensorSection>,
    pub typed_payloads: Vec<NnrpTypedPayload>,
}
```

---

## Preview3 Checklist

- [ ] `NnrpClientConfig` and `NnrpClient::connect_tcp/quic`
- [ ] `NnrpClientSession::submit` / `await_result`
- [ ] `NnrpClientSession::cancel_frame`
- [ ] `NnrpClientSession::patch_session`
- [ ] FFI bindings exposed via `nnrp-ffi`
- [ ] Conformance tests in `nnrp-conformance`

The Rust implementation tracks this work in `nnrp-rs/doc/todo/v1-preview3/06-client-server-runtime.md`.

---

## Typical Use Cases (Preview3 Plan)

### Full connect-and-render loop

```rust
// Expected Preview3 usage
use nnrp_core::{NnrpClient, NnrpClientConfig, NnrpSubmitRequest};
use nnrp_core::{InputProfile, BudgetPolicy, ResultClass, TransportPolicy};

let config = NnrpClientConfig {
    transport_policy: TransportPolicy::PreferQuic,
    ..Default::default()
};

// TCP connect (for QUIC use NnrpClient::connect_quic with a TLS config)
let mut session = NnrpClient::connect_tcp("render.example.com:4433", config).await?;

for frame_id in 0u32.. {
    let result = session.submit(NnrpSubmitRequest {
        frame_id,
        input_profile: InputProfile::ChangedTilesLuma,
        budget_policy: BudgetPolicy::ALLOW_PARTIAL,
        sections: capture_delta(),
        ..Default::default()
    }).await?;
    if result.result_class == ResultClass::Complete {
        display(&result.sections);
    }
}
session.close().await?;
```

---

## Common Pitfalls

::: warning
1. **`NnrpClientSession` does not yet have a `Drop` auto-close.** In Preview3 call `session.close().await` explicitly, or the server detects an abnormal disconnect.

2. **Do not retry timed-out frames with the same `frame_id`.** Use a fresh ID to avoid duplicate-frame server errors.

3. **Concurrent `submit()` calls are unspecified.** Until Preview3 is stable, either submit sequentially or wrap with `Mutex`.
:::
