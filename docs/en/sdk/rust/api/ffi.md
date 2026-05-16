# Rust — FFI / WASM Bindings

The `nnrp-ffi` crate exposes a C-compatible ABI for integration with C#, Python, and other languages. The `nnrp-conformance` crate provides protocol conformance test utilities.

## Build Targets

| Target | Output | Use Case |
|---|---|---|
| `x86_64-pc-windows-msvc` | `nnrp_ffi.dll` | Windows native (C#/Python/Unity) |
| `x86_64-unknown-linux-gnu` | `libnnrp_ffi.so` | Linux native (C#/Python server) |
| `aarch64-apple-darwin` | `libnnrp_ffi.dylib` | macOS ARM native |
| `wasm32-unknown-unknown` | `nnrp_ffi.wasm` | WebAssembly (browser/Node.js) |

---

## C ABI Types

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

## Exported Functions

### `current_protocol_version`

```rust
#[no_mangle]
pub extern "C" fn current_protocol_version() -> NnrpProtocolVersion;
```

Returns the current protocol version as a C-compatible struct.

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
    [DllImport("nnrp_ffi", EntryPoint = "current_protocol_version")]
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
lib.current_protocol_version.restype = NnrpProtocolVersion
version = lib.current_protocol_version()
print(f"NNRP v{version.major}, wire_format={version.wire_format}")
```

---

## `nnrp-conformance` Crate

`nnrp-conformance` provides test utilities for validating protocol conformance:

- `ConformanceRunner` — runs a set of conformance test cases
- `ConformanceReport` — machine-readable test report
- `ConformanceTestCase` — individual test case (serialize/parse roundtrip, edge cases)

Use this crate in your integration test suite to verify that your custom transport or session layer correctly implements the NNRP wire protocol.

---

## Preview3 Expansion Plan

The C ABI surface will be expanded significantly in Preview3:

| Function | Description |
|---|---|
| `nnrp_build_frame_submit` | Build a `FRAME_SUBMIT` packet |
| `nnrp_parse_result_push` | Parse a `RESULT_PUSH` packet |
| `nnrp_client_connect_tcp` | Open a client TCP connection |
| `nnrp_client_connect_quic` | Open a client QUIC connection |
| `nnrp_server_bind_tcp` | Bind a server TCP listener |
| `nnrp_client_session_submit` | Submit a frame |
| `nnrp_client_session_await_result` | Await result |
| `nnrp_free_*` | Companion deallocation functions |

All returned pointer types will use Rust's `Box<T>` ownership with explicit `free` functions to avoid memory leaks across the FFI boundary.

---

## Typical Use Cases (Preview3 Plan)

### Calling from C (game engine plug-in)

```c
/* Expected Preview3 C ABI */
NnrpClientConfig cfg = { .host = "127.0.0.1", .port = 4433 };
NnrpClient* client = nnrp_client_create(&cfg);
NnrpSession* session = nnrp_session_open(client);

NnrpFrameSubmit submit = {
    .frame_id = 1,
    .input_profile = NNRP_INPUT_CHANGED_TILES_LUMA,
    .section_count = 1,
    .sections = &tile_section,
};
NnrpResult result;
nnrp_session_submit(session, &submit, &result);

nnrp_session_close(session);
nnrp_client_destroy(client);
```

### Memory ownership rule

```c
// Every nnrp_*_create must be paired with nnrp_*_destroy
NnrpResult* result = nnrp_session_recv_result(session);
// ... use result ...
nnrp_free_result(result);  // REQUIRED — Rust allocated this via Box<T>
```

---

## Common Pitfalls

::: warning
1. **Every `nnrp_*_create` must have a corresponding `nnrp_*_destroy`.** No GC; forgetting to call `destroy` leaks Rust heap memory into the host process.

2. **Do not share one `NnrpSession*` across threads.** The C ABI has no internal locking; concurrent access is undefined behavior.

3. **Passing a null pointer causes a Rust panic and terminates the process.** The C ABI does not validate nulls — callers must ensure valid pointers.
:::
