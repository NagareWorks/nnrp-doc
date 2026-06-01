# Rust — Client API

The Rust runtime client owns transport setup, session open, submit/cancel/patch/migrate operations,
event receive, and graceful close. This page documents the application-facing methods first; core
metadata types are linked to [Core Types](./core).

## Dependencies

```toml
[dependencies]
nnrp-core = "1.0.0-preview.3.1"
nnrp-runtime = "1.0.0-preview.3.1"
nnrp-transport-quic = "1.0.0-preview.3.1"
tokio = { version = "1", features = ["macros", "rt-multi-thread", "net", "io-util"] }
```

## Client Workflow

1. Build [`NnrpClientConfig`](#nnrpclientconfig).
2. Connect with [`NnrpClient::connect_tcp`](#nnrpclient-connect-tcp), the QUIC provider, or a custom
   [`FramedTransport`](#framedtransport).
3. Call [`open_session`](#nnrpclient-open-session).
4. Submit with [`NnrpClientSession::submit`](#nnrpclientsession-submit).
5. Receive output with [`await_event`](#nnrpclientsession-await-event) or
   [`await_result`](#nnrpclientsession-await-result).
6. Close with [`close`](#nnrpclientsession-close).

## `NnrpClient::connect_tcp`

Connects to a TCP endpoint using the runtime TCP transport.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `addr` | `impl tokio::net::ToSocketAddrs` | Yes | Socket address | Target NNRP endpoint. |
| `config` | [`NnrpClientConfig`](#nnrpclientconfig) | Yes | `transport` should be `Tcp` | Client runtime configuration. |

| Returns | Errors |
|---|---|
| `Result<NnrpClient, RuntimeError>` | DNS, connect, transport, or config mismatch errors. |

```rust
let config = NnrpClientConfig::default().with_transport(RuntimeTransportKind::Tcp);
let client = NnrpClient::connect_tcp("127.0.0.1:4433", config).await?;
```

## QUIC Provider Connect

The default QUIC implementation lives in `nnrp-transport-quic` so the transport-neutral runtime does
not force Quinn/Rustls into every build.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `endpoint` | `impl ToSocketAddrs` or provider endpoint type | Yes | QUIC endpoint | Target endpoint. |
| `endpoint_config` | `QuicClientEndpointConfig` | Yes | Certificate and ALPN config | QUIC client configuration. |
| `config` | [`NnrpClientConfig`](#nnrpclientconfig) | Yes | `transport = Quic` | Runtime configuration. |

| Returns | Errors |
|---|---|
| `Result<NnrpClient, RuntimeError>` | Certificate, connect, ALPN, or config mismatch errors. |

```rust
let endpoint_config =
    QuicClientEndpointConfig::localhost_with_root_certificate(server_certificate_der);
let config = NnrpClientConfig::default().with_transport(RuntimeTransportKind::Quic);
let client = QuicProvider::connect("127.0.0.1:4433", endpoint_config, config).await?;
```

## `NnrpClient::from_transport`

Wraps a custom framed transport.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `transport` | `T: FramedTransport + 'static` | Yes | Any runtime transport | Custom TCP, QUIC, native, or test transport. |
| `config` | [`NnrpClientConfig`](#nnrpclientconfig) | Yes | Must match transport kind | Client runtime configuration. |

| Returns | Errors |
|---|---|
| `Result<NnrpClient, RuntimeError>` | Transport-kind mismatch or invalid config. |

```rust
let client = NnrpClient::from_transport(my_transport, config)?;
```

## `NnrpClient::open_session`

Consumes the connected client and opens a runtime session.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Uses the client configuration captured during connect. |

| Returns | Errors |
|---|---|
| `Result<NnrpClientSession, RuntimeError>` | Session open rejection or transport errors. |

```rust
let mut session = client.open_session().await?;
```

## `NnrpClientSession::submit`

Submits one operation and returns the accepted frame id. It does not wait for the result.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `metadata` | `FrameSubmitMetadata` | Yes | Valid frame metadata | Submit metadata from `nnrp-core`. |
| `body` | `Vec<u8>` | Yes | May be empty for metadata-only requests | Serialized request body. |

| Returns | Errors |
|---|---|
| `Result<u32, RuntimeError>` | Serialization, flow-control, lifecycle, or transport errors. |

```rust
let frame_id = session
    .submit(FrameSubmitMetadata::default(), b"delta".to_vec())
    .await?;
```

## `NnrpClientSession::await_event`

Receives the next session event.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Reads the next runtime packet. |

| Returns | Errors |
|---|---|
| `Result<NnrpClientEvent, RuntimeError>` | Transport, parse, or unexpected lifecycle errors. |

```rust
match session.await_event().await? {
    NnrpClientEvent::Result(result) => handle_result(result),
    NnrpClientEvent::ResultDrop { frame_id } => handle_drop(frame_id),
    NnrpClientEvent::FlowUpdate(update) => apply_flow_update(update),
}
```

## `NnrpClientSession::await_result`

Receives the next `RESULT_PUSH`. Use [`await_event`](#nnrpclientsession-await-event) when result
drops or flow updates are expected.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Reads until the next packet. |

| Returns | Errors |
|---|---|
| `Result<NnrpResult, RuntimeError>` | `UnexpectedMessage` for drop/flow-update, plus transport or parse errors. |

```rust
let result = session.await_result().await?;
```

## `NnrpClientSession::patch_session`

Sends a session patch and waits for the ack.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `patch` | `SessionPatchMetadata` | Yes | Valid patch metadata | Runtime session parameter update. |

| Returns | Errors |
|---|---|
| `Result<SessionPatchAckMetadata, RuntimeError>` | Rejection, malformed ack, or transport errors. |

```rust
let ack = session.patch_session(patch_metadata).await?;
```

## `NnrpClientSession::migrate_transport`

Requests migration to another transport.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `request` | `SessionMigrateMetadata` | Yes | Built manually or with `build_migration_request` | Migration metadata. |

| Returns | Errors |
|---|---|
| `Result<SessionMigrateAckMetadata, RuntimeError>` | Rejection, unsupported transport, or transport errors. |

```rust
let request = session.build_migration_request(TransportId::Quic, last_frame_id, now_us);
let ack = session.migrate_transport(request).await?;
```

## `NnrpClientSession::close`

Gracefully closes the session and transport.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Consumes the session. |

| Returns | Errors |
|---|---|
| `Result<(), RuntimeError>` | Close or transport errors. |

```rust
session.close().await?;
```

## Core Types

### `NnrpClientConfig`

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
| `cache_hints` | `Vec<CacheObjectKind>` | Empty | Cache object kinds the client expects to use. |

### `FramedTransport`

Custom transport slot used by TCP, QUIC, native, or test implementations.

| Method | Returns | Description |
|---|---|---|
| `transport_kind` | `RuntimeTransportKind` | Declares the transport slot. |
| `read_packet` | `Result<RuntimePacket, RuntimeError>` | Reads one framed packet. |
| `write_packet` | `Result<(), RuntimeError>` | Writes one framed packet. |
| `close` | `Result<(), RuntimeError>` | Closes the transport. |

### `NnrpClientEvent`

| Variant | Data | Description |
|---|---|---|
| `Result` | [`NnrpResult`](#nnrpresult) | Server returned a result. |
| `ResultDrop` | `frame_id` | Server dropped a frame. |
| `FlowUpdate` | `FlowUpdateMetadata` | Server sent credit or backpressure information. |

### `NnrpResult`

| Field | Type | Description |
|---|---|---|
| `frame_id` | `u32` | Result frame id. |
| `metadata` | `ResultPushMetadata` | Result metadata. |
| `body` | `Vec<u8>` | Result body bytes. |

## Common Pitfalls

::: warning
1. `open_session(self)` consumes the client; the current runtime binds one transport to one session.
2. `submit` returns a frame id; it does not wait for output.
3. Use `await_event` instead of `await_result` when drops or flow updates are valid.
4. Prefer `close()` for normal shutdown; reserve `close_transport()` for exceptional paths.
:::
