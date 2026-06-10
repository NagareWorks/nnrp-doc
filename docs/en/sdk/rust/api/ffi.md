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

## ABI Types

| Type | Description |
|---|---|
| `NnrpProtocolVersion` | Current major version and wire format. |
| `NnrpHandle` | Typed handle with kind, id, generation, and flags. |
| `NnrpBufferView` | Borrowed byte slice valid only during the call. |
| `NnrpFfiStatus` | Status code, error family, protocol error, and detail code. |
| `NnrpFfiDiagnostic` | Status plus related connection/session/operation/frame ids. |
| `NnrpEvent` | Callback/polling event with handles, frame id, payload view, and diagnostics. |

Non-empty buffer views must use non-null pointers. Bindings must copy event payloads they need after
the callback or poll call returns.

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
| `nnrp_dispatch_event` | Delivers one borrowed event through a callback. |

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
