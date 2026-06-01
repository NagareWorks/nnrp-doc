# Rust — Server API

The Rust server API accepts runtime sessions, receives submits, sends results or drops, handles
session control messages, and closes explicitly. The entrypoint is `NnrpServer`; each accepted peer
is represented by `NnrpServerSession`.

## Server Workflow

1. Build [`NnrpServerConfig`](#nnrpserverconfig).
2. Bind with [`NnrpServer::bind_tcp`](#nnrpserver-bind-tcp), the QUIC provider, or a custom
   [`FramedListener`](#framedlistener).
3. Call [`accept`](#nnrpserver-accept) to receive a session.
4. Loop on [`receive_submit`](#nnrpserversession-receive-submit).
5. Send [`send_result`](#nnrpserversession-send-result), [`send_result_drop`](#nnrpserversession-send-result-drop),
   or [`send_flow_update`](#nnrpserversession-send-flow-update).
6. Acknowledge close and call [`close`](#nnrpserversession-close).

## `NnrpServer::bind_tcp`

Binds a TCP listener using the runtime transport.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `addr` | `impl tokio::net::ToSocketAddrs` | Yes | Socket address | Local bind address. |
| `config` | [`NnrpServerConfig`](#nnrpserverconfig) | Yes | `transport` should be `Tcp` | Server runtime configuration. |

| Returns | Errors |
|---|---|
| `Result<NnrpServer, RuntimeError>` | Bind, listener, or config mismatch errors. |

```rust
let server = NnrpServer::bind_tcp("127.0.0.1:4433", NnrpServerConfig::default()).await?;
```

## QUIC Provider Bind

The default QUIC listener lives in `nnrp-transport-quic`.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `endpoint_config` | `QuicServerEndpointConfig` | Yes | Certificate, key, ALPN | QUIC server endpoint configuration. |
| `config` | [`NnrpServerConfig`](#nnrpserverconfig) | Yes | `transport = Quic` | Runtime configuration. |

| Returns | Errors |
|---|---|
| `Result<NnrpServer, RuntimeError>` | Certificate, bind, ALPN, or config mismatch errors. |

```rust
let config = NnrpServerConfig::default().with_transport(RuntimeTransportKind::Quic);
let server = QuicProvider::bind(endpoint_config, config).await?;
```

## `NnrpServer::from_listener`

Wraps a custom listener.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `listener` | `L: FramedListener + 'static` | Yes | Any runtime listener | Custom TCP, QUIC, native, or test listener. |
| `config` | [`NnrpServerConfig`](#nnrpserverconfig) | Yes | Must match listener kind | Server runtime configuration. |

| Returns | Errors |
|---|---|
| `Result<NnrpServer, RuntimeError>` | Listener-kind mismatch or invalid config. |

## `NnrpServer::accept`

Accepts one peer and completes session open.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Uses the bound listener. |

| Returns | Errors |
|---|---|
| `Result<NnrpServerSession, RuntimeError>` | Accept, session-open rejection, or transport errors. |

```rust
let mut session = server.accept().await?;
```

## `NnrpServerSession::receive_submit`

Receives one frame submit.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Reads the next runtime packet. |

| Returns | Errors |
|---|---|
| `Result<NnrpSubmit, RuntimeError>` | Transport, parse, lifecycle, or unexpected-message errors. |

```rust
let submit = session.receive_submit().await?;
```

## `NnrpServerSession::send_result`

Sends a `RESULT_PUSH` for a submitted frame.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `frame_id` | `u32` | Yes | Submitted frame id | Correlates the result. |
| `metadata` | `ResultPushMetadata` | Yes | Valid result metadata | Result status and timing metadata. |
| `body` | `Vec<u8>` | Yes | Result body bytes | Serialized result payload. |

| Returns | Errors |
|---|---|
| `Result<(), RuntimeError>` | Lifecycle, serialization, or transport errors. |

```rust
session
    .send_result(submit.frame_id, ResultPushMetadata::default(), output)
    .await?;
```

## `NnrpServerSession::send_result_drop`

Sends a result drop for a frame that will not produce output.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `frame_id` | `u32` | Yes | Submitted frame id | Frame being dropped. |

| Returns | Errors |
|---|---|
| `Result<(), RuntimeError>` | Lifecycle or transport errors. |

```rust
session.send_result_drop(submit.frame_id).await?;
```

## `NnrpServerSession::send_flow_update`

Sends credit or backpressure metadata.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `metadata` | `FlowUpdateMetadata` | Yes | Valid flow update metadata | Credit or backpressure signal. |

| Returns | Errors |
|---|---|
| `Result<(), RuntimeError>` | Serialization or transport errors. |

```rust
session.send_flow_update(flow_update).await?;
```

## `NnrpServerSession::receive_close` and `ack_close`

Use these methods for graceful client-initiated shutdown.

| Method | Parameter | Returns | Description |
|---|---|---|---|
| `receive_close` | None | `Result<SessionCloseMetadata, RuntimeError>` | Waits for client close. |
| `ack_close` | `&SessionCloseMetadata` | `Result<(), RuntimeError>` | Acknowledges a close request. |

```rust
let close = session.receive_close().await?;
session.ack_close(&close).await?;
session.close().await?;
```

## Core Types

### `NnrpServerConfig`

| Field | Type | Default | Description |
|---|---|---|---|
| `transport` | `RuntimeTransportKind` | `Tcp` | Runtime transport slot. |
| `supported_profiles` | `Vec<u16>` | Standard token profile | Accepted profiles. |
| `supported_cache_objects` | `Vec<CacheObjectKind>` | Empty | Accepted cache object kinds. |
| `max_cache_objects` | `usize` | Runtime default | Cache object count limit. |
| `max_cache_object_bytes` | `u32` | Runtime default | Per-object byte limit. |
| `schema_registry` | `SchemaRegistry` | Standard registry | Accepted schemas. |
| `resume_token_bytes` | `u32` | Runtime default | Resume token size. |
| `max_in_flight_operations` | `u16` | `4` | In-flight operation limit. |
| `granted_operation_credit` | `u16` | `2` | Initial operation credit. |
| `lease_ttl_ms` | `u32` | `30000` | Lease TTL. |
| `resume_window_ms` | `u32` | `120000` | Resume window. |
| `application_policy` | `Arc<dyn NnrpServerPolicy>` | Allow-all | Application validation policy. |

### `FramedListener`

| Method | Returns | Description |
|---|---|---|
| `transport_kind` | `RuntimeTransportKind` | Declares the listener slot. |
| `local_addr` | `Result<SocketAddr, RuntimeError>` | Local bind address. |
| `accept` | `Result<BoxedFramedTransport, RuntimeError>` | Accepts one framed transport. |

### `NnrpSubmit`

| Field | Type | Description |
|---|---|---|
| `frame_id` | `u32` | Submitted frame id. |
| `metadata` | `FrameSubmitMetadata` | Submit metadata. |
| `body` | `Vec<u8>` | Submit body bytes. |

### `NnrpServerPolicy`

| Method | Parameter | Returns | Description |
|---|---|---|---|
| `validate_session_open` | `&SessionOpenMetadata` | `Result<(), u32>` | Rejects session open with an application error code when needed. |

## Example

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

## Common Pitfalls

::: warning
1. Timed-out frames need `send_result_drop`; do not silently skip them.
2. `receive_*` methods read sequentially. Build an event loop when submit/cancel/patch/migrate can interleave.
3. CPU/GPU blocking work should use a dedicated pool or `spawn_blocking`.
:::
