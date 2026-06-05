# Rust — Client API

Rust runtime client 负责 transport 建立、session open、submit/cancel/patch/migrate、事件接收和优雅关闭。本文先写应用入口方法，metadata 类型细节放到 [核心类型](./core)。

## 依赖

```toml
[dependencies]
nnrp-core = "1.0.0-preview.3.8"
nnrp-runtime = "1.0.0-preview.3.8"
nnrp-transport-quic = "1.0.0-preview.3.8"
tokio = { version = "1", features = ["macros", "rt-multi-thread", "net", "io-util"] }
```

## Client 使用流程

1. 构造 [`NnrpClientConfig`](#nnrpclientconfig)。
2. 使用 [`NnrpClient::connect_tcp`](#nnrpclient-connect-tcp)、QUIC provider 或自定义
   [`FramedTransport`](#framedtransport) 连接。
3. 调用 [`open_session`](#nnrpclient-open-session)。
4. 用 [`NnrpClientSession::submit`](#nnrpclientsession-submit) 提交。
5. 用 [`await_event`](#nnrpclientsession-await-event) 或 [`await_result`](#nnrpclientsession-await-result) 接收输出。
6. 用 [`close`](#nnrpclientsession-close) 关闭。

## `NnrpClient::connect_tcp`

通过 runtime TCP transport 连接。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `addr` | `impl tokio::net::ToSocketAddrs` | 是 | socket 地址 | 目标 NNRP endpoint。 |
| `config` | [`NnrpClientConfig`](#nnrpclientconfig) | 是 | `transport` 应为 `Tcp` | client runtime 配置。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpClient, RuntimeError>` | DNS、connect、transport 或配置不匹配错误。 |

```rust
let config = NnrpClientConfig::default().with_transport(RuntimeTransportKind::Tcp);
let client = NnrpClient::connect_tcp("127.0.0.1:4433", config).await?;
```

## QUIC Provider Connect

默认 QUIC 实现在 `nnrp-transport-quic` 中，避免 transport-neutral runtime 强依赖 Quinn/Rustls。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `endpoint` | provider endpoint type | 是 | QUIC endpoint | 目标 endpoint。 |
| `endpoint_config` | `QuicClientEndpointConfig` | 是 | 证书和 ALPN 配置 | QUIC client 配置。 |
| `config` | [`NnrpClientConfig`](#nnrpclientconfig) | 是 | `transport = Quic` | runtime 配置。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpClient, RuntimeError>` | 证书、connect、ALPN 或配置不匹配错误。 |

```rust
let config = NnrpClientConfig::default().with_transport(RuntimeTransportKind::Quic);
let client = QuicProvider::connect("127.0.0.1:4433", endpoint_config, config).await?;
```

## `NnrpClient::from_transport`

接入自定义 framed transport。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `transport` | `T: FramedTransport + 'static` | 是 | 任意 runtime transport | 自定义 TCP、QUIC、native 或测试 transport。 |
| `config` | [`NnrpClientConfig`](#nnrpclientconfig) | 是 | 必须匹配 transport kind | client runtime 配置。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpClient, RuntimeError>` | transport kind 不匹配或配置无效。 |

## `NnrpClient::open_session`

消耗已连接 client 并打开 runtime session。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| 无 | - | - | - | 使用 connect 时捕获的配置。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpClientSession, RuntimeError>` | session open 拒绝或 transport 错误。 |

```rust
let mut session = client.open_session().await?;
```

## `NnrpClientSession::submit`

提交一个 operation，返回已接受的 frame id，不等待结果。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `metadata` | `FrameSubmitMetadata` | 是 | 有效 frame metadata | 来自 `nnrp-core` 的提交 metadata。 |
| `body` | `Vec<u8>` | 是 | 可为空 | 序列化后的请求 body。 |

| 返回 | 错误 |
|---|---|
| `Result<u32, RuntimeError>` | 序列化、流控、生命周期或 transport 错误。 |

```rust
let frame_id = session
    .submit(FrameSubmitMetadata::default(), b"delta".to_vec())
    .await?;
```

## `NnrpClientSession::await_event`

接收下一条 session event。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| 无 | - | - | - | 读取下一条 runtime packet。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpClientEvent, RuntimeError>` | transport、解析或生命周期错误。 |

```rust
match session.await_event().await? {
    NnrpClientEvent::Result(result) => handle_result(result),
    NnrpClientEvent::ResultDrop { frame_id } => handle_drop(frame_id),
    NnrpClientEvent::FlowUpdate(update) => apply_flow_update(update),
}
```

## `NnrpClientSession::await_result`

只接收下一条 `RESULT_PUSH`。如果 drop 或 flow update 是合法路径，应使用 [`await_event`](#nnrpclientsession-await-event)。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| 无 | - | - | - | 读取下一条 packet。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpResult, RuntimeError>` | drop/flow-update 会返回 `UnexpectedMessage`，也可能有 transport 或解析错误。 |

## `NnrpClientSession::patch_session`

发送 session patch 并等待 ack。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `patch` | `SessionPatchMetadata` | 是 | 有效 patch metadata | runtime session 参数更新。 |

| 返回 | 错误 |
|---|---|
| `Result<SessionPatchAckMetadata, RuntimeError>` | 拒绝、ack 格式错误或 transport 错误。 |

## `NnrpClientSession::close`

优雅关闭 session 和 transport。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| 无 | - | - | - | 消耗 session。 |

| 返回 | 错误 |
|---|---|
| `Result<(), RuntimeError>` | close 或 transport 错误。 |

```rust
session.close().await?;
```

## 核心类型

### `NnrpClientConfig`

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `transport` | `RuntimeTransportKind` | `Tcp` | runtime transport slot。 |
| `requested_session_id` | `u32` | `0` | 请求的 session id。 |
| `profile_id` | `u16` | 标准 token profile | 请求的 profile。 |
| `schema_id` / `schema_version` | `u32` | 标准 registry 值 | schema 身份。 |
| `priority_class` | `SessionPriorityClass` | `Balanced` | 调度优先级。 |
| `default_deadline_ms` | `u32` | `500` | 默认 operation deadline。 |
| `max_in_flight_operations` | `u16` | `4` | 本地 in-flight 限制。 |
| `lease_ttl_hint_ms` | `u32` | `30000` | lease TTL hint。 |
| `allow_resume` | `bool` | `false` | 是否启用恢复语义。 |
| `cache_hints` | `Vec<CacheObjectKind>` | 空 | 预期使用的 cache object kind。 |

### `NnrpClientEvent`

| Variant | 数据 | 说明 |
|---|---|---|
| `Result` | [`NnrpResult`](#nnrpresult) | 服务端返回结果。 |
| `ResultDrop` | `frame_id` | 服务端 drop frame。 |
| `FlowUpdate` | `FlowUpdateMetadata` | 服务端发送 credit 或 backpressure 信息。 |

## 常见坑

::: warning
1. `open_session(self)` 会消耗 client；当前 runtime 是一个 transport 绑定一个 session。
2. `submit` 返回 frame id，不会自动等待输出。
3. drop 或 flow update 是合法路径时用 `await_event`，不要用 `await_result`。
4. 正常关闭优先用 `close()`。
:::
