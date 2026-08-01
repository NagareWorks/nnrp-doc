# Rust — Client API

The client API starts a transport, opens one runtime session, submits work, receives events, and
sends control-plane updates. Core metadata types are documented in [Core Types](./core).

## Dependencies

```toml
[dependencies]
nnrp-core = "1.0.0-preview.4.17"
nnrp-runtime = "1.0.0-preview.4.17"
nnrp-transport-tcp = "1.0.0-preview.4.17"
nnrp-transport-quic = "1.0.0-preview.4.17"
nnrp-transport-ipc = "1.0.0-preview.4.17"
nnrp-transport-websocket = "1.0.0-preview.4.17"
tokio = { version = "1", features = ["macros", "rt-multi-thread", "net", "io-util"] }
```

## Workflow

1. Build [`NnrpClientOptions`](#nnrpclientoptions) with one application endpoint and a provider route set.
2. Register the transport providers compiled into this deployment.
3. Connect with [`NnrpClient::connect`](#nnrpclient-connect); Auto/Prefer evaluates every eligible provider route.
4. Open a session with [`NnrpClient::open_session`](#nnrpclient-open-session).
5. Submit work with [`NnrpClientSession::submit`](#nnrpclientsession-submit).
6. Receive output and control events with [`await_event`](#nnrpclientsession-await-event).
7. Close the session with [`close`](#nnrpclientsession-close).

## `NnrpClient::connect`

```rust
let options = NnrpClientOptions {
    endpoint: "nnrps://runtime.example/session/default".parse()?,
    provider_routes: ClientProviderRoutes::from([
        (TransportId::Quic, ClientProviderRoute::native_tls("runtime.example", trusted_certificate_der.clone())),
        (TransportId::Tcp, ClientProviderRoute::native_tls("runtime.example", trusted_certificate_der)),
    ]),
    transport_policy: TransportPolicy::Auto,
    session: NnrpClientConfig::default(),
};

let client = NnrpClient::connect(
    options,
    [Arc::new(QuicProvider::default()), Arc::new(TcpProvider::default())],
).await?;
```

`NnrpClient::connect` resolves and validates every installed route, probes every eligible Auto/Prefer candidate, and
adopts exactly one selected carrier into the returned runtime client. Force policies never fall back. Candidate
diagnostics remain available from `client.transport_selection()`.

The provider collection is explicit in Rust because Cargo dependencies cannot register themselves at runtime. Every
official provider implements the shared client-provider trait; route keys and provider transport IDs must match.

## `NnrpClientOptions`

| Field | Type | Required | Description |
|---|---|---:|---|
| `endpoint` | `NnrpEndpoint` | Yes | Application-facing `nnrp://` or `nnrps://` endpoint. |
| `provider_routes` | `ClientProviderRoutes` | No | Per-carrier locator and peer-security configuration. |
| `transport_policy` | `TransportPolicy` | No | Auto, preference, or force policy. |
| `session` | `NnrpClientConfig` | No | Transport-neutral session defaults. |

`ClientProviderRoutes` is a `BTreeMap<TransportId, ClientProviderRoute>`. `ClientProviderRoute` has exactly
`provider_endpoint: Option<ProviderEndpoint>` and `security: Option<ClientTransportSecurity>`. It is not valid to put
one provider endpoint or one security object on `NnrpClientOptions` itself.

`ClientTransportSecurity` has exactly `server_name: String` and `trusted_certificate_der: Vec<u8>`. Both values must be
non-empty and the certificate bytes are owned by the security value. Supplying it enables TCP TLS and is required for
QUIC and native WSS routes.

A route for a transport whose provider is not present remains a `local-unavailable` candidate. When several checks
fail, the protocol rejection registry order applies, so `route-unresolved` precedes `security-unsatisfied`.

## Low-Level `NnrpClient::connect_tcp`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `addr` | `impl tokio::net::ToSocketAddrs` | Yes | Socket address | Target TCP endpoint. |
| `config` | [`NnrpClientConfig`](#nnrpclientconfig) | Yes | Transport-neutral | Client runtime configuration. |

| Returns | Errors |
|---|---|
| `Result<NnrpClient, RuntimeError>` | DNS, connect, transport, or configuration errors. |

```rust
let config = NnrpClientConfig::default();
let client = NnrpClient::connect_tcp("127.0.0.1:4433", config).await?;
```

This method is the singular TCP provider surface. It does not implement route selection and is intended for provider
tests, diagnostics, and controlled single-carrier deployments.

## Provider Connect

Use these singular provider calls for provider tests, diagnostics, or controlled single-carrier deployments. Production
provider selection starts from `NnrpClient::connect`.

| Provider | Package | Typical method | Description |
|---|---|---|---|
| `TcpProvider` | `nnrp-transport-tcp` | `connect(addr, config)` | TCP framed transport. |
| `QuicProvider` | `nnrp-transport-quic` | `connect(endpoint, endpoint_config, config)` | QUIC framed transport. |
| `IpcProvider` | `nnrp-transport-ipc` | `connect(endpoint, config)` | Unix socket or Windows named pipe. |
| `WebSocketProvider` | `nnrp-transport-websocket` | `connect(endpoint, config)` | Native WebSocket binary transport. |

```rust
let config = NnrpClientConfig::default();
let client = IpcProvider::connect("unix:///tmp/nnrp.sock".parse()?, config).await?;
```

## `NnrpClient::from_transport`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `transport` | `T: FramedTransport + 'static` | Yes | Any framed transport | Custom or provider-created transport. |
| `config` | [`NnrpClientConfig`](#nnrpclientconfig) | Yes | Transport-neutral | Runtime configuration. |

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
| `request` | `NnrpSubmitRequest` | Yes | Valid typed submit request | Identity, header context, encoded metadata, and owned body. |

| Returns | Errors |
|---|---|
| `Result<u32, RuntimeError>` | Serialization, flow-control, lifecycle, or transport errors. |

```rust
let frame_id = session
    .submit(request)
    .await?;
```

## `NnrpClientSession::submit_nowait`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `request` | `NnrpSubmitRequest` | Yes | Valid typed submit request | Identity, header context, encoded metadata, and owned body. |

| Returns | Errors |
|---|---|
| `Result<u32, RuntimeError>` | Returns after the frame is written; result is received later through events. |

## `NnrpClientSession::submit_encoded`

This advanced method accepts already encoded submit metadata and allocates the next frame id. Normal
applications should prefer `submit` with a profile-built `NnrpSubmitRequest`.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `metadata` | [`FrameSubmitMetadata`](./core#framesubmitmetadata) | Yes | Valid submit metadata | Operation metadata. |
| `body` | `Vec<u8>` | Yes | May be empty | Serialized request body. |

| Returns | Errors |
|---|---|
| `Result<u32, RuntimeError>` | Returns the allocated frame id after the frame is written. |

`submit_encoded_nowait` is the same encoded boundary with explicit fire-and-poll naming.

## `NnrpClientSession::submit_encoded_with_frame_id`

Use this method when an embedding or coarse FFI boundary already owns the frame identifier. It
performs the same validation and carrier write as `submit_nowait`; it does not bypass the session
runtime.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `frame_id` | `u32` | Yes | Non-zero and not below the next allocatable id | Frame identifier written into the NNRP common header. The first explicit id may skip ahead. |
| `metadata` | [`FrameSubmitMetadata`](./core#framesubmitmetadata) | Yes | Valid submit metadata | Operation metadata. |
| `body` | `Vec<u8>` | Yes | May be empty | Serialized request body. |

| Returns | Errors |
|---|---|
| `Result<u32, RuntimeError>` | Returns the supplied id after the frame is written. Rejects zero, reuse, or backward movement and preserves the current allocator on failure. |

A successful explicit submission advances the session allocator to `frame_id + 1`, so later submit
calls cannot reuse the explicit id. This is the canonical path used by the coarse native FFI submit
call; bindings must not construct or write the packet themselves.

## `NnrpClientSession::await_event`

Use this method for Preview4 sessions. It can receive normal results plus runtime-control,
object/cache, and scheduling events.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Reads the next runtime packet. |

| Returns | Errors |
|---|---|
| `Result<NnrpRuntimeEvent, RuntimeError>` | Transport, parse, lifecycle, or unexpected-message errors. |

```rust
match session.await_event().await? {
    NnrpRuntimeEvent {
        metadata: NnrpRuntimeEventMetadata::PartialResult(metadata),
        tail: NnrpRuntimeEventTail::Body(body),
        ..
    } => handle_partial(metadata, body),
    NnrpRuntimeEvent {
        metadata: NnrpRuntimeEventMetadata::Progress(metadata),
        tail: NnrpRuntimeEventTail::Body(body),
        ..
    } => update_progress(metadata, body),
    NnrpRuntimeEvent {
        metadata: NnrpRuntimeEventMetadata::ResultDropReason(metadata),
        tail: NnrpRuntimeEventTail::Diagnostic(body),
        ..
    } => record_drop(metadata, body),
    _ => {}
}
```

## `NnrpClientSession::await_result`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Reads the next event and requires it to be a terminal result. |

| Returns | Errors |
|---|---|
| `Result<NnrpResult, RuntimeError>` | Returns `Success`, `Cancelled`, `Dropped`, or `Error` without flattening the terminal event. Use `await_event` when non-terminal events are valid. |

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
| `requested_session_id` | `u32` | `0` | Requested session id. |
| `profile_id` | `u16` | Standard token profile | Requested profile. |
| `schema_id` / `schema_version` | `u32` | Standard registry values | Schema identity. |
| `priority_class` | `SessionPriorityClass` | `Balanced` | Scheduling priority. |
| `default_deadline_ms` | `u32` | `500` | Default operation deadline. |
| `max_in_flight_operations` | `u16` | `4` | Local in-flight limit. |
| `lease_ttl_hint_ms` | `u32` | `30000` | Lease TTL hint. |
| `allow_resume` | `bool` | `false` | Enables recovery semantics. |
| `cache_hints` | `Vec<CacheObjectKind>` | Empty | Cache object kinds expected by this client. |

## `CachePolicyOptions`

`CachePolicyOptions` is a local opt-in value and never performs an implicit lookup or emits a frame.

| Rust field | Type | Default |
| --- | --- | --- |
| `enabled` | `bool` | `false` |
| `reuse_scope` | `Option<CacheReuseScope>` | `None` |
| `expiration_hint_ms` | `u64` | `0` |
| `invalidation_reason` | `CachePolicyInvalidationReason` | `Explicit` |

`CachePolicyInvalidationReason` has `Explicit`, `DependencyInvalidated`, `LeaseExpired`,
`VersionMismatch`, and `SchemaMismatch`. `CachePolicyOptions::validate` enforces the shared contract.

## `NnrpResult`

| Field | Type | Description |
|---|---|---|
| `operation_id` | `u64` | Non-zero submitted operation identity. |
| `terminal_state` | `ResultTerminalState` | `Success`, `Cancelled`, `Dropped`, or `Error`. |
| `event` | `NnrpTerminalEvent` | Closed `Runtime(NnrpRuntimeEvent) \| Lifecycle(OperationLifecycleEvent)` terminal evidence. |

Successful results preserve `RESULT_PUSH` in the `Runtime` variant. Non-success results preserve the
wire event or exact local lifecycle event that established the state. The SDK never fabricates a
wire header or successful result metadata.

## `OperationLifecycleEvent`

| Field | Type | Description |
|---|---|---|
| `operation_id` | `u64` | Non-zero operation identity. |
| `state` | `OperationState` | Exact local lifecycle state. |

This is a local role notification, not a wire event. It never carries or fabricates a
`RuntimeFrameHeader`. Terminal mapping is `Completed -> Success`, `Cancelled -> Cancelled`,
`Superseded -> Dropped`, and `Failed -> Error`.
