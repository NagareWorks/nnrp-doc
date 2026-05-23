# Rust — FFI / 原生接口

`nnrp-ffi` crate 将 Rust 侧协议语义暴露为 C ABI（`#[repr(C)]`），供 C#、Python、Unity 和未来语言绑定使用。当前 Preview3 实现已经有 handle、buffer view、event delivery 与错误族 ABI 表面，但还不是网络化 client/server runtime。

## Cargo.toml

```toml
# Rust 项目直接依赖（通常不需要，请直接依赖 nnrp-core）
[dependencies]
nnrp-ffi = "1.0.0-preview.2"

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
| WASM | `cargo build --target wasm32-unknown-unknown` | `nnrp_ffi.wasm` | 规划中的 Web 目标 |

---

## 当前导出 API（Preview3）

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

### `nnrp_current_protocol_version`

```rust
/// 返回当前协议版本（C ABI 导出）。
/// 等价于 ProtocolVersion::CURRENT。
#[no_mangle]
pub extern "C" fn nnrp_current_protocol_version() -> NnrpProtocolVersion;
```

**C# P/Invoke 示例：**

```csharp
[LibraryImport("nnrp_ffi")]
public static partial NnrpProtocolVersion nnrp_current_protocol_version();

[StructLayout(LayoutKind.Sequential)]
public struct NnrpProtocolVersion { public byte Major; public byte WireFormat; }
```

**Python ctypes 示例：**

```python
import ctypes

lib = ctypes.CDLL("nnrp_ffi.dll")  # Windows

class NnrpProtocolVersion(ctypes.Structure):
    _fields_ = [("major", ctypes.c_uint8), ("wire_format", ctypes.c_uint8)]

lib.nnrp_current_protocol_version.restype = NnrpProtocolVersion
version = lib.nnrp_current_protocol_version()
assert version.major == 1
assert version.wire_format == 0
```

---

### Value handle 与 buffer view

当前 ABI 使用稳定的 value handle，而不是把 Rust `Box<T>` 指针直接作为跨语言长期所有权模型：

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

非空 buffer view 必须提供非空指针。被调用方只在调用期间借用这段内存，不会在返回后保留指针。

### Event 与 status

ABI 暴露 callback 与 polling 两种事件交付形态，核心类型包括 `NnrpEvent`、`NnrpCallbackSink`、`NnrpPollResult` 与 `NnrpFfiStatus`。错误状态包含 FFI status code、协议错误族、可选协议错误码与 detail code。

### 当前函数

| 函数 | 说明 |
|---|---|
| `nnrp_current_protocol_version` | 返回当前协议版本 |
| `nnrp_connection_bootstrap` | 为绑定 smoke test 构造 connection value handle |
| `nnrp_session_open` | 基于 connection handle 构造 session value handle |
| `nnrp_submit` | 校验 submit 参数并构造 operation value handle |
| `nnrp_session_close` | 校验 session close 边界 |
| `nnrp_control` | 校验 control 参数形状 |
| `nnrp_poll_empty` | 返回空 polling 结果与 `WouldBlock` |
| `nnrp_dispatch_event` | 通过 callback 交付一个借用 event |

## `nnrp-conformance` crate

同工作区下的一致性测试 crate，导出 Rust 生成的 preview3 golden vectors、fixture manifest 与 adapter wrapper。下游 SDK 应把这些 fixture 作为 canonical preview3 基线。

---

## Runtime 扩展计划

当前 ABI 不执行真实网络 I/O。完整 client/server runtime 落地后，FFI 会继续接入 runtime-backed 函数：

```c
int nnrp_client_connect_tcp(...);
int nnrp_client_connect_quic(...);
int nnrp_server_bind_tcp(...);
int nnrp_server_accept(...);
int nnrp_client_session_submit(...);
int nnrp_client_session_await_result(...);
int nnrp_server_session_receive_submit(...);
int nnrp_server_session_send_result(...);
```

这套 runtime-backed ABI 将作为 C#/Python 原生绑定和后续 WASM 导出的基础层。

---

## 当前边界

当前 FFI 用于验证跨语言 ABI 形状，并让绑定层消费 Rust-owned 协议语义。不要把它当成完整客户端/服务端 SDK；真正的 connect/listen/accept/session pump/submit-result stream 仍在 Rust runtime shard 中。

---

## 常见坑点

::: warning
1. **不要在返回后保留借用 buffer 或 event 指针。** 它们只在调用或 callback 期间有效。

2. **不要把 value handle 当成真实网络连接。** 在 runtime 层接入前，它们是稳定标识符和 ABI 合同。

3. **非空 buffer 和必要输出参数不能传空指针。** ABI 会拒绝明显非法参数，调用方仍应在跨 FFI 前做本地校验。
:::
