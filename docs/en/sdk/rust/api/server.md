# Rust — Server API

The server API binds a transport, accepts sessions, receives submits and control messages, and emits
results, progress, flow-control feedback, object/cache events, and close acknowledgements.

## Workflow

1. Build [`NnrpServerConfig`](#nnrpserverconfig).
2. Bind with [`NnrpServer::bind_tcp`](#nnrpserver-bind-tcp) or a transport provider.
3. Accept a session with [`NnrpServer::accept`](#nnrpserver-accept).
4. Receive work with [`receive_submit`](#nnrpserversession-receive-submit).
5. Send output with [`send_result`](#nnrpserversession-send-result), `send_partial_result`, or `send_progress`.
6. Receive runtime-control frames with [`receive_runtime_control`](#runtime-control-methods).
7. Close the session explicitly.

## `NnrpServer::bind_tcp`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `addr` | `impl tokio::net::ToSocketAddrs` | Yes | Socket address | Local TCP bind address. |
| `config` | [`NnrpServerConfig`](#nnrpserverconfig) | Yes | `transport = Tcp` | Server runtime configuration. |

| Returns | Errors |
|---|---|
| `Result<NnrpServer, RuntimeError>` | Bind, listener, transport, or configuration errors. |

```rust
let config = NnrpServerConfig::default().with_transport(RuntimeTransportKind::Tcp);
let server = NnrpServer::bind_tcp("127.0.0.1:4433", config).await?;
```

## Provider Bind

| Provider | Package | Typical method | Description |
|---|---|---|---|
| `TcpProvider` | `nnrp-transport-tcp` | `bind(addr, config)` | TCP listener. |
| `QuicProvider` | `nnrp-transport-quic` | `bind(endpoint_config, config)` | QUIC listener with certificate and ALPN config. |
| `IpcProvider` | `nnrp-transport-ipc` | `bind(endpoint, config)` | Unix socket or Windows named pipe listener. |
| `WebSocketProvider` | `nnrp-transport-websocket` | `bind(endpoint, config)` | Native WebSocket listener for binary frames. |

## `NnrpServer::from_listener`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `listener` | `L: FramedListener + 'static` | Yes | Any framed listener | Custom or provider-created listener. |
| `config` | [`NnrpServerConfig`](#nnrpserverconfig) | Yes | Must match listener kind | Runtime configuration. |

| Returns | Errors |
|---|---|
| `Result<NnrpServer, RuntimeError>` | Listener-kind mismatch or invalid configuration. |

## `NnrpServer::accept`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Accepts one peer and opens one runtime session. |

| Returns | Errors |
|---|---|
| `Result<NnrpServerSession, RuntimeError>` | Accept, session-open rejection, or transport errors. |

## `NnrpServerSession::receive_submit`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Reads the next submit frame. |

| Returns | Errors |
|---|---|
| `Result<NnrpSubmit, RuntimeError>` | Transport, parse, lifecycle, or unexpected-message errors. |

```rust
let submit = session.receive_submit().await?;
```

## `NnrpServerSession::send_result`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `frame_id` | `u32` | Yes | Submitted frame id | Correlates the result. |
| `metadata` | [`ResultPushMetadata`](./core#resultpushmetadata) | Yes | Valid result metadata | Result status and timing metadata. |
| `body` | `Vec<u8>` | Yes | May be empty | Serialized result body. |

| Returns | Errors |
|---|---|
| `Result<(), RuntimeError>` | Lifecycle, serialization, or transport errors. |

```rust
session
    .send_result(submit.frame_id, ResultPushMetadata::default(), output)
    .await?;
```

## Streaming Result Methods

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `send_partial_result` | frame id, metadata, body | `Result<(), RuntimeError>` | Sends incremental result bytes. |
| `send_progress` | metadata, body | `Result<(), RuntimeError>` | Sends progress or status updates. |
| `send_result_drop_reason` | frame id, metadata, body | `Result<(), RuntimeError>` | Sends a structured drop reason. |
| `send_result_drop_reason_with_diagnostics` | frame id, metadata, diagnostics | `Result<(), RuntimeError>` | Sends a drop reason with diagnostic context. |

## Runtime Control Methods

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `receive_cancel` | none | `Result<CancelMetadata, RuntimeError>` | Receives cancellation. |
| `receive_runtime_control` | none | `Result<NnrpRuntimeControl, RuntimeError>` | Receives generic Preview4 control frames with metadata and body. |
| `send_backpressure` | metadata | `Result<(), RuntimeError>` | Tells the client to slow down. |
| `receive_pressure_update` | none | `Result<PressureUpdateMetadata, RuntimeError>` | Receives client-side pressure state. |
| `send_capability` | metadata | `Result<(), RuntimeError>` | Sends supported cost/preference/limit information. |
| `send_route_hint` | metadata | `Result<(), RuntimeError>` | Sends execution or routing hints. |

## Object And Cache Methods

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `send_object_declare` | metadata, body | `Result<(), RuntimeError>` | Declares a runtime object. |
| `send_object_ref` | metadata, body | `Result<(), RuntimeError>` | References an existing object. |
| `send_object_release` | metadata, body | `Result<(), RuntimeError>` | Releases an object reference. |
| `send_object_delta` | metadata, body | `Result<(), RuntimeError>` | Sends object delta bytes. |
| `send_cache_reference` | metadata, body | `Result<(), RuntimeError>` | Sends a cache hit/reference. |
| `send_cache_miss` | metadata, body | `Result<(), RuntimeError>` | Reports a miss. |
| `send_cache_invalidate` | metadata, body | `Result<(), RuntimeError>` | Invalidates a cache entry. |

## Lifecycle Methods

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `receive_close` | none | `Result<SessionCloseMetadata, RuntimeError>` | Waits for client close. |
| `ack_close` | close metadata | `Result<(), RuntimeError>` | Acknowledges close. |
| `close` | none | `Result<(), RuntimeError>` | Closes the server session. |

## `NnrpServerConfig`

| Field | Type | Default | Description |
|---|---|---|---|
| `transport` | `RuntimeTransportKind` | `Tcp` | Runtime transport slot. |
| `supported_profiles` | `Vec<u16>` | Standard token profile | Accepted profiles. |
| `supported_cache_objects` | `Vec<CacheObjectKind>` | Empty | Accepted cache object kinds. |
| `schema_registry` | `SchemaRegistry` | Standard registry | Accepted schemas. |
| `max_in_flight_operations` | `u16` | `4` | In-flight operation limit. |
| `granted_operation_credit` | `u16` | `2` | Initial operation credit. |
| `lease_ttl_ms` | `u32` | `30000` | Lease TTL. |
| `resume_window_ms` | `u32` | `120000` | Resume window. |
| `application_policy` | `Arc<dyn NnrpServerPolicy>` | Allow-all | Application validation policy. |

## `NnrpSubmit`

| Field | Type | Description |
|---|---|---|
| `frame_id` | `u32` | Submitted frame id. |
| `metadata` | [`FrameSubmitMetadata`](./core#framesubmitmetadata) | Submit metadata. |
| `body` | `Vec<u8>` | Submit body bytes. |

::: warning
`receive_submit` is intentionally narrow. If submit, cancel, progress, and close can interleave in
your application, build a loop that dispatches runtime packets into the appropriate receive/send
methods instead of assuming a single request/result sequence.
:::
