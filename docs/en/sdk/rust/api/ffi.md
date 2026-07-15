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
| `NnrpRuntimeFrameSendRequest` | Sends one typed Preview4 control, object, or cache frame through a session or operation handle. Fields are `handle`, `message_type`, `frame_id`, and `payload`. |

`NnrpRuntimeFrameSendRequest.payload` contains the complete encoded metadata and declared tail.
`nnrp_runtime_frame_send` validates the message type, metadata layout, declared lengths, handle
scope, and client/server direction in one call. It snapshots the payload before returning; no
queued event aliases caller-owned memory.

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

## Exported Functions

| Function | Description |
|---|---|
| `nnrp_current_protocol_version` | Returns the current protocol version. |
| `nnrp_client_connect` | Creates a client connection handle. |
| `nnrp_client_open_session` | Creates a client session handle. |
| `nnrp_client_submit` | Submits one operation and enqueues an event. |
| `nnrp_client_cancel` | Enqueues cancel/drop-related events. |
| `nnrp_client_await_event` | Polls one event from a connection/session queue. |
| `nnrp_client_close` | Closes a client session. |
| `nnrp_server_bind` | Creates a server handle. |
| `nnrp_server_accept` | Creates a server session handle. |
| `nnrp_server_receive_submit` | Receives submit and creates an operation handle. |
| `nnrp_server_send_result` | Enqueues result output. |
| `nnrp_server_send_flow_update` | Enqueues flow-control output. |
| `nnrp_server_close` | Closes a server session. |
| `nnrp_control` | Validates and enqueues a generic control request. |
| `nnrp_runtime_frame_send` | Role-neutral coarse send path for Preview4 control, object, and cache frames. |
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

`nnrp_control` remains an ABI-level compatibility primitive for non-Preview4 control codes inside
Rust-owned integrations. SDK public APIs use `nnrp_runtime_frame_send`; they must not expose raw
control-code routing as the normal application path.

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
