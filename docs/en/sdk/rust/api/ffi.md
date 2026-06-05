# Rust — FFI / Native Bindings

The `nnrp-ffi` crate exposes Rust protocol semantics as a C-compatible ABI (`#[repr(C)]`) for C#, Python, Unity, and future language bindings. Preview3 now includes stable value handles, buffer views, callback/polling events, error families, and runtime-backed client/server handle entrypoints.

## Cargo.toml

```toml
[dependencies]
nnrp-ffi = "1.0.0-preview.3.8"

[lib]
crate-type = ["cdylib", "staticlib", "rlib"]
```

## Build Outputs

| Target | Command | Output | Use Case |
|---|---|---|---|
| Windows DLL | `cargo build --release -p nnrp-ffi` | `nnrp_ffi.dll` | C# P/Invoke, Python ctypes, Unity |
| Linux SO | `cargo build --release -p nnrp-ffi` | `libnnrp_ffi.so` | C# LibraryImport, Python ctypes |
| macOS dylib | `cargo build --release -p nnrp-ffi` | `libnnrp_ffi.dylib` | Same |
| Native package | `python scripts/package_native_artifacts.py` | native library + `nnrp_ffi.h` + `manifest.json` | Node native loaders, C ABI consumers, release artifacts |
| Raw WASM | `cargo build --target wasm32-unknown-unknown -p nnrp-ffi` | `nnrp_ffi.wasm` | Low-level compile target; not a complete browser SDK |

Native link libraries are for C#/Python/Unity and Node.js backend native addons. Packages include a `manifest.json` that declares the platform, architecture, library name, header, and required exported `nnrp_*` symbols; Node loaders should validate the manifest before loading the native library. Browser scenarios cannot load native link libraries and require a dedicated WASM/JS/TS wrapper layer.

## Core ABI Types

```c
typedef struct {
    uint8_t major;
    uint8_t wire_format;
} NnrpProtocolVersion;

typedef struct {
    uint32_t kind;
    uint64_t id;
    uint32_t generation;
    uint32_t flags;
} NnrpHandle;

typedef struct {
    const uint8_t* ptr;
    uintptr_t len;
} NnrpBufferView;
```

Non-empty buffer views must provide non-null pointers. The callee borrows memory only for the duration of the call and does not retain the pointer after returning.

## Status, Diagnostics, and Events

| Type | Description |
|---|---|
| `NnrpFfiStatusCode` | ABI status values such as `Ok`, `InvalidArgument`, `NotFound`, `AlreadyExists`, `WouldBlock`, and `ProtocolError` |
| `NnrpErrorFamily` | Cross-language family for core/runtime errors |
| `NnrpFfiStatus` | ABI status code, error family, protocol error code, and detail code |
| `NnrpFfiDiagnostic` | Status plus related connection/session/operation/frame ids |
| `NnrpEventKind` | `ConnectionOpened`, `SessionOpened`, `SubmitAccepted`, `ResultPushed`, `ResultDropped`, `FlowUpdated`, `Error`, and others |
| `NnrpEvent` | One callback/polling event with handles, frame id, borrowed payload, and diagnostic |
| `NnrpCallbackSink` | Callback delivery entrypoint |
| `NnrpPollResult` | Polling delivery result |

The `NnrpEvent*` passed to a callback is valid only while the callback is running. Bindings must copy values and payloads they need to retain.

## Request Types

| Type | Description |
|---|---|
| `NnrpConnectionBootstrap` | Compatibility entry for constructing a connection handle |
| `NnrpClientConnectRequest` | Create a client connection handle |
| `NnrpServerBindRequest` | Create a server handle |
| `NnrpSessionOpenRequest` | Open a session on a client connection |
| `NnrpSubmitRequest` | Client submit, creating an operation handle |
| `NnrpClientCancelRequest` | Client cancel |
| `NnrpServerAcceptRequest` | Server accept, creating a server session handle |
| `NnrpServerReceiveSubmitRequest` | Server-side submit receive, creating an operation handle |
| `NnrpServerSendResultRequest` | Server-side result event |
| `NnrpServerFlowUpdateRequest` | Server-side flow-update event |
| `NnrpControlRequest` | Generic control-plane request |

## Exported Functions

| Function | Description |
|---|---|
| `nnrp_current_protocol_version` | Return the current protocol version |
| `nnrp_connection_bootstrap` | Compatibility wrapper for creating a client connection handle |
| `nnrp_client_connect` | Create a client connection handle and enqueue `ConnectionOpened` |
| `nnrp_session_open` | Compatibility wrapper for opening a client session |
| `nnrp_client_open_session` | Create a client session handle and enqueue `SessionOpened` |
| `nnrp_submit` | Compatibility wrapper for submit |
| `nnrp_client_submit` | Create an operation handle and enqueue `SubmitAccepted` |
| `nnrp_session_close` | Compatibility wrapper for closing a session |
| `nnrp_client_close` | Close a client session and enqueue `SessionClosed` |
| `nnrp_client_cancel` | Enqueue cancel/drop-related events |
| `nnrp_client_await_event` | Poll one event from a connection/session-associated queue |
| `nnrp_server_bind` | Create a server handle and enqueue `ConnectionOpened` |
| `nnrp_server_accept` | Create a server session handle and enqueue `SessionOpened` |
| `nnrp_server_receive_submit` | Create a server operation handle and enqueue `SubmitAccepted` |
| `nnrp_server_send_result` | Enqueue `ResultPushed` |
| `nnrp_server_send_flow_update` | Enqueue `FlowUpdated` |
| `nnrp_server_close` | Close a server session and enqueue `SessionClosed` |
| `nnrp_control` | Validate a control request and enqueue `Control` |
| `nnrp_poll_empty` | Return an empty polling result with `WouldBlock` |
| `nnrp_dispatch_event` | Deliver one borrowed event through a callback |

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

## `nnrp-conformance` Crate

`nnrp-conformance` hosts Rust-backed conformance case execution and adapter helpers. Downstream SDKs should consume the versioned `nnrp-conformance` baseline through suite-owned manifests, plans, and result schemas.

## Current Boundary

The FFI layer exposes a cross-language handle/event control plane. It does not hand Rust async runtime objects, socket pointers, or long-lived borrowed payload ownership to callers; bindings should call follow-up functions through handles and copy any callback/polling data they need to keep.

Raw `nnrp_ffi.wasm` is only a low-level ABI compilation artifact. A browser-facing SDK still needs `wasm-bindgen`, `.d.ts` declarations, a JS/TS session wrapper, and WebSocket/WebTransport transport adapters; `nnrp-rs` owns only the WASM/native primitives, while npm layout, the Node native loader, and browser transport adapters belong in `nnrp-js`.

::: warning
1. **Do not retain borrowed buffer or event pointers after return.** They are valid only for the duration of the call or callback.
2. **Null pointers are rejected for non-empty buffers and required output arguments.** Callers should still validate before crossing the FFI boundary.
3. **Handles carry kind / id / generation.** Bindings should store all three, not only the raw id.
:::
