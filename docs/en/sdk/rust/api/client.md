# Rust — Client API

The client API starts a transport, opens one runtime session, submits work, receives events, and
sends control-plane updates. Core metadata types are documented in [Core Types](./core).

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

## Workflow

1. Build [`NnrpClientConfig`](#nnrpclientconfig).
2. Connect with [`NnrpClient::connect_tcp`](#nnrpclient-connect-tcp) or a transport provider.
3. Open a session with [`NnrpClient::open_session`](#nnrpclient-open-session).
4. Submit work with [`NnrpClientSession::submit`](#nnrpclientsession-submit).
5. Receive output and control events with [`await_event`](#nnrpclientsession-await-event).
6. Close the session with [`close`](#nnrpclientsession-close).

## `NnrpClient::connect_tcp`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `addr` | `impl tokio::net::ToSocketAddrs` | Yes | Socket address | Target TCP endpoint. |
| `config` | [`NnrpClientConfig`](#nnrpclientconfig) | Yes | `transport = Tcp` | Client runtime configuration. |

| Returns | Errors |
|---|---|
| `Result<NnrpClient, RuntimeError>` | DNS, connect, transport, or configuration errors. |

```rust
let config = NnrpClientConfig::default().with_transport(RuntimeTransportKind::Tcp);
let client = NnrpClient::connect_tcp("127.0.0.1:4433", config).await?;
```

## Provider Connect

Use provider crates when the transport is not TCP or when an application wants provider selection.

| Provider | Package | Typical method | Description |
|---|---|---|---|
| `TcpProvider` | `nnrp-transport-tcp` | `connect(addr, config)` | TCP framed transport. |
| `QuicProvider` | `nnrp-transport-quic` | `connect(endpoint, endpoint_config, config)` | QUIC framed transport. |
| `IpcProvider` | `nnrp-transport-ipc` | `connect(endpoint, config)` | Unix socket or Windows named pipe. |
| `WebSocketProvider` | `nnrp-transport-websocket` | `connect(endpoint, config)` | Native WebSocket binary transport. |

```rust
let config = NnrpClientConfig::default().with_transport(RuntimeTransportKind::Ipc);
let client = IpcProvider::connect("unix:///tmp/nnrp.sock".parse()?, config).await?;
```

## `NnrpClient::from_transport`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `transport` | `T: FramedTransport + 'static` | Yes | Any framed transport | Custom or provider-created transport. |
| `config` | [`NnrpClientConfig`](#nnrpclientconfig) | Yes | Must match transport kind | Runtime configuration. |

| Returns | Errors |
|---|---|
| `Result<NnrpClient, RuntimeError>` | Transport-kind mismatch or invalid configuration. |

## `NnrpClient::open_session`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Uses the connected client configuration. |

| Returns | Errors |
|---|---|
| `Result<NnrpClientSession, RuntimeError>` | Session-open rejection or transport errors. |

```rust
let mut session = client.open_session().await?;
```

## `NnrpClientSession::submit`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `metadata` | [`FrameSubmitMetadata`](./core#framesubmitmetadata) | Yes | Valid submit metadata | Profile, schema, priority, and timing context. |
| `body` | `Vec<u8>` | Yes | May be empty | Serialized request body. |

| Returns | Errors |
|---|---|
| `Result<u32, RuntimeError>` | Serialization, flow-control, lifecycle, or transport errors. |

```rust
let frame_id = session
    .submit(FrameSubmitMetadata::default(), request_bytes)
    .await?;
```

## `NnrpClientSession::submit_nowait`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `metadata` | [`FrameSubmitMetadata`](./core#framesubmitmetadata) | Yes | Valid submit metadata | Operation metadata. |
| `body` | `Vec<u8>` | Yes | May be empty | Serialized request body. |

| Returns | Errors |
|---|---|
| `Result<u32, RuntimeError>` | Returns after the frame is written; result is received later through events. |

## `NnrpClientSession::await_event`

Use this method for Preview4 sessions. It can receive normal results plus runtime-control,
object/cache, and scheduling events.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Reads the next runtime packet. |

| Returns | Errors |
|---|---|
| `Result<NnrpClientEvent, RuntimeError>` | Transport, parse, lifecycle, or unexpected-message errors. |

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

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Reads until the next result packet. |

| Returns | Errors |
|---|---|
| `Result<NnrpResult, RuntimeError>` | Use `await_event` when non-result events are valid. |

## Runtime Control Methods

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `cancel_operation` | `operation_id`, `reason_code` | `Result<(), RuntimeError>` | Requests operation cancellation. |
| `abort_operation` | `operation_id`, `reason_code` | `Result<(), RuntimeError>` | Requests operation abort with stronger semantics. |
| `update_priority` | priority metadata | `Result<(), RuntimeError>` | Updates runtime scheduling priority. |
| `update_deadline` | deadline metadata | `Result<(), RuntimeError>` | Updates task deadline. |
| `expire_at` | expiration metadata | `Result<(), RuntimeError>` | Marks work as invalid after a timestamp. |
| `send_flow_update` | flow metadata | `Result<(), RuntimeError>` | Sends flow/backpressure state. |
| `send_credit_update` | credit metadata | `Result<(), RuntimeError>` | Sends available credit. |
| `send_control_request` | message type, metadata | `Result<(), RuntimeError>` | Generic compact control frame. |
| `send_control_request_with_diagnostics` | message type, metadata, diagnostics | `Result<(), RuntimeError>` | Generic control frame with trace/diagnostic body. |

The wire definitions for these frames live in [Runtime Control Profiles](/en/profiles/runtime-control/).

## Session Lifecycle Methods

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `patch_session` | session patch metadata | `Result<SessionPatchAckMetadata, RuntimeError>` | Applies session parameter updates. |
| `migrate_transport` | migration metadata | `Result<SessionMigrateAckMetadata, RuntimeError>` | Requests transport migration. |
| `close` | none | `Result<(), RuntimeError>` | Graceful session close. |
| `close_transport` | none | `Result<(), RuntimeError>` | Exceptional transport close. |

## `NnrpClientConfig`

| Field | Type | Default | Description |
|---|---|---|---|
| `transport` | `RuntimeTransportKind` | `Tcp` | Runtime transport slot. |
| `requested_session_id` | `u32` | `0` | Requested session id. |
| `profile_id` | `u16` | Standard token profile | Requested profile. |
| `schema_id` / `schema_version` | `u32` | Standard registry values | Schema identity. |
| `priority_class` | `SessionPriorityClass` | `Balanced` | Scheduling priority. |
| `default_deadline_ms` | `u32` | `500` | Default operation deadline. |
| `max_in_flight_operations` | `u16` | `4` | Local in-flight limit. |
| `lease_ttl_hint_ms` | `u32` | `30000` | Lease TTL hint. |
| `allow_resume` | `bool` | `false` | Enables recovery semantics. |
| `cache_hints` | `Vec<CacheObjectKind>` | Empty | Cache object kinds expected by this client. |

## `NnrpClientEvent`

| Variant | Data | Description |
|---|---|---|
| `Result` | [`NnrpResult`](#nnrpresult) | Final result bytes. |
| `PartialResult` | metadata, body | Incremental output. |
| `Progress` | metadata, body | Progress update. |
| `ResultDrop` | frame id | Result was dropped without a detail body. |
| `ResultDropReason` | metadata, body | Structured drop reason. |
| `FlowUpdate` / `Backpressure` / `CreditUpdate` | control metadata | Flow-control and scheduling feedback. |
| `ObjectDeclare` / `ObjectRef` / `ObjectRelease` / `ObjectDelta` | object metadata | Runtime object lifecycle events. |
| `CacheReference` / `CacheMiss` / `CacheInvalidate` | cache metadata | Cache coordination events. |
| `Capability` / `RouteHint` | control metadata | Negotiation and routing hints. |

## `NnrpResult`

| Field | Type | Description |
|---|---|---|
| `frame_id` | `u32` | Result frame id. |
| `metadata` | [`ResultPushMetadata`](./core#resultpushmetadata) | Result metadata. |
| `body` | `Vec<u8>` | Result body bytes. |

::: warning
Use `await_event` for Preview4 applications. `await_result` is convenient for the simplest echo-style
flow, but it cannot represent progress, backpressure, cache/object events, or detailed result drops.
:::
