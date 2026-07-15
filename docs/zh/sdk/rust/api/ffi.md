# Rust — FFI / 原生 Artifact

`nnrp-ffi` 通过 C-compatible ABI 暴露 Rust 拥有的协议和 runtime 行为，供 Python、C#、Unity、Node native loader 和未来语言绑定使用。Preview4 继续保持粗粒度 FFI 边界：调用方通过 handle、event 和 owned buffer 工作，而不是为了每个小字段跨一次 ABI。

## Cargo

```toml
[dependencies]
nnrp-ffi = "1.0.0-preview.4.4"
```

## Native Artifact 形态

Preview4 发布 transport-scoped native artifacts。角色是 client 还是 server 由 runtime 决定；artifact 名称说明它包含哪个 transport 实现。

| Transport | Artifact family |
|---|---|
| TCP | `nnrp-ffi-transport-tcp-native-<platform>-1.0.0-preview.4.4.zip` |
| QUIC | `nnrp-ffi-transport-quic-native-<platform>-1.0.0-preview.4.4.zip` |
| IPC | `nnrp-ffi-transport-ipc-native-<platform>-1.0.0-preview.4.4.zip` |
| WebSocket | `nnrp-ffi-transport-websocket-native-<platform>-1.0.0-preview.4.4.zip` |

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

## Transport-Scoped FFI

Transport-scoped artifact 必须暴露下游可达的 framed transport API。只编译 transport feature 或在
manifest 中写入 transport 名称不算完成。

### Request 与 Result

ABI 为 `NnrpHandleKind` 增加以下冻结值：`TransportConnection = 10`、
`TransportListener = 11`、`TransportSecurityConfig = 12`。Transport ID 保持为
`Quic = 1`、`Tcp = 2`、`Ipc = 3`、`WebSocket = 4`。

C layout 使用下列 Rust `#[repr(C)]` 布局。所有 `flags` 与 `reserved0` 都必须为零；buffer view
只在调用期间借用。

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

| 类型 | 冻结字段与行为 |
|---|---|
| `NnrpTransportOpenRequest` | `transport_id`、必须为零的 `flags`、UTF-8 `endpoint`、`config`、`max_packet_bytes` 和 `timeout_ms`。Packet limit 为零时使用 64 MiB；timeout 为零时使用 30 秒。TCP/IPC 的 `config` 必须为 invalid handle；`ws://` 可选；QUIC 与 `wss://` listener 必填。 |
| `NnrpTransportAcceptRequest` | Listener handle 与 `timeout_ms`；零值使用 30 秒。 |
| `NnrpTransportWriteBatchRequest` | Connection handle、指向 `NnrpBufferView` 数组的指针以及 `frame_count`。每个 entry 都是包含 common header 的完整 NNRP packet。 |
| `NnrpTransportReadBatchRequest` | Connection handle、`max_frames`、`max_bytes` 和 `timeout_ms`。零值分别使用 16 帧、64 MiB 和 30 秒。 |
| `NnrpTransportFrameBatch` | Owned buffer handle/view 与 frame count。Buffer 重复存放 little-endian `u32 packet_len` 和一条完整 NNRP packet。 |
| `NnrpTransportProbeRequest` | Open request 加 `sample_count` 与 `probe_payload_bytes`；零值分别使用 3 次与 32 KiB。`sample_count` 不得超过 32，payload 不得超过有效 packet limit。 |
| `NnrpTransportProbeResult` | Sample count、success count、median throughput bytes per second 与 median RTT microseconds。 |
| `NnrpTransportClientSecurityConfigRequest` | `transport_id`、UTF-8 `server_name` 与一张受信任 DER 证书。只用于 QUIC 和 secure WebSocket client。 |
| `NnrpTransportServerSecurityConfigRequest` | `transport_id`、一张 DER 证书和一个 PKCS#8 DER private key。只用于 QUIC 和 secure WebSocket listener。 |

Endpoint scheme 必须与 artifact transport 一致：TCP 使用 `tcp://`，QUIC 使用 `quic://`，IPC 使用
`unix://` 或 `npipe://`，WebSocket 使用 `ws://` 或 `wss://`。平台不兼容的 IPC scheme 必须在创建
handle 前失败。Transport-specific security configuration 由
`nnrp_transport_client_security_config_create` 或 `nnrp_transport_server_security_config_create` 创建的
typed configuration handle 提供。Handle 不可变，并通过 `nnrp_transport_close` 关闭。TCP、IPC 与
`ws://` 必须使用 invalid configuration handle；QUIC 与 `wss://` 必须使用对应的 client/server
configuration。Artifact 不得暗中关闭证书校验。

`NnrpTransportFrameBatch.payload_owner` 必须且只能调用一次 `nnrp_buffer_release`；view 在释放前有效。
成功读取不会返回空 packet 集合：timeout、peer orderly close 与 transport failure 使用不同 status。
Write 保持数组顺序，并且要么接受完整 batch，要么在 status detail 中返回第一个失败 frame 的索引。

### Function

精确签名如下：

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

| Function | 说明 |
|---|---|
| `nnrp_transport_probe` | 建立连接，交换协议 `TRANSPORT_PROBE` / `TRANSPORT_PROBE_ACK` frame，并返回实测指标。 |
| `nnrp_transport_connect` | 建立由 Rust 持有的 framed connection，并返回 transport-connection handle。 |
| `nnrp_transport_listen` | 建立由 Rust 持有的 framed listener，并返回 transport-listener handle。 |
| `nnrp_transport_accept` | 从 listener 接收一条 connection。 |
| `nnrp_transport_listener_endpoint` | 把包含 OS 分配端口的规范化 bound endpoint snapshot 到 owned UTF-8 buffer。 |
| `nnrp_transport_write_batch` | 在一次 ABI 调用中校验并写入完整 NNRP packet。 |
| `nnrp_transport_read_batch` | 把完整 NNRP packet 读入一个 owned batch buffer。 |
| `nnrp_transport_close` | 幂等关闭 transport connection 或 listener handle。 |
| `nnrp_transport_client_security_config_create` | 创建不可变的 QUIC/WSS client security configuration handle。 |
| `nnrp_transport_server_security_config_create` | 创建不可变的 QUIC/WSS server security configuration handle。 |

Socket read/write、WebSocket fragment、QUIC stream chunk 与 IPC pipe chunk 全部留在 Rust 内部。
Binding 只为完整 packet batch 与生命周期操作跨越 ABI。`nnrp_transport_probe` 必须使用 peer
acknowledgement；loader 不得根据 local availability 伪造成功 probe 指标。

Manifest 的 `exports` 列表必须包含上述十个 function。发布前必须加载每个 transport-scoped library，
并通过该 library 执行真实 loopback。

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
| `nnrp_transport_probe` | 使用协议 probe frame 测量一个 transport endpoint。 |
| `nnrp_transport_connect` | 建立由 Rust 持有的 framed transport connection。 |
| `nnrp_transport_listen` | 建立由 Rust 持有的 framed transport listener。 |
| `nnrp_transport_accept` | 接收一条 framed transport connection。 |
| `nnrp_transport_listener_endpoint` | 通过 owned UTF-8 buffer 返回规范化 bound endpoint。 |
| `nnrp_transport_write_batch` | 发送完整 NNRP packet batch。 |
| `nnrp_transport_read_batch` | 接收完整 NNRP packet batch。 |
| `nnrp_transport_close` | 关闭 transport connection 或 listener。 |
| `nnrp_transport_client_security_config_create` | 创建 QUIC/WSS client security configuration。 |
| `nnrp_transport_server_security_config_create` | 创建 QUIC/WSS server security configuration。 |
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
