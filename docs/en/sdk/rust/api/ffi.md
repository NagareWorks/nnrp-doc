# Rust — FFI / Native Artifacts

`nnrp-ffi` exposes Rust-owned protocol and runtime behavior through a C-compatible ABI for Python,
C#, Unity, Node native loaders, and future language bindings. Preview4 keeps the FFI boundary coarse:
callers work through handles, events, and owned buffers instead of crossing the ABI for every small
field.

## Cargo

```toml
[dependencies]
nnrp-ffi = "1.0.0-preview.4.4"
```

## Native Artifact Shape

Preview4 publishes transport-scoped native artifacts. The role package decides whether it is a
client or server at runtime; the artifact name tells you which transport implementation it contains.

| Transport | Artifact family |
|---|---|
| TCP | `nnrp-ffi-transport-tcp-native-<platform>-1.0.0-preview.4.4.zip` |
| QUIC | `nnrp-ffi-transport-quic-native-<platform>-1.0.0-preview.4.4.zip` |
| IPC | `nnrp-ffi-transport-ipc-native-<platform>-1.0.0-preview.4.4.zip` |
| WebSocket | `nnrp-ffi-transport-websocket-native-<platform>-1.0.0-preview.4.4.zip` |

Each package contains the native library, `nnrp_ffi.h`, and a manifest that declares platform,
architecture, transport, library name, and exported symbols. Downstream SDKs should validate the
manifest before loading the library.

The manifest also requires this exact provider metadata object:

```json
{
  "provider": {
    "id": "nnrp.transport.tcp.native",
    "cost": { "model_id": 0, "units": "0" },
    "preference_rank": 2,
    "limits": { "max_frame_bytes": "67108864" },
    "limitations": ["requires-tcp", "native-host-only"]
  }
}
```

The two `u64` values use canonical decimal strings so JavaScript does not lose precision. Missing fields, unknown
limitation values, a zero `max_frame_bytes`, or non-zero cost units with cost model `0` make the artifact invalid.
Loaders must preserve this object in provider and candidate diagnostics.

## ABI Types

| Type | Description |
|---|---|
| `NnrpProtocolVersion` | Current major version and wire format. |
| `NnrpHandle` | Typed handle with kind, id, generation, and flags. |
| `NnrpBufferView` | Borrowed byte slice valid only during the call. |
| `NnrpFfiStatus` | Status code, error family, protocol error, and detail code. |
| `NnrpFfiDiagnostic` | Status plus related connection/session/operation/frame ids. |
| `NnrpEvent` | Callback/polling event with handles, message type, frame id, owned payload handle/view, and diagnostics. |

Non-empty buffer views must use non-null pointers. A non-empty runtime-frame event owns its payload
through `payload_owner`. Bindings copy the payload and call `nnrp_buffer_release(payload_owner)`
exactly once before returning an application event. A callback may inspect the view only during the
callback; it still releases the owner after copying.

## Runtime Requests

| Request | Purpose |
|---|---|
| `NnrpClientConnectRequest` | Creates a client connection handle. |
| `NnrpSessionOpenRequest` | Opens a client session. |
| `NnrpSubmitRequest` | Submits one operation. |
| `NnrpClientCancelRequest` | Cancels client work. |
| `NnrpServerBindRequest` | Creates a server handle. |
| `NnrpServerAcceptRequest` | Accepts a server session. |
| `NnrpServerReceiveSubmitRequest` | Receives a submit and creates an operation handle. |
| `NnrpServerSendResultRequest` | Sends result bytes. |
| `NnrpControlRequest` | Sends or validates generic control-plane frames. |
| `NnrpRuntimeFrameSendRequest` | Sends one typed runtime, control, object, cache, or inherited `FLOW_UPDATE` frame through a session or operation handle. Fields are `handle`, `message_type`, `frame_id`, and `payload`. |

`NnrpRuntimeFrameSendRequest.payload` contains the complete encoded metadata and declared tail.
`nnrp_runtime_frame_send` validates the message type, metadata layout, declared lengths, handle
scope, and sender role in one call. Preview4 runtime-control and object/cache frames keep the
bidirectional semantics frozen in the frame registry. It snapshots the payload before returning;
no decoded event aliases caller-owned memory.

For `FLOW_UPDATE`, `payload` is the complete encoded `FlowUpdateMetadata`. The FFI does not expose
separate client/server flow-update send functions; both roles use this canonical carrier-backed
entry point.

## Transport-Scoped FFI

Transport-scoped artifacts must expose a reachable framed transport API. Compiling a transport
feature or writing its name into a manifest is not sufficient.

### Requests And Results

The ABI extends `NnrpHandleKind` with these frozen values: `TransportConnection = 10`,
`TransportListener = 11`, and `TransportSecurityConfig = 12`. Transport IDs remain `Quic = 1`,
`Tcp = 2`, `Ipc = 3`, and `WebSocket = 4`.

The C layout is the Rust `#[repr(C)]` layout below. Every `flags` and `reserved0` field must be
zero. Buffer views are borrowed only for the duration of the call.

```c
typedef struct {
  uint32_t transport_id;
  uint32_t flags;
  NnrpBufferView endpoint;
  NnrpHandle config;
  uint64_t max_packet_bytes;
  uint32_t timeout_ms;
  uint32_t reserved0;
} NnrpTransportOpenRequest;

typedef struct {
  NnrpHandle listener;
  uint32_t timeout_ms;
  uint32_t reserved0;
} NnrpTransportAcceptRequest;

typedef struct {
  NnrpHandle connection;
  const NnrpBufferView *frames;
  uint32_t frame_count;
  uint32_t flags;
} NnrpTransportWriteBatchRequest;

typedef struct {
  NnrpHandle connection;
  uint32_t max_frames;
  uint32_t timeout_ms;
  uint64_t max_bytes;
} NnrpTransportReadBatchRequest;

typedef struct {
  NnrpHandle payload_owner;
  NnrpBufferView payload;
  uint32_t frame_count;
  uint32_t reserved0;
} NnrpTransportFrameBatch;

typedef struct {
  NnrpTransportOpenRequest open;
  uint32_t sample_count;
  uint32_t probe_payload_bytes;
} NnrpTransportProbeRequest;

typedef struct {
  uint32_t sample_count;
  uint32_t success_count;
  uint64_t median_throughput_bytes_per_second;
  uint64_t median_rtt_microseconds;
} NnrpTransportProbeResult;

typedef struct {
  uint32_t transport_id;
  uint32_t flags;
  NnrpBufferView server_name;
  NnrpBufferView trusted_certificate_der;
} NnrpTransportClientSecurityConfigRequest;

typedef struct {
  uint32_t transport_id;
  uint32_t flags;
  NnrpBufferView certificate_der;
  NnrpBufferView private_key_pkcs8_der;
} NnrpTransportServerSecurityConfigRequest;
```

| Type | Frozen fields and behavior |
|---|---|
| `NnrpTransportOpenRequest` | `transport_id`, zero `flags`, UTF-8 `endpoint`, `config`, `max_packet_bytes`, and `timeout_ms`. A zero packet limit selects 64 MiB; a zero timeout selects 30 seconds. `config` is invalid for TCP/IPC, optional for `ws://`, and required for QUIC plus `wss://` listeners. |
| `NnrpTransportAcceptRequest` | Listener handle and `timeout_ms`; zero selects 30 seconds. |
| `NnrpTransportWriteBatchRequest` | Connection handle, pointer to `NnrpBufferView` entries, and `frame_count`. Every entry is one complete NNRP packet including its common header. |
| `NnrpTransportReadBatchRequest` | Connection handle, `max_frames`, `max_bytes`, and `timeout_ms`. Zero values select 16 frames, 64 MiB, and 30 seconds. |
| `NnrpTransportFrameBatch` | Owned buffer handle/view and frame count. The buffer contains repeated little-endian `u32 packet_len` followed by one complete NNRP packet. |
| `NnrpTransportProbeRequest` | Open request plus `sample_count` and `probe_payload_bytes`; zero selects 3 samples and 32 KiB. `sample_count` must not exceed 32 and the payload must not exceed the effective packet limit. |
| `NnrpTransportProbeResult` | Sample count, success count, median throughput bytes per second, and median RTT microseconds. |
| `NnrpTransportClientSecurityConfigRequest` | `transport_id`, UTF-8 `server_name`, and one trusted DER certificate. Valid only for QUIC and secure WebSocket clients. |
| `NnrpTransportServerSecurityConfigRequest` | `transport_id`, one DER certificate and one PKCS#8 DER private key. Valid only for QUIC and secure WebSocket listeners. |

The endpoint scheme must match the artifact transport: TCP uses `tcp://`, QUIC uses `quic://`, IPC
uses `unix://` or `npipe://`, and WebSocket uses `ws://` or `wss://`. Platform-incompatible IPC
schemes fail before a handle is created. Transport-specific security configuration is supplied by a
typed configuration handle created by `nnrp_transport_client_security_config_create` or
`nnrp_transport_server_security_config_create`. The handle is immutable and closed through
`nnrp_transport_close`. TCP, IPC, and `ws://` require an invalid configuration handle; QUIC and
`wss://` require the matching client/server configuration. An artifact must not silently disable
certificate verification.

`NnrpTransportFrameBatch.payload_owner` is released exactly once with `nnrp_buffer_release`; its
view remains valid until that release. A successful read with no packets is not returned: timeout,
orderly peer close, and transport failure are distinct status results. Write preserves array order
and either accepts the complete batch or returns the first failed frame index in status detail.

### Functions

The exact signatures are:

```c
NnrpFfiStatus nnrp_transport_client_security_config_create(
  NnrpTransportClientSecurityConfigRequest request, NnrpHandle *out_config);
NnrpFfiStatus nnrp_transport_server_security_config_create(
  NnrpTransportServerSecurityConfigRequest request, NnrpHandle *out_config);
NnrpFfiStatus nnrp_transport_probe(
  NnrpTransportProbeRequest request, NnrpTransportProbeResult *out_result);
NnrpFfiStatus nnrp_transport_connect(
  NnrpTransportOpenRequest request, NnrpHandle *out_connection);
NnrpFfiStatus nnrp_transport_listen(
  NnrpTransportOpenRequest request, NnrpHandle *out_listener);
NnrpFfiStatus nnrp_transport_accept(
  NnrpTransportAcceptRequest request, NnrpHandle *out_connection);
NnrpFfiStatus nnrp_transport_listener_endpoint(
  NnrpHandle listener, NnrpHandle *out_buffer, NnrpBufferView *out_endpoint);
NnrpFfiStatus nnrp_transport_write_batch(NnrpTransportWriteBatchRequest request);
NnrpFfiStatus nnrp_transport_read_batch(
  NnrpTransportReadBatchRequest request, NnrpTransportFrameBatch *out_batch);
NnrpFfiStatus nnrp_transport_close(NnrpHandle handle);
```

| Function | Description |
|---|---|
| `nnrp_transport_probe` | Connects, exchanges protocol `TRANSPORT_PROBE` / `TRANSPORT_PROBE_ACK` frames, and returns measured metrics. |
| `nnrp_transport_connect` | Opens a Rust-owned framed connection and returns a transport-connection handle. |
| `nnrp_transport_listen` | Opens a Rust-owned framed listener and returns a transport-listener handle. |
| `nnrp_transport_accept` | Accepts one connection from a listener. |
| `nnrp_transport_listener_endpoint` | Snapshots the normalized bound endpoint, including an OS-assigned port, into an owned UTF-8 buffer. |
| `nnrp_transport_write_batch` | Validates and writes complete NNRP packets in one ABI call. |
| `nnrp_transport_read_batch` | Reads complete NNRP packets into one owned batch buffer. |
| `nnrp_transport_close` | Idempotently closes a transport connection or listener handle. |
| `nnrp_transport_client_security_config_create` | Creates an immutable QUIC/WSS client security configuration handle. |
| `nnrp_transport_server_security_config_create` | Creates an immutable QUIC/WSS server security configuration handle. |

Socket reads, socket writes, WebSocket fragments, QUIC stream chunks, and IPC pipe chunks remain
inside Rust. Bindings cross the ABI only for complete-packet batches and lifecycle operations.
`nnrp_transport_probe` must use peer acknowledgements; a loader must not synthesize successful
probe metrics from local availability.

The manifest `exports` list must contain all ten functions above. Release validation loads each
transport-scoped library and runs a real loopback through that library before publication.

## Role Runtime And Carrier Ownership

The transport API above is the diagnostic and custom-carrier surface. Production client/server APIs
do not ask a language SDK to copy packets between transport handles and role handles. After provider
selection, the role runtime adopts a connection or listener opened by the selected transport-scoped
library and drives it inside Rust.

The Preview4 role requests use these layouts:

```c
typedef struct {
  uint64_t connection_id;
  uint32_t generation;
  uint32_t reserved0;
  NnrpHandle transport_connection;
} NnrpClientConnectRequest;

typedef struct {
  uint64_t server_id;
  uint32_t generation;
  uint32_t reserved0;
  NnrpHandle transport_listener;
} NnrpServerBindRequest;

typedef struct {
  NnrpHandle server;
  uint64_t session_handle_id;
  uint32_t generation;
  uint32_t timeout_ms;
} NnrpServerAcceptRequest;

typedef struct {
  NnrpHandle scope;
  uint32_t max_events;
  uint32_t timeout_ms;
  uint32_t flags;
  uint32_t reserved0;
} NnrpRoleEventPollRequest;
```

`nnrp_client_connect` adopts one `TransportConnection`; `nnrp_server_bind` adopts one
`TransportListener`. A successful call consumes the transport handle, so later direct transport
calls with that handle fail with `INVALID_HANDLE`. A failed adoption leaves ownership with the
caller. The role connection/server owns carrier shutdown after adoption, and closing the role also
closes the carrier. A role request and the adopted handle must come from the same loaded native
library instance; handles are never transferable across transport artifacts or duplicate loads.

`nnrp_client_open_session` performs the real `SESSION_OPEN` / `SESSION_OPEN_ACK` exchange.
`nnrp_server_accept` accepts a carrier connection, reads and validates `SESSION_OPEN`, writes the
ack, and returns a live server-session handle. It does not manufacture a session from caller-supplied
profile or schema values.

Role data calls also operate on the carrier:

- `NnrpSubmitRequest.payload` is complete `FRAME_SUBMIT` metadata followed by its body. The runtime
  validates and splits it, requires `metadata.operation_id == request.operation_id`, writes one
  packet, and preserves that operation id independently from `request.frame_id`.
- `NnrpServerSendResultRequest.payload` is complete `RESULT_PUSH` metadata followed by its body.
- `NnrpRuntimeFrameSendRequest.payload` is complete metadata followed by the declared body or
  diagnostics for that control/object/cache message.
- `nnrp_client_await_events` and `nnrp_server_await_events` accept
  `NnrpRoleEventPollRequest`, read from the adopted carrier, decode complete packets, update runtime
  state, and return typed events. `max_events = 0` selects 16 and `timeout_ms = 0` selects 30 seconds.
  `flags` and `reserved0` must be zero.

Event payloads use the same complete metadata-plus-body representation as sends and remain owned by
`payload_owner`. Server receive events create operation handles for inbound submits; the application
uses those handles for partial, terminal, drop, and trace output. There is no public
`nnrp_server_receive_submit` injection call in Preview4.

The server-side operation handle stores both wire identities. Its numeric handle id is local and
MUST NOT replace `FRAME_SUBMIT.operation_id` in partial, control, trace, or drop metadata.

The coarse-call rule is strict: one public control/object/submit/result operation crosses the ABI
once. Socket reads, packet framing, handshake state, flow state, and packet decoding remain in the
same Rust library. Local completion helpers may exist only as explicitly named benchmark helpers;
they cannot back SDK client/server APIs or conformance harnesses.

## Exported Functions

| Function | Description |
|---|---|
| `nnrp_current_protocol_version` | Returns the current protocol version. |
| `nnrp_client_connect` | Adopts a selected carrier connection and creates a client connection handle. |
| `nnrp_client_open_session` | Performs the wire handshake and creates a live client session handle. |
| `nnrp_client_submit` | Encodes and writes one operation through the adopted carrier. |
| `nnrp_client_cancel` | Writes one `FRAME_CANCEL` through the adopted carrier. |
| `nnrp_client_await_event` | Reads and decodes one event from the adopted carrier. |
| `nnrp_client_await_events` | Reads and decodes a bounded event batch from the adopted carrier. |
| `nnrp_client_close` | Sends `SESSION_CLOSE`, waits for `SESSION_CLOSE_ACK`, then closes the client session carrier. |
| `nnrp_server_bind` | Adopts a selected carrier listener and creates a server handle. |
| `nnrp_server_accept` | Accepts a carrier connection, performs the wire handshake, and creates a live server session. |
| `nnrp_server_await_events` | Reads and decodes inbound submit/control/object/cache events. |
| `nnrp_server_send_result` | Encodes and writes terminal result output. |
| `nnrp_server_close` | Acknowledges a pending `SESSION_CLOSE`, then closes the server session carrier. |
| `nnrp_control` | Internal validator for non-Preview4 control requests. |
| `nnrp_runtime_frame_send` | Role-neutral coarse carrier send path for typed runtime, control, object, cache, and `FLOW_UPDATE` frames. |
| `nnrp_transport_probe` | Measures one transport endpoint with protocol probe frames. |
| `nnrp_transport_connect` | Opens a Rust-owned framed transport connection. |
| `nnrp_transport_listen` | Opens a Rust-owned framed transport listener. |
| `nnrp_transport_accept` | Accepts one framed transport connection. |
| `nnrp_transport_listener_endpoint` | Returns the normalized bound endpoint in an owned UTF-8 buffer. |
| `nnrp_transport_write_batch` | Sends complete NNRP packet batches. |
| `nnrp_transport_read_batch` | Receives complete NNRP packet batches. |
| `nnrp_transport_close` | Closes a transport connection or listener. |
| `nnrp_transport_client_security_config_create` | Creates a QUIC/WSS client security configuration. |
| `nnrp_transport_server_security_config_create` | Creates a QUIC/WSS server security configuration. |
| `nnrp_dispatch_event` | Delivers one borrowed event through a callback. |

`nnrp_control` is an internal primitive for non-Preview4 control codes inside Rust-owned
integrations. SDK public APIs use typed methods backed by `nnrp_runtime_frame_send`; they must not
expose raw control-code routing as the normal application path.

## C# P/Invoke Example

```csharp
[LibraryImport("nnrp_ffi", EntryPoint = "nnrp_current_protocol_version")]
public static partial NnrpProtocolVersion CurrentProtocolVersion();

[StructLayout(LayoutKind.Sequential)]
public struct NnrpProtocolVersion
{
    public byte Major;
    public byte WireFormat;
}
```

## Python ctypes Example

```python
import ctypes

class NnrpProtocolVersion(ctypes.Structure):
    _fields_ = [("major", ctypes.c_uint8), ("wire_format", ctypes.c_uint8)]

lib = ctypes.CDLL("./libnnrp_ffi.so")
lib.nnrp_current_protocol_version.restype = NnrpProtocolVersion
version = lib.nnrp_current_protocol_version()
```

## Boundary Rules

::: warning
1. Native artifacts are transport-scoped. Do not treat client/server role packages as hidden native
   transport bundles.
2. Browser SDKs use `nnrp-wasm`; they do not load `.dll`, `.so`, or `.dylib` files.
3. Keep FFI calls coarse. Use handles and event polling/callbacks instead of adding one ABI call per
   Rust struct field.
:::
