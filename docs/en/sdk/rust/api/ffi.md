# Rust — FFI / Native Bindings

The `nnrp-ffi` crate exposes a C-compatible ABI for C#, Python, Unity, and future language bindings. In the current Preview3 Rust implementation, this is an ABI surface over protocol handles, buffer views, event delivery, and error families. It is not yet a networked client/server runtime.

## Build Targets

| Target | Output | Use Case |
|---|---|---|
| `x86_64-pc-windows-msvc` | `nnrp_ffi.dll` | Windows native (C#/Python/Unity) |
| `x86_64-unknown-linux-gnu` | `libnnrp_ffi.so` | Linux native (C#/Python server) |
| `aarch64-apple-darwin` | `libnnrp_ffi.dylib` | macOS ARM native |
| `wasm32-unknown-unknown` | `nnrp_ffi.wasm` | Planned WebAssembly target |

---

## Current C ABI Types

### `NnrpProtocolVersion`

```c
// C equivalent (from cbindgen output)
typedef struct {
    uint8_t major;
    uint8_t wire_format;
} NnrpProtocolVersion;
```

```rust
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct NnrpProtocolVersion {
    pub major: u8,
    pub wire_format: u8,
}

impl From<ProtocolVersion> for NnrpProtocolVersion {
    fn from(v: ProtocolVersion) -> Self {
        Self { major: v.major, wire_format: v.wire_format }
    }
}
```

---

### Value handles and buffer views

Preview3 uses ABI-safe value handles rather than exposing Rust-owned `Box<T>` pointers as the stable cross-language contract:

```c
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

Non-empty buffer views must provide non-null pointers. The callee borrows the memory for the duration of the call and must not retain the pointer.

### Events and status

The ABI exposes callback and polling delivery shapes using `NnrpEvent`, `NnrpCallbackSink`, `NnrpPollResult`, and `NnrpFfiStatus`. Status values include an FFI status code, protocol error family, optional protocol error code, and detail code.

## Exported Functions

The current exported functions are ABI/lifecycle primitives:

| Function | Description |
|---|---|
| `nnrp_current_protocol_version` | Return the current protocol version |
| `nnrp_connection_bootstrap` | Build a connection value handle for binding smoke tests |
| `nnrp_session_open` | Build a session value handle from a connection handle |
| `nnrp_submit` | Validate submit arguments and build an operation value handle |
| `nnrp_session_close` | Validate a session handle close boundary |
| `nnrp_control` | Validate control argument shape |
| `nnrp_poll_empty` | Return an empty polling result with `WouldBlock` |
| `nnrp_dispatch_event` | Deliver one borrowed event through a callback |

---

## C# P/Invoke Example

```csharp
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential)]
public struct NnrpProtocolVersion
{
    public byte Major;
    public byte WireFormat;
}

public static class NnrpFfi
{
    [DllImport("nnrp_ffi", EntryPoint = "nnrp_current_protocol_version")]
    public static extern NnrpProtocolVersion CurrentProtocolVersion();
}

// Usage
var version = NnrpFfi.CurrentProtocolVersion();
Console.WriteLine($"NNRP v{version.Major}, wire_format={version.WireFormat}");
```

---

## Python ctypes Example

```python
import ctypes

class NnrpProtocolVersion(ctypes.Structure):
    _fields_ = [
        ("major", ctypes.c_uint8),
        ("wire_format", ctypes.c_uint8),
    ]

lib = ctypes.CDLL("./libnnrp_ffi.so")
lib.nnrp_current_protocol_version.restype = NnrpProtocolVersion
version = lib.nnrp_current_protocol_version()
print(f"NNRP v{version.major}, wire_format={version.wire_format}")
```

---

## `nnrp-conformance` Crate

`nnrp-conformance` exports Rust-generated preview3 golden vectors, fixture manifests, and an adapter wrapper. Downstream bindings should consume those fixtures as the canonical preview3 baseline.

---

## Runtime Expansion Plan

The current ABI does not perform real network I/O. Runtime-backed client/server entrypoints are planned after the Rust client/server runtime lands:

| Function | Description |
|---|---|
| `nnrp_client_connect_tcp` | Open a client TCP connection |
| `nnrp_client_connect_quic` | Open a client QUIC connection |
| `nnrp_server_bind_tcp` | Bind a server TCP listener |
| `nnrp_server_accept` | Accept a server-side session |
| `nnrp_client_session_submit` | Submit a frame |
| `nnrp_client_session_await_result` | Await result |
| `nnrp_server_session_receive_submit` | Receive a submit request |
| `nnrp_server_session_send_result` | Send a result |

---

## Current Boundary

Use the current FFI to validate cross-language ABI shape and to bind Rust-owned protocol semantics. Do not treat it as a complete client/server SDK until the runtime-backed functions above exist.

---

## Common Pitfalls

::: warning
1. **Do not retain borrowed buffer or event pointers.** They are valid only for the duration of the call or callback.

2. **Do not assume value handles are network connections.** They are stable identifiers until the runtime layer backs them.

3. **Null pointers are rejected for non-empty buffers and required output arguments.** Callers should still validate pointers before crossing the FFI boundary.
:::
