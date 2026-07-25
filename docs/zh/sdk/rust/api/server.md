# Rust — 服务端 API

服务端 API 负责绑定 transport、accept session、接收 submit 和控制消息，并发送 result、progress、流控反馈、object/cache event 和 close ack。

## 工作流

1. 构造 [`NnrpServerOptions`](#nnrpserveroptions)，提供一个应用 endpoint 和一个 provider route set。
2. 注册本次部署编译进来的 transport provider。
3. 使用 [`NnrpServer::listen`](#nnrpserver-listen) 监听；Auto/Prefer 原子打开全部 eligible route。
4. 使用 [`NnrpServer::accept`](#nnrpserver-accept) 接收 session。
5. 使用 [`receive_submit`](#nnrpserversession-receive-submit) 接收任务。
6. 使用 [`send_result`](#nnrpserversession-send-result)、`send_partial_result` 或 `send_progress` 发送输出。
7. 使用 [`receive_runtime_control`](#runtime-control-methods) 接收运行时控制帧。
8. 显式关闭 session。

## `NnrpServer::listen`

```rust
let options = NnrpServerOptions {
    endpoint: "nnrp://localhost/runtime/default".parse()?,
    provider_routes: ServerProviderRoutes::from([
        (
            TransportId::Ipc,
            ServerProviderRoute::at("unix:///run/nnrp/runtime.sock".parse()?),
        ),
    ]),
    transport_policy: TransportPolicy::PreferIpc,
    session: NnrpServerConfig::default(),
};

let server = NnrpServer::listen(
    options,
    [Arc::new(IpcProvider::default()), Arc::new(TcpProvider::default())],
).await?;
```

返回的 `NnrpServer` 是一个原子 listener set 上的逻辑 server。Auto/Prefer 打开全部 eligible 已安装 route，
Force 只打开指定 route；任一必需 bind 失败都关闭本次调用已打开的全部 listener。`accept` 在整个集合上等待，
每个已接受 session 最终只接管一条 carrier connection。

## `NnrpServerOptions`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `endpoint` | `NnrpEndpoint` | 是 | 用户侧 `nnrp://` 或 `nnrps://` endpoint。 |
| `provider_routes` | `ServerProviderRoutes` | 否 | 按 carrier 隔离的 bind locator 与 server-security 配置。 |
| `transport_policy` | `TransportPolicy` | 否 | listener set eligibility policy。 |
| `session` | `NnrpServerConfig` | 否 | 与 transport 无关的 accepted-session 默认值。 |

`ServerProviderRoutes` 是 `BTreeMap<TransportId, ServerProviderRoute>`。`ServerProviderRoute` 精确包含
`provider_endpoint: Option<ProviderEndpoint>` 与 `security: Option<ServerTransportSecurity>`。单数 provider
endpoint 或 role-wide security 不属于 `NnrpServerOptions`。

`ServerTransportSecurity` 精确包含 `certificate_der: Vec<u8>` 与
`private_key_pkcs8_der: Vec<u8>`；两个 owned byte vector 都必须非空。提供该值会为 TCP 启用 TLS，QUIC
与 native WSS route 必须提供。

为未安装 provider 的 transport 提供 route 时，该 candidate 保留为 `local-unavailable`。已安装、原本
eligible 的 provider 缺少必需 locator 属于 listen 配置错误，并触发原子回滚。

## 低层 `NnrpServer::bind_tcp`

| 参数 | 类型 | 必填 | 取值范围 | 说明 |
|---|---|---:|---|---|
| `addr` | `impl tokio::net::ToSocketAddrs` | 是 | Socket address | 本地 TCP bind address。 |
| `config` | [`NnrpServerConfig`](#nnrpserverconfig) | 是 | 与 transport 无关 | Server runtime 配置。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpServer, RuntimeError>` | Bind、listener、transport 或配置错误。 |

```rust
let config = NnrpServerConfig::default();
let server = NnrpServer::bind_tcp("127.0.0.1:4433", config).await?;
```

这个方法为 provider 测试、诊断和受控单 carrier 部署创建单 listener 逻辑集合。生产多 provider 宿主使用
`listen`。

## Provider Bind

| Provider | Package | 常用方法 | 说明 |
|---|---|---|---|
| `TcpProvider` | `nnrp-transport-tcp` | `bind(addr, config)` | TCP listener。 |
| `QuicProvider` | `nnrp-transport-quic` | `bind(endpoint_config, config)` | 带证书和 ALPN 配置的 QUIC listener。 |
| `IpcProvider` | `nnrp-transport-ipc` | `bind(endpoint, config)` | Unix socket 或 Windows named pipe listener。 |
| `WebSocketProvider` | `nnrp-transport-websocket` | `bind(endpoint, config)` | 原生 WebSocket binary listener。 |

## `NnrpServer::from_listener`

| 参数 | 类型 | 必填 | 取值范围 | 说明 |
|---|---|---:|---|---|
| `listener` | `L: FramedListener + 'static` | 是 | 任意 framed listener | 自定义或 provider 创建的 listener。 |
| `config` | [`NnrpServerConfig`](#nnrpserverconfig) | 是 | 与 transport 无关 | Runtime 配置。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpServer, RuntimeError>` | Listener kind 不匹配或配置无效。 |

## `NnrpServer::accept`

| 参数 | 类型 | 必填 | 取值范围 | 说明 |
|---|---|---:|---|---|
| 无 | - | - | - | 接收一个 peer 并打开一个 runtime session。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpServerSession, RuntimeError>` | Accept、session-open 拒绝或 transport 错误。 |

每个已接受 session 都公开 `active_transport_id() -> TransportId`。这个值标识实际接受 carrier 的 listener，
并且必须与协商得到的 `active_transport_id` 一致，不能从 listener preference 顺序推断。

`bound_provider_endpoints() -> &BTreeMap<TransportId, ProviderEndpoint>` 返回逻辑集合中每个 listener 的实际
endpoint，包括操作系统分配的端口。Provider listener 的致命失败会让逻辑 server 失败并关闭其余 listener；
peer handshake 拒绝不会。

## `NnrpServerSession::receive_submit`

| 参数 | 类型 | 必填 | 取值范围 | 说明 |
|---|---|---:|---|---|
| 无 | - | - | - | 读取下一个 submit frame。 |

| 返回 | 错误 |
|---|---|
| `Result<NnrpSubmit, RuntimeError>` | Transport、解析、生命周期或 unexpected-message 错误。 |

```rust
let submit = session.receive_submit().await?;
```

## `NnrpServerSession::send_result`

| 参数 | 类型 | 必填 | 取值范围 | 说明 |
|---|---|---:|---|---|
| `frame_id` | `u32` | 是 | 已提交 frame id | 关联 result。 |
| `metadata` | [`ResultPushMetadata`](./core#resultpushmetadata) | 是 | 有效 result metadata | Result status 与 timing metadata。 |
| `body` | `Vec<u8>` | 是 | 可为空 | 序列化 result body。 |

| 返回 | 错误 |
|---|---|
| `Result<(), RuntimeError>` | 生命周期、序列化或 transport 错误。 |

```rust
session
    .send_result(submit.frame_id, ResultPushMetadata::default(), output)
    .await?;
```

## Streaming Result Methods

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `send_partial_result` | frame id, metadata, body | `Result<(), RuntimeError>` | 发送增量 result bytes。 |
| `send_progress` | metadata, body | `Result<(), RuntimeError>` | 发送进度或状态更新。 |
| `send_result_drop_reason` | frame id, metadata, body | `Result<(), RuntimeError>` | 发送结构化 drop reason。 |
| `send_result_drop_reason_with_diagnostics` | frame id, metadata, diagnostics | `Result<(), RuntimeError>` | 发送带诊断上下文的 drop reason。 |

## Runtime Control Methods

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `receive_cancel` | 无 | `Result<CancelMetadata, RuntimeError>` | 接收 cancellation。 |
| `receive_runtime_control` | 无 | `Result<NnrpRuntimeControl, RuntimeError>` | 接收带 metadata 和 body 的 Preview4 通用控制帧。 |
| `send_backpressure` | metadata | `Result<(), RuntimeError>` | 通知 client 降速。 |
| `receive_pressure_update` | 无 | `Result<PressureUpdateMetadata, RuntimeError>` | 接收 client pressure state。 |
| `send_capability` | metadata | `Result<(), RuntimeError>` | 发送 cost/preference/limit 信息。 |
| `send_route_hint` | metadata | `Result<(), RuntimeError>` | 发送执行或路由 hint。 |

## Object And Cache Methods

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `send_object_declare` | metadata, body | `Result<(), RuntimeError>` | 声明 runtime object。 |
| `send_object_ref` | metadata, body | `Result<(), RuntimeError>` | 引用已有 object。 |
| `send_object_release` | metadata, body | `Result<(), RuntimeError>` | 释放 object reference。 |
| `send_object_delta` | metadata, body | `Result<(), RuntimeError>` | 发送 object delta bytes。 |
| `send_cache_reference` | metadata, body | `Result<(), RuntimeError>` | 发送 cache hit/reference。 |
| `send_cache_miss` | metadata, body | `Result<(), RuntimeError>` | 报告 cache miss。 |
| `send_cache_invalidate` | metadata, body | `Result<(), RuntimeError>` | 失效 cache entry。 |

## Lifecycle Methods

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `receive_close` | 无 | `Result<SessionCloseMetadata, RuntimeError>` | 等待 client close。 |
| `ack_close` | close metadata | `Result<(), RuntimeError>` | 确认 close。 |
| `close` | 无 | `Result<(), RuntimeError>` | 关闭 server session。 |

## `NnrpServerConfig`

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `supported_profiles` | `Vec<u16>` | 标准 token profile | 接受的 profiles。 |
| `supported_cache_objects` | `Vec<CacheObjectKind>` | 空 | 接受的 cache object kinds。 |
| `schema_registry` | `SchemaRegistry` | 标准 registry | 接受的 schemas。 |
| `max_in_flight_operations` | `u16` | `4` | In-flight operation 限制。 |
| `granted_operation_credit` | `u16` | `2` | 初始 operation credit。 |
| `lease_ttl_ms` | `u32` | `30000` | Lease TTL。 |
| `resume_window_ms` | `u32` | `120000` | Resume window。 |
| `application_policy` | `Arc<dyn NnrpServerPolicy>` | Allow-all | 应用层校验策略。 |

## `NnrpSubmit`

| 字段 | 类型 | 说明 |
|---|---|---|
| `frame_id` | `u32` | Submitted frame id。 |
| `metadata` | [`FrameSubmitMetadata`](./core#framesubmitmetadata) | Submit metadata。 |
| `body` | `Vec<u8>` | Submit body bytes。 |

::: warning
`receive_submit` 是窄接口。如果 submit、cancel、progress 和 close 会交错出现，应建立 runtime packet dispatch loop，而不是假设单一 request/result 顺序。
:::
