# Rust — FFI / 原生 Artifact

`nnrp-ffi` 通过 C-compatible ABI 暴露 Rust 拥有的协议和 runtime 行为，供 Python、C#、Unity、Node native loader 和未来语言绑定使用。Preview4 继续保持粗粒度 FFI 边界：调用方通过 handle、event 和 owned buffer 工作，而不是为了每个小字段跨一次 ABI。

## Cargo

```toml
[dependencies]
nnrp-ffi = "1.0.0-preview.4.0"
```

## Native Artifact 形态

Preview4 发布 transport-scoped native artifacts。角色是 client 还是 server 由 runtime 决定；artifact 名称说明它包含哪个 transport 实现。

| Transport | Artifact family |
|---|---|
| TCP | `nnrp-ffi-transport-tcp-native-<platform>-1.0.0-preview.4.0.zip` |
| QUIC | `nnrp-ffi-transport-quic-native-<platform>-1.0.0-preview.4.0.zip` |
| IPC | `nnrp-ffi-transport-ipc-native-<platform>-1.0.0-preview.4.0.zip` |
| WebSocket | `nnrp-ffi-transport-websocket-native-<platform>-1.0.0-preview.4.0.zip` |

每个包包含 native library、`nnrp_ffi.h` 和 manifest。Manifest 声明 platform、architecture、transport、library name 和 exported symbols。下游 SDK 加载前必须校验 manifest。

manifest 还必须包含以下精确 provider 元数据对象：

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

两个 `u64` 值使用规范十进制字符串，避免 JavaScript 丢失精度。字段缺失、出现未知 limitation、
`max_frame_bytes` 为零，或 cost model 为 `0` 时 units 非零，都会使 artifact 无效。loader 必须在 provider
和 candidate 诊断中保留该对象。

## ABI Types

| 类型 | 说明 |
|---|---|
| `NnrpProtocolVersion` | 当前 major version 与 wire format。 |
| `NnrpHandle` | 带 kind、id、generation、flags 的 typed handle。 |
| `NnrpBufferView` | 只在调用期间有效的 borrowed byte slice。 |
| `NnrpFfiStatus` | Status code、error family、protocol error 和 detail code。 |
| `NnrpFfiDiagnostic` | Status 加关联 connection/session/operation/frame id。 |
| `NnrpEvent` | 带 handles、message type、frame id、owned payload handle/view 和 diagnostics 的 callback/polling event。 |

非空 buffer view 必须使用非空指针。非空 runtime-frame event 通过 `payload_owner` 持有 payload。
Binding 在返回应用 event 前复制 payload，并且必须且只能调用一次
`nnrp_buffer_release(payload_owner)`。Callback 只能在 callback 期间读取 view，复制后同样释放 owner。

## Runtime Requests

| Request | 目的 |
|---|---|
| `NnrpClientConnectRequest` | 创建 client connection handle。 |
| `NnrpSessionOpenRequest` | 打开 client session。 |
| `NnrpSubmitRequest` | 提交一个 operation。 |
| `NnrpClientCancelRequest` | 取消 client work。 |
| `NnrpServerBindRequest` | 创建 server handle。 |
| `NnrpServerAcceptRequest` | 接收 server session。 |
| `NnrpServerReceiveSubmitRequest` | 接收 submit 并创建 operation handle。 |
| `NnrpServerSendResultRequest` | 发送 result bytes。 |
| `NnrpControlRequest` | 发送或校验通用控制面 frame。 |
| `NnrpRuntimeFrameSendRequest` | 通过 session 或 operation handle 发送一条 typed Preview4 控制、对象或缓存 frame。字段为 `handle`、`message_type`、`frame_id` 和 `payload`。 |

`NnrpRuntimeFrameSendRequest.payload` 包含完整编码后的 metadata 与声明 tail。
`nnrp_runtime_frame_send` 在一次调用中校验 message type、metadata layout、声明长度、handle
scope 和 client/server direction，并在返回前 snapshot payload；队列 event 不引用调用方内存。

## Exported Functions

| Function | 说明 |
|---|---|
| `nnrp_current_protocol_version` | 返回当前 protocol version。 |
| `nnrp_client_connect` | 创建 client connection handle。 |
| `nnrp_client_open_session` | 创建 client session handle。 |
| `nnrp_client_submit` | 提交一个 operation 并入队 event。 |
| `nnrp_client_cancel` | 入队 cancel/drop 相关 event。 |
| `nnrp_client_await_event` | 从 connection/session 队列 poll 一个 event。 |
| `nnrp_client_close` | 关闭 client session。 |
| `nnrp_server_bind` | 创建 server handle。 |
| `nnrp_server_accept` | 创建 server session handle。 |
| `nnrp_server_receive_submit` | 接收 submit 并创建 operation handle。 |
| `nnrp_server_send_result` | 入队 result output。 |
| `nnrp_server_send_flow_update` | 入队 flow-control output。 |
| `nnrp_server_close` | 关闭 server session。 |
| `nnrp_control` | 校验并入队通用控制 request。 |
| `nnrp_runtime_frame_send` | Preview4 控制、对象和缓存 frame 的角色中立粗粒度发送路径。 |
| `nnrp_dispatch_event` | 通过 callback 分发一个 borrowed event。 |

`nnrp_control` 只作为 Rust-owned integration 内部处理非 Preview4 control code 的 ABI primitive。
SDK 公开 API 使用 `nnrp_runtime_frame_send`，不得把原始 control-code routing 作为普通应用入口。

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

## 边界规则

::: warning
1. Native artifact 以 transport 为粒度。不要把 client/server 角色包当成隐藏的 native transport bundle。
2. 浏览器 SDK 使用 `nnrp-wasm`；不加载 `.dll`、`.so` 或 `.dylib`。
3. FFI 调用保持粗粒度。用 handle 和 event polling/callback，不要为每个 Rust struct 字段加一个 ABI 调用。
:::
