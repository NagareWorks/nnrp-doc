# Rust — 服务端（Preview3）

::: warning 规划中
本页描述的 API 计划在 Preview3 实现。当前 `nnrp-core` 0.1.0 尚未包含服务端实现。
:::

## 规划 API

### `NnrpServerConfig`

```rust
pub struct NnrpServerConfig {
    pub max_concurrent_frames: usize,
    pub enable_cache: bool,
    pub max_sections: usize,
    pub max_body_bytes: usize,
    pub supported_payload_kinds: PayloadKind,
    pub max_cache_entries: usize,
    pub max_cache_bytes: usize,
}

impl Default for NnrpServerConfig {
    fn default() -> Self {
        // max_concurrent_frames=1, enable_cache=true, max_sections=16,
        // max_body_bytes=32MB, supported_payload_kinds=ALL
    }
}
```

### `NnrpServer`

```rust
pub struct NnrpServer { /* ... */ }

impl NnrpServer {
    /// 创建 TCP 监听服务端
    pub async fn bind_tcp(
        addr: impl ToSocketAddrs,
        config: NnrpServerConfig,
    ) -> Result<Self, NnrpError>;

    /// 创建 QUIC 监听服务端
    pub async fn bind_quic(
        addr: impl ToSocketAddrs,
        config: NnrpServerConfig,
        tls: NnrpQuicServerConfig,
    ) -> Result<Self, NnrpError>;

    /// 接受下一个连接，完成握手，返回服务端会话
    pub async fn accept(&self) -> Result<NnrpServerSession, NnrpError>;

    /// 接受时带认证回调
    pub async fn accept_with_auth(
        &self,
        auth: impl Fn(&[u8]) -> bool + Send + Sync,
    ) -> Result<NnrpServerSession, NnrpError>;
}
```

### `NnrpServerSession`

```rust
pub struct NnrpServerSession { /* ... */ }

impl NnrpServerSession {
    pub fn session_id(&self) -> u32;
    pub fn transport_id(&self) -> TransportId;
    pub fn capabilities(&self) -> &NnrpCapabilitySelection;
    pub fn client_hello(&self) -> &NnrpClientHello;

    /// 等待并接收下一个帧提交
    pub async fn receive_submit(&self) -> Result<NnrpFrameSubmit, NnrpError>;

    /// 推送处理结果
    pub async fn send_result(&self, result: NnrpServerResult) -> Result<usize, NnrpError>;

    /// 发送结果丢弃通知
    pub async fn send_drop(&self, frame_id: u32) -> Result<(), NnrpError>;

    /// 发送流控更新
    pub async fn send_flow_update(&self, update: NnrpFlowUpdate) -> Result<(), NnrpError>;

    /// 关闭会话
    pub async fn close(self) -> Result<(), NnrpError>;
}
```

### `NnrpFrameSubmit`

```rust
pub struct NnrpFrameSubmit {
    pub session_id: u32,
    pub frame_id: u32,
    pub view_id: u32,
    pub input_profile: InputProfile,
    pub submit_mode: SubmitMode,
    pub budget_policy: BudgetPolicy,
    pub payload_kind_bitmap: PayloadKind,
    pub inference_budget_ms: u32,
    pub deadline_ms: u32,
    pub sections: Vec<NnrpTensorSection>,
    pub typed_payloads: Vec<NnrpTypedPayload>,
}
```

### `NnrpServerResult`

```rust
pub struct NnrpServerResult {
    pub frame_id: u32,
    pub tile_ids: Vec<u16>,
    pub sections: Vec<NnrpTensorSection>,
    pub typed_payloads: Vec<NnrpTypedPayload>,
    pub result_class: ResultClass,
    pub result_flags: ResultFlags,
    pub applied_budget_policy: BudgetPolicy,
    pub active_profile_id: u8,
    pub inference_ms: u32,
    pub queue_ms: u32,
    pub server_total_ms: u32,
    pub status_code: u16,
    pub tile_index_mode: TileIndexMode,
    pub covered_tile_count: u16,
    pub dropped_tile_count: u16,
    pub view_id: u32,
}
```

---

## 完整服务端示例（规划）

```rust
use nnrp_core::{NnrpServer, NnrpServerConfig, ResultClass};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = NnrpServerConfig::default();
    let server = NnrpServer::bind_tcp("0.0.0.0:4433", config).await?;

    loop {
        let session = server.accept().await?;

        tokio::spawn(async move {
            loop {
                let submit = session.receive_submit().await?;
                let output_sections = run_inference(&submit.sections).await;
                session.send_result(NnrpServerResult {
                    frame_id: submit.frame_id,
                    sections: output_sections,
                    result_class: ResultClass::Complete,
                    inference_ms: 12,
                    ..Default::default()
                }).await?;
            }
            Ok::<(), nnrp_core::NnrpError>(())
        });
    }
}
```

---

## 典型使用场景（Preview3 规划）

### 完整服务端循环

```rust
// Preview3 预期用法
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

### 背压信号

```rust
if queue_len > MAX_QUEUE {
    session.send_result_drop(submit.frame_id).await?;
    session.send_flow_update(NnrpFlowUpdate {
        flags: FlowUpdateFlags::CREDIT_VALID,
        credit: 0, // 暂停接收
        ..Default::default()
    }).await?;
}
```

---

## 常见坱点

::: warning
1. **超时帧必须发送 `send_result_drop`。** 默默跳过会让客户端 `submit()` 永久卡住。

2. **尚未实现内置认证。** Preview3 认证需在应用层完成，不要期待中间件自动验证。

3. **`tokio::spawn` 内不要阔塞。** 同步推理务必须包装在 `tokio::task::spawn_blocking` 或单独线程池。
:::
