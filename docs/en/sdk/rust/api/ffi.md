# Rust — FFI / Native Artifacts

`nnrp-ffi` exposes Rust-owned protocol and runtime behavior through a C-compatible ABI for Python,
C#, Unity, Node native loaders, and future language bindings. Preview4 keeps the FFI boundary coarse:
callers work through handles, events, and owned buffers instead of crossing the ABI for every small
field.

## Cargo

```toml
[dependencies]
nnrp-ffi = "1.0.0-preview.4.0"
```

## Native Artifact Shape

Preview4 publishes transport-scoped native artifacts. The role package decides whether it is a
client or server at runtime; the artifact name tells you which transport implementation it contains.

| Transport | Artifact family |
|---|---|
| TCP | `nnrp-ffi-transport-tcp-native-<platform>-1.0.0-preview.4.0.zip` |
| QUIC | `nnrp-ffi-transport-quic-native-<platform>-1.0.0-preview.4.0.zip` |
| IPC | `nnrp-ffi-transport-ipc-native-<platform>-1.0.0-preview.4.0.zip` |
| WebSocket | `nnrp-ffi-transport-websocket-native-<platform>-1.0.0-preview.4.0.zip` |

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
