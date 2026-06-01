# Rust — Server API

Rust server API 负责接受 runtime session、接收 submit、发送 result/drop/flow update、处理 session 控制消息并显式关闭。

## Server 使用流程

1. 构造 [`NnrpServerConfig`](#nnrpserverconfig)。
2. 使用 [`NnrpServer::bind_tcp`](#nnrpserver-bind-tcp)、QUIC provider 或自定义
   [`FramedListener`](#framedlistener) 绑定。
3. 调用 [`accept`](#nnrpserver-accept) 接收 session。
4. 循环调用 [`receive_submit`](#nnrpserversession-receive-submit)。
5. 发送 [`send_result`](#nnrpserversession-send-result)、[`send_result_drop`](#nnrpserversession-send-result-drop)
   或 [`send_flow_update`](#nnrpserversession-send-flow-update)。
6. 处理 close 并调用 [`close`](#nnrpserversession-close)。

## `NnrpServer::bind_tcp`

使用 runtime TCP transport 绑定 listener。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `addr` | `impl tokio::net::ToSocketAddrs` | 是 | socket 地址 | 本地监听地址。 |
| `config` | [`NnrpServerConfig`](#nnrpserverconfig) | 是 | `transport` 应为 `Tcp` | server runtime 配置。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpServer, RuntimeError>` | bind、listener 或配置不匹配错误。 |

```rust
let server = NnrpServer::bind_tcp("127.0.0.1:4433", NnrpServerConfig::default()).await?;
```

## QUIC Provider Bind

默认 QUIC listener 位于 `nnrp-transport-quic`。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `endpoint_config` | `QuicServerEndpointConfig` | 是 | 证书、私钥、ALPN | QUIC server endpoint 配置。 |
| `config` | [`NnrpServerConfig`](#nnrpserverconfig) | 是 | `transport = Quic` | runtime 配置。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpServer, RuntimeError>` | 证书、bind、ALPN 或配置不匹配错误。 |

```rust
let config = NnrpServerConfig::default().with_transport(RuntimeTransportKind::Quic);
let server = QuicProvider::bind(endpoint_config, config).await?;
```

## `NnrpServer::accept`

接受一个 peer 并完成 session open。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| 无 | - | - | - | 使用已绑定 listener。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpServerSession, RuntimeError>` | accept、session-open 拒绝或 transport 错误。 |

```rust
let mut session = server.accept().await?;
```

## `NnrpServerSession::receive_submit`

接收一帧 submit。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| 无 | - | - | - | 读取下一条 runtime packet。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpSubmit, RuntimeError>` | transport、解析、生命周期或 unexpected-message 错误。 |

```rust
let submit = session.receive_submit().await?;
```

## `NnrpServerSession::send_result`

发送 `RESULT_PUSH`。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `frame_id` | `u32` | 是 | 已提交 frame id | 结果关联的 frame。 |
| `metadata` | `ResultPushMetadata` | 是 | 有效 result metadata | 结果状态和耗时信息。 |
| `body` | `Vec<u8>` | 是 | 结果 body 字节 | 序列化后的结果负载。 |

| 返回 | 错误 |
|---|---|
| `Result<(), RuntimeError>` | 生命周期、序列化或 transport 错误。 |

```rust
session
    .send_result(submit.frame_id, ResultPushMetadata::default(), output)
    .await?;
```

## `NnrpServerSession::send_result_drop`

发送 frame drop。

| 参数 | 类型 | 必填 | 取值 / 范围 | 说明 |
|---|---|---:|---|---|
| `frame_id` | `u32` | 是 | 已提交 frame id | 被 drop 的 frame。 |

| 返回 | 错误 |
|---|---|
| `Result<(), RuntimeError>` | 生命周期或 transport 错误。 |

## 核心类型

### `NnrpServerConfig`

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `transport` | `RuntimeTransportKind` | `Tcp` | runtime transport slot。 |
| `supported_profiles` | `Vec<u16>` | 标准 token profile | 接受的 profiles。 |
| `supported_cache_objects` | `Vec<CacheObjectKind>` | 空 | 接受的 cache object kinds。 |
| `schema_registry` | `SchemaRegistry` | 标准 registry | 接受的 schemas。 |
| `max_in_flight_operations` | `u16` | `4` | in-flight operation 限制。 |
| `granted_operation_credit` | `u16` | `2` | 初始 operation credit。 |
| `lease_ttl_ms` | `u32` | `30000` | lease TTL。 |
| `resume_window_ms` | `u32` | `120000` | resume 窗口。 |

### `NnrpSubmit`

| 字段 | 类型 | 说明 |
|---|---|---|
| `frame_id` | `u32` | 提交 frame id。 |
| `metadata` | `FrameSubmitMetadata` | submit metadata。 |
| `body` | `Vec<u8>` | submit body。 |

## 示例

```rust
loop {
    let mut session = server.accept().await?;
    tokio::spawn(async move {
        let submit = session.receive_submit().await?;
        let output = run_model(submit.body).await;
        session
            .send_result(submit.frame_id, ResultPushMetadata::default(), output)
            .await?;
        session.close().await
    });
}
```

## 常见坑

::: warning
1. 超时 frame 需要 `send_result_drop`，不要静默跳过。
2. `receive_*` 是顺序读取；submit/cancel/patch/migrate 可交错时要自己建事件循环。
3. CPU/GPU 阻塞工作应放到专用线程池或 `spawn_blocking`。
:::
