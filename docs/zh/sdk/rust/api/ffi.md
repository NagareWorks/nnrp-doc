# Rust — FFI / 原生接口

`nnrp-ffi` crate 将 Rust 侧协议语义暴露为 C ABI（`#[repr(C)]`），供 C#、Python、Unity 和未来语言绑定使用。Preview3 当前已经包含稳定 value handle、buffer view、callback/polling event、错误族，以及 runtime-backed client/server handle 入口。

## Cargo.toml

```toml
[dependencies]
nnrp-ffi = "1.0.0-preview.3"

[lib]
crate-type = ["cdylib", "rlib"]
```

## 构建产物

| 目标 | 命令 | 产物 | 用途 |
|---|---|---|---|
| Windows DLL | `cargo build --release -p nnrp-ffi` | `nnrp_ffi.dll` | C# P/Invoke、Python ctypes、Unity |
| Linux SO | `cargo build --release -p nnrp-ffi` | `libnnrp_ffi.so` | C# LibraryImport、Python ctypes |
| macOS dylib | `cargo build --release -p nnrp-ffi` | `libnnrp_ffi.dylib` | 同上 |
| Native package | `python scripts/package_native_artifacts.py` | native library + `nnrp_ffi.h` + `manifest.json` | Node native loader、C ABI consumers、release artifacts |
| Raw WASM | `cargo build --target wasm32-unknown-unknown -p nnrp-ffi` | `nnrp_ffi.wasm` | 底层编译目标；不是完整浏览器 SDK |

Native 链接库用于 C#/Python/Unity 以及 Node.js 后端 native addon。发布包会附带 `manifest.json`，其中声明平台、架构、库名、header 和必须导出的 `nnrp_*` symbols；Node 侧 loader 应先校验 manifest，再加载 native library。浏览器场景不能加载 native link library，需要独立 WASM/JS/TS 包装层。

## 核心 ABI 类型

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

非空 buffer view 必须提供非空指针。被调用方只在调用期间借用这段内存，不会在返回后保留指针。

## Status、diagnostic 与 event

| 类型 | 说明 |
|---|---|
| `NnrpFfiStatusCode` | `Ok`、`InvalidArgument`、`NotFound`、`AlreadyExists`、`WouldBlock`、`ProtocolError` 等 ABI 状态 |
| `NnrpErrorFamily` | 将 core/runtime 错误归类到跨语言可消费的错误族 |
| `NnrpFfiStatus` | ABI status code、error family、protocol error code、detail code |
| `NnrpFfiDiagnostic` | status + 相关 connection/session/operation/frame id |
| `NnrpEventKind` | `ConnectionOpened`、`SessionOpened`、`SubmitAccepted`、`ResultPushed`、`ResultDropped`、`FlowUpdated`、`Error` 等 |
| `NnrpEvent` | 一次 callback/polling 事件，包含 handle、frame id、借用 payload 和 diagnostic |
| `NnrpCallbackSink` | callback 交付入口 |
| `NnrpPollResult` | polling 交付结果 |

callback 中的 `NnrpEvent*` 只在 callback 执行期间有效；binding 层如需保留内容，必须复制值和 payload。

## 请求结构体

| 类型 | 说明 |
|---|---|
| `NnrpConnectionBootstrap` | 兼容入口，用于构造 connection handle |
| `NnrpClientConnectRequest` | 创建 client connection handle |
| `NnrpServerBindRequest` | 创建 server handle |
| `NnrpSessionOpenRequest` | 在 client connection 上打开 session |
| `NnrpSubmitRequest` | client submit，创建 operation handle |
| `NnrpClientCancelRequest` | client cancel |
| `NnrpServerAcceptRequest` | server accept，创建 server session handle |
| `NnrpServerReceiveSubmitRequest` | server 侧接收 submit，创建 operation handle |
| `NnrpServerSendResultRequest` | server 侧发送 result event |
| `NnrpServerFlowUpdateRequest` | server 侧发送 flow update event |
| `NnrpControlRequest` | 通用控制面请求 |

## 导出函数

| 函数 | 说明 |
|---|---|
| `nnrp_current_protocol_version` | 返回当前协议版本 |
| `nnrp_connection_bootstrap` | 兼容 wrapper，等价于创建 client connection handle |
| `nnrp_client_connect` | 创建 client connection handle，并投递 `ConnectionOpened` |
| `nnrp_session_open` | 兼容 wrapper，打开 client session |
| `nnrp_client_open_session` | 创建 client session handle，并投递 `SessionOpened` |
| `nnrp_submit` | 兼容 wrapper，提交 operation |
| `nnrp_client_submit` | 创建 operation handle，并投递 `SubmitAccepted` |
| `nnrp_session_close` | 兼容 wrapper，关闭 session |
| `nnrp_client_close` | 关闭 client session，并投递 `SessionClosed` |
| `nnrp_client_cancel` | 投递 `ResultDropped` / cancel 相关事件 |
| `nnrp_client_await_event` | 从 connection/session 关联队列 polling 一个事件 |
| `nnrp_server_bind` | 创建 server handle，并投递 `ConnectionOpened` |
| `nnrp_server_accept` | 创建 server session handle，并投递 `SessionOpened` |
| `nnrp_server_receive_submit` | 创建 server operation handle，并投递 `SubmitAccepted` |
| `nnrp_server_send_result` | 投递 `ResultPushed` |
| `nnrp_server_send_flow_update` | 投递 `FlowUpdated` |
| `nnrp_server_close` | 关闭 server session，并投递 `SessionClosed` |
| `nnrp_control` | 校验控制请求并投递 `Control` |
| `nnrp_poll_empty` | 返回空 polling 结果与 `WouldBlock` |
| `nnrp_dispatch_event` | 通过 callback 交付一个借用 event |

## C# P/Invoke 示例

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

## Python ctypes 示例

```python
import ctypes

class NnrpProtocolVersion(ctypes.Structure):
    _fields_ = [("major", ctypes.c_uint8), ("wire_format", ctypes.c_uint8)]

lib = ctypes.CDLL("./libnnrp_ffi.so")
lib.nnrp_current_protocol_version.restype = NnrpProtocolVersion
version = lib.nnrp_current_protocol_version()
```

## `nnrp-conformance` crate

同工作区下的一致性测试 crate，导出 Rust 生成的 preview3 golden vectors、fixture manifest 与 adapter wrapper。下游 SDK 应把这些 fixture 作为 canonical preview3 基线。

## 当前边界

FFI 层暴露的是跨语言 handle/event 控制面。它不会把 Rust async runtime 对象、socket 指针或借用 payload 的长期所有权交给调用方；binding 层需要用 handle 调用后续函数，并在 callback/polling 时复制需要保留的数据。

Raw `nnrp_ffi.wasm` 只是底层 ABI 编译产物。面向浏览器的 SDK 还需要 `wasm-bindgen`、`.d.ts` 类型声明、JS/TS session wrapper，以及 WebSocket/WebTransport transport adapter；`nnrp-rs` 只负责 WASM/native primitives，npm 包布局、Node native loader 与浏览器 transport adapter 由 `nnrp-js` 负责。

::: warning
1. **不要在返回后保留借用 buffer 或 event 指针。** 它们只在调用或 callback 期间有效。
2. **非空 buffer 和必要输出参数不能传空指针。** ABI 会拒绝明显非法参数，调用方仍应在跨 FFI 前做本地校验。
3. **handle 有 kind / id / generation。** binding 层应同时保存三者，不要只保存裸 id。
:::
