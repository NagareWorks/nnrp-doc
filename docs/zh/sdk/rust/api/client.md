# Rust — 客户端（Preview3）

::: warning 规划中
本页描述的 API 计划在 Preview3 实现。当前 `nnrp-core` 0.1.0 尚未包含客户端实现。
:::

以下为规划的客户端 API 形态，供集成方提前评估和反馈。

## 规划依赖

```toml
[dependencies]
nnrp-core = "0.3"  # Preview3 版本
tokio = { version = "1", features = ["full"] }
```

---

## 规划 API

### `NnrpClientConfig`

```rust
pub struct NnrpClientConfig {
    pub max_views: u8,
    pub enable_cache: bool,
    pub max_cache_entries: usize,
    pub max_cache_bytes: usize,
    pub transport_policy: TransportPolicy,
    pub loss_tolerance: LossTolerance,
}

impl Default for NnrpClientConfig {
    fn default() -> Self { /* max_views=1, enable_cache=true, ... */ }
}
```

### `NnrpClient`

```rust
pub struct NnrpClient { /* ... */ }

impl NnrpClient {
    /// 创建客户端并建立连接（TCP）
    pub async fn connect_tcp(
        addr: impl ToSocketAddrs,
        config: NnrpClientConfig,
    ) -> Result<NnrpClientSession, NnrpError>;

    /// 创建客户端并建立连接（QUIC）
    pub async fn connect_quic(
        addr: impl ToSocketAddrs,
        config: NnrpClientConfig,
        tls: NnrpQuicClientConfig,
    ) -> Result<NnrpClientSession, NnrpError>;
}
```

### `NnrpClientSession`

```rust
pub struct NnrpClientSession { /* ... */ }

impl NnrpClientSession {
    pub fn session_id(&self) -> u32;
    pub fn transport_id(&self) -> TransportId;
    pub fn capabilities(&self) -> &NnrpCapabilitySelection;

    /// 提交帧并等待结果
    pub async fn submit(&self, req: NnrpSubmitRequest) -> Result<NnrpResult, NnrpError>;

    /// 提交帧（不等待结果）
    pub async fn submit_nowait(&self, req: NnrpSubmitRequest) -> Result<u32, NnrpError>;

    /// 等待特定帧结果
    pub async fn await_result(&self, frame_id: u32) -> Result<NnrpResult, NnrpError>;

    /// 取消帧
    pub async fn cancel_frame(&self, frame_id: u32) -> Result<(), NnrpError>;

    /// 发送会话补丁
    pub async fn patch_session(&self, patch: NnrpSessionPatch) -> Result<NnrpSessionPatchAck, NnrpError>;

    /// 关闭会话
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
    pub deadline_ms: u32,
    pub view_id: u32,
}
```

### `NnrpResult`

```rust
pub struct NnrpResult {
    pub frame_id: u32,
    pub result_class: ResultClass,
    pub result_flags: ResultFlags,
    pub applied_budget_policy: BudgetPolicy,
    pub inference_ms: u32,
    pub queue_ms: u32,
    pub server_total_ms: u32,
    pub status_code: u16,
    pub sections: Vec<NnrpTensorSection>,
    pub typed_payloads: Vec<NnrpTypedPayload>,
}
```

---

## 反馈

如有 API 形态建议，请在 [GitHub Issues](https://github.com/SPYN/nnrp-rs) 提交，或在 Preview3 集成窗口期内联系维护者。
