# Python — 服务端

服务端 API 定义在 `nnrp.server` 包中。

## 导入

```python
from nnrp.server import (
    ServerProfile,
    ServerSession,
    ClientHelloContext,
    ReceivedSubmit,
    accept_server_session,
)
from nnrp.server.transport import ServerListener, ServerConnection
```

---

## 配置类型

### `ServerProfile`

服务端全局配置（`@dataclass`，可变）。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `max_concurrent_frames` | `int` | `1` | 最大并发处理帧数 |
| `enable_cache` | `bool` | `True` | 是否启用缓存协商 |
| `max_sections` | `int` | `16` | 单帧最大 Tensor 分区数 |
| `max_body_bytes` | `int` | `33554432` | 单帧最大包体字节数（32 MB） |

---

## 上下文类型

### `ClientHelloContext`

握手完成后的客户端上下文，由框架在 `accept_server_session` 内部构造（`@dataclass(frozen=True, slots=True)`）。

| 字段 | 类型 | 说明 |
|---|---|---|
| `packet` | `NnrpPacket` | 原始 `CLIENT_HELLO` 数据包 |
| `metadata` | `ClientHelloMetadata` | 解析后的握手元数据 |
| `auth_block` | `bytes` | 客户端携带的认证块（由应用自行验证） |
| `control_extensions` | `tuple[ControlExtensionEntry, ...]` | 握手时附带的控制扩展条目 |

### `ReceivedSubmit`

从连接中收到并解析的帧提交数据（`@dataclass(frozen=True, slots=True)`）。

| 字段 | 类型 | 说明 |
|---|---|---|
| `packet` | `NnrpPacket` | 原始 `FRAME_SUBMIT` 数据包 |
| `metadata` | `FrameSubmitMetadata` | 解析后的帧元数据 |
| `request` | `SubmitRequest` | 结构化提交请求 |
| `tensor_body` | `TensorBodyView \| None` | Tensor 包体视图（无 Tensor 载荷时为 `None`） |

---

## `ServerSession`

已建立连接的服务端会话（`@dataclass(slots=True)`）。

### 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `connection` | `NnrpQuicConnection \| NnrpTcpConnection` | 底层传输连接 |
| `transport_id` | `TransportId` | 当前使用的传输类型 |
| `hello` | `ClientHelloContext` | 握手上下文 |
| `session_id` | `int` | 当前会话 ID |
| `active_model_name` | `str` | 当前激活的模型名（默认空字符串） |
| `server_profile` | `ServerProfile` | 服务端配置 |

### 方法

#### `receive_submit`

```python
async def receive_submit(
    self,
    timeout: float | None = None,
) -> ReceivedSubmit:
    """
    等待并接收下一个 FRAME_SUBMIT 包，解析后返回 ReceivedSubmit。

    Raises:
        ValueError: 收到非 FRAME_SUBMIT 消息，或 session_id 不匹配，或 wire_format 不支持。
        asyncio.TimeoutError: timeout 不为 None 且超时。
    """
```

#### `send_result`

```python
async def send_result(
    self,
    *,
    frame_id: int,
    tile_ids: tuple[int, ...] = (),
    sections: tuple[TensorSectionData, ...] = (),
    typed_payloads: tuple[TypedPayload, ...] = (),
    result_flags: ResultFlags = ResultFlags.NONE,
    active_profile_id: int = 0,
    inference_ms: int = 0,
    queue_ms: int = 0,
    server_total_ms: int = 0,
    status_code: int = 0,
    tile_index_mode: TileIndexMode = TileIndexMode.RAW_U16,
    tile_base_id: int = 0,
    result_class: ResultClass = ResultClass.COMPLETE,
    applied_budget_policy: BudgetPolicy = BudgetPolicy.NONE,
    reused_frame_id: int = 0,
    covered_tile_count: int | None = None,
    dropped_tile_count: int = 0,
    payload_kind_bitmap: PayloadKind = PayloadKind.TENSOR,
    payload_frame_count: int = 0,
    flags: HeaderFlags = HeaderFlags.NONE,
    view_id: int = 0,
    route_id: int = 0,
    trace_id: int = 0,
) -> int:
    """
    向客户端推送帧处理结果。

    返回发送的总字节数。

    参数说明：
    - sections：Tensor 分区数据（与 typed_payloads 至少提供一种）
    - typed_payloads：非 Tensor 类型载荷
    - covered_tile_count：若为 None，自动设为 len(tile_ids)
    - result_class：PARTIAL/STALE_REUSE/DEGRADED 时须配合 applied_budget_policy
    """
```

---

## 连接接受函数

### `accept_server_session`

```python
async def accept_server_session(
    listener_or_connection: ServerListener | ServerConnection,
    profile: ServerProfile,
    *,
    model_name: str = "",
    extra_extensions: tuple[ControlExtensionEntry, ...] = (),
    auth_validator: Callable[[bytes], bool] | None = None,
) -> ServerSession:
    """
    接受新连接，完成握手，返回 ServerSession。

    - 若 listener_or_connection 是 Listener，先调用 .accept() 获取 Connection
    - 完成 CLIENT_HELLO / SERVER_HELLO_ACK 交换
    - 若 auth_validator 不为 None，在握手前调用；返回 False 则发送 ERROR 后关闭连接
    """
```

---

## 完整服务端示例

```python
import asyncio
from nnrp.server import ServerProfile, accept_server_session
from nnrp.adapters import serve_quic

async def handle_session(session):
    while True:
        received = await session.receive_submit()
        # 执行推理...
        await session.send_result(
            frame_id=received.metadata.frame_id,
            sections=my_inference(received.request),
            result_class=ResultClass.COMPLETE,
        )

async def main():
    profile = ServerProfile(max_concurrent_frames=4)
    async with serve_quic("0.0.0.0", 4433, config=server_quic_config) as listener:
        while True:
            session = await accept_server_session(listener, profile)
            asyncio.create_task(handle_session(session))

asyncio.run(main())
```
