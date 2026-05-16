# Rust — FFI / 原生接口

`nnrp-ffi` crate 将 `nnrp-core` 类型暴露为 C ABI（`#[repr(C)]`），可编译为 `dll`、`so`、或 `wasm` 产物供 C#、Python、Web 应用调用。

## Cargo.toml

```toml
# Rust 项目直接依赖（通常不需要，请直接依赖 nnrp-core）
[dependencies]
nnrp-ffi = "0.1"

# 构建 cdylib 产物（dll/so）
[lib]
crate-type = ["cdylib", "rlib"]
```

---

## 构建产物

| 目标 | 命令 | 产物 | 用途 |
|---|---|---|---|
| Windows DLL | `cargo build --release` | `nnrp_ffi.dll` | C# P/Invoke、Python ctypes |
| Linux SO | `cargo build --release` | `libnnrp_ffi.so` | C# LibraryImport、Python ctypes |
| macOS dylib | `cargo build --release` | `libnnrp_ffi.dylib` | 同上 |
| WASM | `cargo build --target wasm32-unknown-unknown` | `nnrp_ffi.wasm` | Web 应用（Preview3） |

---

## 当前导出 API（0.1.0）

### `NnrpProtocolVersion`

C ABI 友好的协议版本结构体（`#[repr(C)]`）。

```rust
#[repr(C)]
pub struct NnrpProtocolVersion {
    pub major: u8,
    pub wire_format: u8,
}
```

与 `nnrp_core::ProtocolVersion` 的转换：

```rust
impl From<ProtocolVersion> for NnrpProtocolVersion {
    fn from(v: ProtocolVersion) -> Self {
        Self { major: v.major, wire_format: v.wire_format }
    }
}
```

### `current_protocol_version`

```rust
/// 返回当前协议版本（C ABI 导出）。
/// 等价于 ProtocolVersion::CURRENT。
#[no_mangle]
pub extern "C" fn current_protocol_version() -> NnrpProtocolVersion;
```

**C# P/Invoke 示例：**

```csharp
[LibraryImport("nnrp_ffi")]
public static partial NnrpProtocolVersion current_protocol_version();

[StructLayout(LayoutKind.Sequential)]
public struct NnrpProtocolVersion { public byte Major; public byte WireFormat; }
```

**Python ctypes 示例：**

```python
import ctypes

lib = ctypes.CDLL("nnrp_ffi.dll")  # Windows

class NnrpProtocolVersion(ctypes.Structure):
    _fields_ = [("major", ctypes.c_uint8), ("wire_format", ctypes.c_uint8)]

lib.current_protocol_version.restype = NnrpProtocolVersion
version = lib.current_protocol_version()
assert version.major == 1
assert version.wire_format == 0
```

---

## `nnrp-conformance` crate

同工作区下的一致性测试 crate，包含 `GoldenVersionVector` 等测试辅助类型。

```rust
// nnrp-conformance（内部使用，不作为公开 API 发布）
pub struct GoldenVersionVector { /* 版本一致性测试向量 */ }
```

此 crate 不对外发布，仅用于 CI 中的跨 SDK 协议一致性验证。

---

## Preview3 FFI 扩展计划

Preview3 将在 `nnrp-ffi` 中新增以下 C ABI 导出，覆盖完整客户端/服务端生命周期：

```c
/* 客户端（C ABI 规划，Preview3） */
NnrpClient* nnrp_client_create(const NnrpClientConfig* config);
NnrpSession* nnrp_client_connect(NnrpClient* client, const char* host, uint16_t port);
int          nnrp_session_submit(NnrpSession* session, const NnrpSubmitRequest* req);
int          nnrp_session_recv_result(NnrpSession* session, NnrpResult* out);
void         nnrp_session_close(NnrpSession* session);
void         nnrp_client_destroy(NnrpClient* client);

/* 服务端（C ABI 规划，Preview3） */
NnrpServer*  nnrp_server_create(const NnrpServerConfig* config);
NnrpSession* nnrp_server_accept(NnrpServer* server);
int          nnrp_server_recv_submit(NnrpSession* session, NnrpFrameSubmit* out);
int          nnrp_server_send_result(NnrpSession* session, const NnrpResult* result);
void         nnrp_server_destroy(NnrpServer* server);
```

这套 ABI 将同时作为 C#/Python 原生绑定和 WASM 导出的基础层。

---

## 典型使用场景（Preview3 规划）

### 从 C 语言调用（嵌入式/游戏引擎插件）

```c
/* Preview3 预期 C ABI */
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

### 内存所有权原则

```c
// 所有返回指针均由 Rust 通过 Box<T> 分配，必须调用对应 free 函数
NnrpResult* result = nnrp_session_recv_result(session);
// ... 使用 result ...
nnrp_free_result(result);  // 必须调用，否则泄漏
```

---

## 常见坑点

::: warning
1. **每个 `nnrp_*_create` 必须有对应的 `nnrp_*_destroy`。** Rust 端使用 `Box::from_raw`，没有 GC；忘记调用 `destroy` 会泄漏内存。

2. **不要在多线程中共享同一个 `NnrpSession*`。** C ABI 目前没有内部锁，并发访问是 UB。

3. **传入空指针会导致 panic 并终止进程。** C ABI 目前不进行 null 检查；调用方须保证指针有效。
:::
