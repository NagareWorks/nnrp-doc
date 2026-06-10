# Rust — 客户端 API

客户端 API 负责启动 transport、打开 runtime session、提交任务、接收事件，并发送控制面更新。核心 metadata 类型见 [核心类型](./core)。

## Dependencies

```toml
[dependencies]
nnrp-core = "1.0.0-preview.4.0"
nnrp-runtime = "1.0.0-preview.4.0"
nnrp-transport-tcp = "1.0.0-preview.4.0"
nnrp-transport-quic = "1.0.0-preview.4.0"
nnrp-transport-ipc = "1.0.0-preview.4.0"
nnrp-transport-websocket = "1.0.0-preview.4.0"
tokio = { version = "1", features = ["macros", "rt-multi-thread", "net", "io-util"] }
```

## 工作流

1. 构造 [`NnrpClientConfig`](#nnrpclientconfig)。
2. 使用 [`NnrpClient::connect_tcp`](#nnrpclient-connect-tcp) 或 transport provider 建立连接。
3. 使用 [`NnrpClient::open_session`](#nnrpclient-open-session) 打开 session。
4. 使用 [`NnrpClientSession::submit`](#nnrpclientsession-submit) 提交任务。
5. 使用 [`await_event`](#nnrpclientsession-await-event) 接收输出和控制事件。
6. 使用 [`close`](#session-lifecycle-methods) 关闭 session。

## `NnrpClient::connect_tcp`

| 参数 | 类型 | 必填 | 取值范围 | 说明 |
|---|---|---:|---|---|
| `addr` | `impl tokio::net::ToSocketAddrs` | 是 | Socket address | 目标 TCP endpoint。 |
| `config` | [`NnrpClientConfig`](#nnrpclientconfig) | 是 | `transport = Tcp` | Client runtime 配置。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpClient, RuntimeError>` | DNS、connect、transport 或配置错误。 |

```rust
let config = NnrpClientConfig::default().with_transport(RuntimeTransportKind::Tcp);
let client = NnrpClient::connect_tcp("127.0.0.1:4433", config).await?;
```

## Provider Connect

非 TCP transport 或 provider 选择场景使用 provider crate。

| Provider | Package | 常用方法 | 说明 |
|---|---|---|---|
| `TcpProvider` | `nnrp-transport-tcp` | `connect(addr, config)` | TCP framed transport。 |
| `QuicProvider` | `nnrp-transport-quic` | `connect(endpoint, endpoint_config, config)` | QUIC framed transport。 |
| `IpcProvider` | `nnrp-transport-ipc` | `connect(endpoint, config)` | Unix socket 或 Windows named pipe。 |
| `WebSocketProvider` | `nnrp-transport-websocket` | `connect(endpoint, config)` | 原生 WebSocket binary transport。 |

```rust
let config = NnrpClientConfig::default().with_transport(RuntimeTransportKind::Ipc);
let client = IpcProvider::connect("unix:///tmp/nnrp.sock".parse()?, config).await?;
```

## `NnrpClient::from_transport`

| 参数 | 类型 | 必填 | 取值范围 | 说明 |
|---|---|---:|---|---|
| `transport` | `T: FramedTransport + 'static` | 是 | 任意 framed transport | 自定义或 provider 创建的 transport。 |
| `config` | [`NnrpClientConfig`](#nnrpclientconfig) | 是 | 必须匹配 transport kind | Runtime 配置。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpClient, RuntimeError>` | Transport kind 不匹配或配置无效。 |

## `NnrpClient::open_session`

| 参数 | 类型 | 必填 | 取值范围 | 说明 |
|---|---|---:|---|---|
| 无 | - | - | - | 使用已连接 client 的配置。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpClientSession, RuntimeError>` | Session open 拒绝或 transport 错误。 |

```rust
let mut session = client.open_session().await?;
```

## `NnrpClientSession::submit`

| 参数 | 类型 | 必填 | 取值范围 | 说明 |
|---|---|---:|---|---|
| `metadata` | [`FrameSubmitMetadata`](./core#framesubmitmetadata) | 是 | 有效 submit metadata | Profile、schema、priority 与 timing context。 |
| `body` | `Vec<u8>` | 是 | 可为空 | 序列化后的请求 body。 |

| 返回 | 错误 |
|---|---|
| `Result<u32, RuntimeError>` | 序列化、流控、生命周期或 transport 错误。 |

```rust
let frame_id = session
    .submit(FrameSubmitMetadata::default(), request_bytes)
    .await?;
```

## `NnrpClientSession::submit_nowait`

| 参数 | 类型 | 必填 | 取值范围 | 说明 |
|---|---|---:|---|---|
| `metadata` | [`FrameSubmitMetadata`](./core#framesubmitmetadata) | 是 | 有效 submit metadata | Operation metadata。 |
| `body` | `Vec<u8>` | 是 | 可为空 | 序列化后的请求 body。 |

| 返回 | 错误 |
|---|---|
| `Result<u32, RuntimeError>` | 写入 frame 后返回；结果后续从 event 接收。 |

## `NnrpClientSession::await_event`

Preview4 应用优先使用这个方法。它能接收普通 result，也能接收 runtime-control、object/cache 和调度事件。

| 参数 | 类型 | 必填 | 取值范围 | 说明 |
|---|---|---:|---|---|
| 无 | - | - | - | 读取下一个 runtime packet。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpClientEvent, RuntimeError>` | Transport、解析、生命周期或 unexpected-message 错误。 |

```rust
match session.await_event().await? {
    NnrpClientEvent::Result(result) => handle_result(result),
    NnrpClientEvent::PartialResult { metadata, body } => handle_partial(metadata, body),
    NnrpClientEvent::Progress { metadata, body } => update_progress(metadata, body),
    NnrpClientEvent::Backpressure(metadata) => slow_down(metadata),
    NnrpClientEvent::ResultDropReason { metadata, body } => record_drop(metadata, body),
    _ => {}
}
```

## `NnrpClientSession::await_result`

| 参数 | 类型 | 必填 | 取值范围 | 说明 |
|---|---|---:|---|---|
| 无 | - | - | - | 读取直到下一个 result packet。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpResult, RuntimeError>` | 如果非 result event 合法，应改用 `await_event`。 |

## Runtime Control Methods

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `cancel_operation` | `operation_id`, `reason_code` | `Result<(), RuntimeError>` | 请求取消操作。 |
| `abort_operation` | `operation_id`, `reason_code` | `Result<(), RuntimeError>` | 请求中止操作，语义比 cancel 更强。 |
| `update_priority` | priority metadata | `Result<(), RuntimeError>` | 更新调度优先级。 |
| `update_deadline` | deadline metadata | `Result<(), RuntimeError>` | 更新任务 deadline。 |
| `expire_at` | expiration metadata | `Result<(), RuntimeError>` | 标记任务在指定时间后失效。 |
| `send_flow_update` | flow metadata | `Result<(), RuntimeError>` | 发送 flow/backpressure 状态。 |
| `send_credit_update` | credit metadata | `Result<(), RuntimeError>` | 发送可用 credit。 |
| `send_control_request` | message type, metadata | `Result<(), RuntimeError>` | 通用紧凑控制帧。 |
| `send_control_request_with_diagnostics` | message type, metadata, diagnostics | `Result<(), RuntimeError>` | 带 trace/diagnostic body 的通用控制帧。 |

这些帧的 wire 定义见 [运行时控制 Profiles](/zh/profiles/runtime-control/)。

## Session Lifecycle Methods

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `patch_session` | session patch metadata | `Result<SessionPatchAckMetadata, RuntimeError>` | 更新 session 参数。 |
| `migrate_transport` | migration metadata | `Result<SessionMigrateAckMetadata, RuntimeError>` | 请求 transport migration。 |
| `close` | 无 | `Result<(), RuntimeError>` | 正常关闭 session。 |
| `close_transport` | 无 | `Result<(), RuntimeError>` | 异常路径关闭 transport。 |

## `NnrpClientConfig`

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `transport` | `RuntimeTransportKind` | `Tcp` | Runtime transport slot。 |
| `requested_session_id` | `u32` | `0` | 请求的 session id。 |
| `profile_id` | `u16` | 标准 token profile | 请求 profile。 |
| `schema_id` / `schema_version` | `u32` | 标准 registry 值 | Schema identity。 |
| `priority_class` | `SessionPriorityClass` | `Balanced` | 调度优先级。 |
| `default_deadline_ms` | `u32` | `500` | 默认 operation deadline。 |
| `max_in_flight_operations` | `u16` | `4` | 本地 in-flight 限制。 |
| `lease_ttl_hint_ms` | `u32` | `30000` | Lease TTL hint。 |
| `allow_resume` | `bool` | `false` | 启用恢复语义。 |
| `cache_hints` | `Vec<CacheObjectKind>` | 空 | Client 预计使用的 cache object kinds。 |

## `NnrpClientEvent`

| Variant | 数据 | 说明 |
|---|---|---|
| `Result` | [`NnrpResult`](#nnrpresult) | 最终 result bytes。 |
| `PartialResult` | metadata, body | 增量输出。 |
| `Progress` | metadata, body | 进度更新。 |
| `ResultDrop` | frame id | 没有 detail body 的 result drop。 |
| `ResultDropReason` | metadata, body | 结构化 drop reason。 |
| `FlowUpdate` / `Backpressure` / `CreditUpdate` | control metadata | 流控和调度反馈。 |
| `ObjectDeclare` / `ObjectRef` / `ObjectRelease` / `ObjectDelta` | object metadata | Runtime object 生命周期事件。 |
| `CacheReference` / `CacheMiss` / `CacheInvalidate` | cache metadata | Cache 协调事件。 |
| `Capability` / `RouteHint` | control metadata | 能力协商和路由提示。 |

## `NnrpResult`

| 字段 | 类型 | 说明 |
|---|---|---|
| `frame_id` | `u32` | Result frame id。 |
| `metadata` | [`ResultPushMetadata`](./core#resultpushmetadata) | Result metadata。 |
| `body` | `Vec<u8>` | Result body bytes。 |

::: warning
Preview4 应用优先使用 `await_event`。`await_result` 只适合最简单的 echo-style flow，无法表达 progress、backpressure、cache/object event 或详细 result drop。
:::
