# Rust — Server API

The server API binds a transport, accepts sessions, receives submits and control messages, and emits
results, progress, flow-control feedback, object/cache events, and close acknowledgements.

## Workflow

1. Build [`NnrpServerOptions`](#nnrpserveroptions) with one application endpoint and a provider route set.
2. Register the transport providers compiled into this deployment.
3. Listen with [`NnrpServer::listen`](#nnrpserver-listen); Auto/Prefer opens every eligible route atomically.
4. Accept a session with [`NnrpServer::accept`](#nnrpserver-accept).
5. Receive work with [`receive_submit`](#nnrpserversession-receive-submit) or dispatch [`await_event`](#nnrpserversession-await-event).
6. Send output through the returned [`NnrpServerOperation`](#nnrpserveroperation-replies).
7. Receive runtime-control frames with [`receive_runtime_control`](#runtime-control-methods).
8. Close the session explicitly.

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

The returned `NnrpServer` is one logical server over an atomic listener set. Auto/Prefer opens every eligible installed
route, Force opens only the named route, and any required bind failure closes every listener opened by that call.
`accept` waits across the set and each accepted session adopts exactly one carrier connection.

## `NnrpServerOptions`

| Field | Type | Required | Description |
|---|---|---:|---|
| `endpoint` | `NnrpEndpoint` | Yes | Application-facing `nnrp://` or `nnrps://` endpoint. |
| `provider_routes` | `ServerProviderRoutes` | No | Per-carrier bind locator and server-security configuration. |
| `transport_policy` | `TransportPolicy` | No | Listener-set eligibility policy. |
| `session` | `NnrpServerConfig` | No | Transport-neutral accepted-session defaults. |

`ServerProviderRoutes` is a `BTreeMap<TransportId, ServerProviderRoute>`. `ServerProviderRoute` has exactly
`provider_endpoint: Option<ProviderEndpoint>` and `security: Option<ServerTransportSecurity>`. A singular provider
endpoint or role-wide security object is not part of `NnrpServerOptions`.

`ServerTransportSecurity` has exactly `certificate_der: Vec<u8>` and `private_key_pkcs8_der: Vec<u8>`. Both owned byte
vectors must be non-empty. Supplying it enables TCP TLS and is required for QUIC and native WSS routes.

A route for a transport whose provider is absent remains visible as `local-unavailable`. A missing required locator for
an installed, otherwise eligible provider is a listen configuration error and triggers atomic rollback.

## Low-Level `NnrpServer::bind_tcp`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `addr` | `impl tokio::net::ToSocketAddrs` | Yes | Socket address | Local TCP bind address. |
| `config` | [`NnrpServerConfig`](#nnrpserverconfig) | Yes | Transport-neutral | Server runtime configuration. |

| Returns | Errors |
|---|---|
| `Result<NnrpServer, RuntimeError>` | Bind, listener, transport, or configuration errors. |

```rust
let config = NnrpServerConfig::default();
let server = NnrpServer::bind_tcp("127.0.0.1:4433", config).await?;
```

This method creates a one-listener logical set for provider tests, diagnostics, and controlled single-carrier
deployments. Production multi-provider hosts use `listen`.

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
| `config` | [`NnrpServerConfig`](#nnrpserverconfig) | Yes | Transport-neutral | Runtime configuration. |

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

Every accepted session exposes `active_transport_id() -> TransportId`. The value identifies the listener that accepted
the carrier and must match the negotiated `active_transport_id`; it is never inferred from listener preference order.

`bound_provider_endpoints() -> &BTreeMap<TransportId, ProviderEndpoint>` returns the actual endpoint of every listener
in the logical set, including operating-system-assigned ports. A terminal provider-listener failure fails the logical
server and closes the remaining set; peer handshake rejection does not.

## `NnrpServerSession::await_event`

```rust
pub async fn await_event(&mut self) -> Result<NnrpServerEvent, RuntimeError>
```

Returns the next submit, control, runtime-object, cache, recovery, or close event in wire order.
This is the application-facing server receive API. Native FFI bindings may poll bounded event batches
internally, but they must project those batches back into this ordered single-event contract.

## `NnrpServerSession::receive_submit`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Reads the next submit frame. |

| Returns | Errors |
|---|---|
| `Result<NnrpServerOperation, RuntimeError>` | Transport, parse, lifecycle, or unexpected-message errors. |

```rust
let operation = session.receive_submit().await?;
```

`receive_submit` is a narrow convenience for hosts that only admit submit traffic at that point in
their state machine. Hosts that permit interleaved control, object, cache, and close frames use
`await_event` and dispatch the returned `NnrpServerEvent`.

## `NnrpServerOperation` Replies

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `metadata` | [`ResultPushMetadata`](./core#resultpushmetadata) | Yes | Valid result metadata | Result status and timing metadata. |
| `body` | `Vec<u8>` | Yes | May be empty | Serialized result body. |

| Returns | Errors |
|---|---|
| `Result<(), RuntimeError>` | Lifecycle, serialization, or transport errors. |

```rust
operation
    .send_result(&mut session, ResultPushMetadata::default(), output)
    .await?;
```

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `send_result` | session, metadata, body | `Result<(), RuntimeError>` | Sends the operation's sole terminal result. |
| `send_result_drop` | session, metadata, diagnostic | `Result<(), RuntimeError>` | Sends the operation's terminal drop reason. |
| `send_progress` | session, metadata, body | `Result<(), RuntimeError>` | Sends non-terminal progress for this operation. |
| `send_partial_result` | session, metadata, body | `Result<(), RuntimeError>` | Sends incremental result bytes for this operation. |

The operation validates session ownership and `operation_id` before writing. It cannot be cloned,
and exactly one terminal method may succeed. Operation-scoped reply methods are not exposed on
`NnrpServerSession`.

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
| `supported_profiles` | `Vec<u16>` | Standard token profile | Accepted profiles. |
| `supported_cache_objects` | `Vec<CacheObjectKind>` | Empty | Accepted cache object kinds. |
| `schema_registry` | `SchemaRegistry` | Standard registry | Accepted schemas. |
| `max_in_flight_operations` | `u16` | `4` | In-flight operation limit. |
| `granted_operation_credit` | `u16` | `2` | Initial operation credit. |
| `lease_ttl_ms` | `u32` | `30000` | Lease TTL. |
| `resume_window_ms` | `u32` | `120000` | Resume window. |
| `application_policy` | `Arc<dyn NnrpServerPolicy>` | Allow-all | Application validation policy. |

## `NnrpServerOperation`

| Field | Type | Description |
|---|---|---|
| `frame_id` | `u32` | Submitted frame id. |
| `operation_id` | `u64` | Non-zero operation identity from submit metadata. |
| `submit` | `NnrpRuntimeEvent` | Complete owned `FRAME_SUBMIT` event, including metadata and body. |

::: warning
`receive_submit` is intentionally selective. If submit, control, object, cache, lifecycle, and close
events can interleave, use `await_event`; `receive_submit` retains skipped events in the same session
queue and never discards them.
:::
