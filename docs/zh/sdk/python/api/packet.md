# Python — 包头与数据包

包头与数据包相关类型定义在 `nnrp.core` 模块中。

## 导入

```python
from nnrp.core import (
    NnrpHeader, NnrpPacket, TensorSectionData,
    HEADER_MAGIC, HEADER_LENGTH,
)
```

---

## 常量

| 名称 | 类型 | 值 | 说明 |
|---|---|---|---|
| `HEADER_MAGIC` | `bytes` | `b"NNRP"` | 每个数据包固定前四字节魔数 |
| `HEADER_LENGTH` | `int` | `40` | 固定包头字节长度 |

### 元数据结构体长度常量

| 名称 | 说明 |
|---|---|
| `FRAME_SUBMIT_METADATA_LENGTH` | `FRAME_SUBMIT` 消息的元数据字节长度 |
| `RESULT_PUSH_METADATA_LENGTH` | `RESULT_PUSH` 消息的元数据字节长度 |
| `CLIENT_HELLO_METADATA_LENGTH` | `CLIENT_HELLO` 元数据字节长度 |
| `SERVER_HELLO_ACK_METADATA_LENGTH` | `SERVER_HELLO_ACK` 元数据字节长度 |
| `SESSION_PATCH_METADATA_LENGTH` | `SESSION_PATCH` 元数据字节长度 |
| `SESSION_PATCH_ACK_METADATA_LENGTH` | `SESSION_PATCH_ACK` 元数据字节长度 |
| `CACHE_PUT_METADATA_LENGTH` | `CACHE_PUT` 元数据字节长度 |
| `CACHE_ACK_METADATA_LENGTH` | `CACHE_ACK` 元数据字节长度 |
| `CACHE_INVALIDATE_METADATA_LENGTH` | `CACHE_INVALIDATE` 元数据字节长度 |
| `ERROR_METADATA_LENGTH` | `ERROR` 元数据字节长度 |
| `FLOW_UPDATE_METADATA_LENGTH` | `FLOW_UPDATE` 元数据字节长度 |
| `RESULT_HINT_METADATA_LENGTH` | `RESULT_HINT` 元数据字节长度 |
| `TRANSPORT_PROBE_METADATA_LENGTH` | `TRANSPORT_PROBE` 元数据字节长度 |
| `TRANSPORT_PROBE_ACK_METADATA_LENGTH` | `TRANSPORT_PROBE_ACK` 元数据字节长度 |
| `SESSION_MIGRATE_METADATA_LENGTH` | `SESSION_MIGRATE` 元数据字节长度 |
| `SESSION_MIGRATE_ACK_METADATA_LENGTH` | `SESSION_MIGRATE_ACK` 元数据字节长度 |

---

## `NnrpHeader`

固定长度的包头（`@dataclass(frozen=True, slots=True)`）。线路格式：`struct.Struct("<4sBBBBIIIIIHHQ")`，40 字节。

### 字段

| 字段 | 类型 | 位置 | 说明 |
|---|---|---|---|
| `wire_format` | `WireFormat` | 字节 4 | 线路格式版本（当前固定为 `CURRENT=0`） |
| `version_major` | `int` | 字节 5 | 协议主版本（当前为 `1`） |
| `msg_type` | `MessageType` | 字节 6 | 消息类型 |
| `flags` | `HeaderFlags` | 字节 7 | 包头标志位 |
| `meta_len` | `int` | 字节 8–11 | 元数据字节数 |
| `body_len` | `int` | 字节 12–15 | 包体字节数 |
| `session_id` | `int` | 字节 16–19 | 会话 ID |
| `frame_id` | `int` | 字节 20–23 | 帧 ID |
| `view_id` | `int` | 字节 24–27 | 视角/视图 ID |
| `route_id` | `int` | 字节 28–29 | 路由 ID（uint16） |
| `trace_id` | `int` | 字节 30–31 | 追踪 ID（uint16） |
| `header_len` | `int` | 字节 32–39（保留）| 固定为 `HEADER_LENGTH=40` |

### 方法

```python
def pack(self) -> bytes:
    """将包头序列化为 40 字节（含 4 字节魔数前缀）。"""

@classmethod
def unpack(
    cls,
    payload: bytes,
    *,
    expected_wire_format: WireFormat | None = None,
) -> "NnrpHeader":
    """从字节序列解析包头。若指定 expected_wire_format 且不匹配则抛出 ValueError。"""
```

---

## `NnrpPacket`

完整 NNRP 数据包，包含包头、元数据和包体（`@dataclass(frozen=True, slots=True)`）。

### 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `header` | `NnrpHeader` | 包头 |
| `metadata` | `bytes` | 消息元数据原始字节 |
| `body` | `bytes` | 消息体原始字节 |

### 方法

```python
def pack(self) -> bytes:
    """将完整数据包序列化为字节。"""

@classmethod
def build(
    cls,
    msg_type: MessageType,
    *,
    wire_format: WireFormat = WireFormat.CURRENT,
    version_major: int = 1,
    flags: HeaderFlags = HeaderFlags.NONE,
    session_id: int = 0,
    frame_id: int = 0,
    view_id: int = 0,
    route_id: int = 0,
    trace_id: int = 0,
    metadata: bytes = b"",
    body: bytes = b"",
) -> "NnrpPacket":
    """构造并返回一个新的 NnrpPacket。"""

@classmethod
def unpack(cls, payload: bytes) -> "NnrpPacket":
    """从字节序列解析完整数据包（包头 + 元数据 + 包体）。"""
```

---

## `TensorSectionData`

描述单个 Tensor 分区的数据容器（`@dataclass(frozen=True, slots=True)`）。

### 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `role_id` | `int` | Tensor 角色 ID |
| `default_codec_id` | `int` | 默认编解码器 ID |
| `dtype_id` | `int` | 数据类型（对应 `TensorDType`） |
| `tile_payloads` | `tuple[bytes, ...]` | 各瓦片的原始字节载荷 |
| `codec_ids` | `tuple[int, ...]` | 各瓦片的编解码器 ID（可为空） |
| `layout_id` | `int` | 内存布局（对应 `TensorLayout`） |
| `scale_policy` | `int` | 量化缩放策略（对应 `ScalePolicy`） |
| `payload_stride_bytes` | `int` | 固定步长（字节），`0` 表示可变 |
| `element_count_per_tile` | `int` | 每瓦片元素数 |

### 方法

```python
def normalized_tile_payloads(self) -> tuple[bytes, ...]:
    """返回规范化的各瓦片载荷。"""

def normalized_codec_ids(self) -> tuple[int, ...]:
    """返回规范化的各瓦片编解码器 ID 列表。"""
```

---

## 示例：构造并解析一个 PING 包

```python
from nnrp.core import NnrpPacket, NnrpHeader
from nnrp.core.enums import MessageType, WireFormat

# 构造
packet = NnrpPacket.build(
    MessageType.PING,
    session_id=42,
    frame_id=1,
)
raw = packet.pack()

# 解析
restored = NnrpPacket.unpack(raw)
assert restored.header.msg_type is MessageType.PING
assert restored.header.session_id == 42
```

---

## 典型使用场景

### 何时需要直接操作数据包

绝大多数业务代码**不需要直接操作 `NnrpPacket` 或 `NnrpHeader`**，`ClientSession` / `ServerSession` 已封装所有常用操作。以下情况才需要用到低层包 API：

- 实现自定义传输适配器（桥接非 QUIC/TCP 协议）
- 编写协议一致性测试 / 压测工具
- 调试：将收到的原始数据包序列化后保存或重放
- 扩展 `ControlExtensionEntry` 携带自定义握手字段

### 构造自定义 PING 并测量延迟

```python
import time
from nnrp.core import NnrpPacket
from nnrp.core.enums import MessageType

async def measure_rtt(connection) -> float:
    """发送 PING，等待 PONG，返回往返延迟（秒）。"""
    seq = int(time.monotonic() * 1000) & 0xFFFF
    ping = NnrpPacket.build(
        MessageType.PING,
        session_id=connection.session_id,
        frame_id=seq,
    )
    t0 = time.monotonic()
    await connection.send_packet(ping)
    pong = await connection.receive_packet(timeout=2.0)
    assert pong.header.msg_type is MessageType.PONG
    return time.monotonic() - t0
```

### 解析收到的原始数据包

```python
from nnrp.core import NnrpPacket
from nnrp.core.enums import MessageType
from nnrp.core.messages import unpack_body

raw_bytes = await raw_transport.recv()
packet = NnrpPacket.unpack(raw_bytes)

match packet.header.msg_type:
    case MessageType.FRAME_SUBMIT:
        body = unpack_body(packet)   # 返回 FrameSubmitBody
        process_submit(body)
    case MessageType.RESULT_PUSH:
        body = unpack_body(packet)   # 返回 ResultPushBody
        process_result(body)
    case _:
        log.warning("Unexpected message type: %s", packet.header.msg_type)
```

---

## 常见坑点

::: warning
1. **包头长度字段是固定的**：`NnrpHeader` 序列化长度由协议版本决定，不可在包头末尾追加自定义字节；扩展字段应放在 `metadata` 段（通过 `ControlExtensionEntry` 机制）。

2. **Magic bytes 校验**：`NnrpPacket.unpack()` 会验证前 4 字节魔数，若从网络流截取时偏移错误（如少读了一个长度前缀），解析会立即抛出 `ValueError: bad magic`。TCP 传输需先读 4 字节长度前缀，再读对应字节数的完整包。

3. **`pack()` 返回的 `bytes` 是不可变的**：不要在发送前尝试 `raw[x] = y` 原地修改；若需修改某字段，重新调用 `NnrpPacket.build()` 构造新包。

4. **`session_id` 和 `frame_id` 均为无符号整数**，值域 `[0, 2^32)` 和 `[0, 2^32)`；传入负数时 Python 不会报错但序列化会截断，导致接收端解析出错。
:::
