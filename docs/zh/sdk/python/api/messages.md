# Python — 消息类型

消息元数据类和构造函数分布在 `nnrp.core.messages.control` 和 `nnrp.core.messages.data` 中，通过 `nnrp.core` 统一再导出。

## 导入

```python
from nnrp.core import (
    # 控制消息
    ClientHelloMetadata, ServerHelloAckMetadata,
    SessionPatchMetadata, SessionPatchAckMetadata,
    FlowUpdateMetadata, ResultHintMetadata,
    TransportProbeMetadata, TransportProbeAckMetadata,
    SessionMigrateMetadata, SessionMigrateAckMetadata,
    CachePutMetadata, CacheAckMetadata, CacheInvalidateMetadata,
    ErrorMetadata,
    # 控制扩展
    ControlExtensionEntry,
    ClientHelloTransportPolicyExtension, ServerHelloAckTransportPolicyExtension,
    ClientHelloLossToleranceExtension, ServerHelloAckLossToleranceExtension,
    ClientHelloPayloadCapabilitiesExtension, ServerHelloAckPayloadCapabilitiesExtension,
    # 数据消息
    FrameSubmitMetadata, ResultPushMetadata,
    # 构造函数
    build_frame_submit_packet, build_result_push_packet,
    build_result_drop_packet, build_frame_cancel_packet,
    build_ping_packet, build_pong_packet,
    build_flow_update_packet, build_result_hint_packet,
    build_result_push_mixed_packet, build_result_push_typed_payload_packet,
    # 解包工具
    unpack_tensor_body, unpack_tile_index_block,
    unpack_control_extension_block,
)
```

---

## 控制消息元数据

所有控制消息元数据类均实现 `.pack() -> bytes` 和 `@classmethod .unpack(data: bytes) -> Self` 方法。

### `ClientHelloMetadata`

客户端握手消息元数据。

| 字段 | 类型 | 说明 |
|---|---|---|
| `session_id` | `int` | 客户端分配的会话 ID |
| `max_views` | `int` | 最大并发视角数 |
| `enable_cache` | `bool` | 是否启用服务端缓存 |
| `payload_kind_mask` | `PayloadKind` | 客户端支持的载荷类型掩码 |

### `ServerHelloAckMetadata`

服务端握手应答元数据。

| 字段 | 类型 | 说明 |
|---|---|---|
| `session_id` | `int` | 服务端确认的会话 ID |
| `transport_id` | `TransportId` | 选定的传输类型 |
| `enable_cache` | `bool` | 服务端是否启用了缓存 |
| `max_cache_entries` | `int` | 最大缓存条目数 |
| `max_cache_bytes` | `int` | 最大缓存字节数 |
| `payload_kind_mask` | `PayloadKind` | 服务端支持的载荷类型掩码 |

### `SessionPatchMetadata`

会话动态补丁请求元数据。

| 字段 | 类型 | 说明 |
|---|---|---|
| `patch_fields` | `SessionPatchField` | 要更新的字段位掩码 |
| `target_cadence` | `int` | 目标帧率 |
| `quality_tier` | `int` | 质量档位 |
| `active_lane_mask` | `int` | 活跃视角掩码 |
| `preferred_codec` | `int` | 首选编解码器 ID |
| `preferred_compression` | `int` | 首选压缩级别 |

### `SessionPatchAckMetadata`

会话补丁应答元数据。

| 字段 | 类型 | 说明 |
|---|---|---|
| `patch_fields` | `SessionPatchField` | 已成功应用的字段 |
| `status` | `SessionPatchAckStatus` | 应用状态 |
| `reject_reason` | `SessionPatchRejectReason` | 拒绝原因（仅拒绝时有效） |

### `ErrorMetadata`

协议错误消息元数据。

| 字段 | 类型 | 说明 |
|---|---|---|
| `error_code` | `ErrorCode` | 错误码 |
| `error_scope` | `ErrorScope` | 错误作用域 |
| `session_id` | `int` | 相关会话 ID |
| `frame_id` | `int` | 相关帧 ID |

### `FlowUpdateMetadata`

流控窗口更新元数据。

| 字段 | 类型 | 说明 |
|---|---|---|
| `scope_kind` | `FlowUpdateScopeKind` | 更新作用域 |
| `update_reason` | `FlowUpdateReason` | 更新原因 |
| `backpressure_level` | `FlowUpdateBackpressureLevel` | 背压级别 |
| `connection_credit` | `int` | 连接级配额增量 |
| `session_credit` | `int` | 会话级配额增量 |
| `operation_credit` | `int` | 操作级配额增量 |
| `operation_id` | `int` | 目标操作 ID |
| `retry_after_ms` | `int` | 建议重试延迟（毫秒） |
| `credit_epoch` | `int` | 配额纪元（防乱序） |
| `flags` | `FlowUpdateFlags` | 标志位 |

### `ResultHintMetadata`

服务端结果提示元数据（背压/队列状态预告）。

| 字段 | 类型 | 说明 |
|---|---|---|
| `budget_policy` | `ResultHintBudgetPolicy` | 建议的预算策略 |
| `congestion_state` | `ResultHintCongestionState` | 当前拥塞状态 |
| `reason` | `ResultHintReason` | 提示原因 |
| `frame_id` | `int` | 关联帧 ID |
| `queue_depth` | `int` | 当前队列深度 |
| `estimated_wait_ms` | `int` | 估计等待时间（毫秒） |

### `TransportProbeMetadata` / `TransportProbeAckMetadata`

传输路径探测及应答元数据。

| 字段 | 类型 | 说明 |
|---|---|---|
| `probe_id` | `int` | 探测 ID |
| `transport_id` | `TransportId` | 探测的传输类型 |
| `send_timestamp_us` | `int` | 发送时间戳（微秒） |

### `SessionMigrateMetadata` / `SessionMigrateAckMetadata`

会话迁移通知及确认元数据。

| 字段 | 类型 | 说明 |
|---|---|---|
| `session_id` | `int` | 迁移会话 ID |
| `target_session_id` | `int` | 目标会话 ID |
| `migration_token` | `bytes` | 迁移令牌 |

---

## 缓存消息元数据

### `CachePutMetadata`

| 字段 | 类型 | 说明 |
|---|---|---|
| `object_kind` | `CacheObjectKind` | 对象类型 |
| `object_key` | `int` | 对象键（uint32） |
| `namespace_id` | `int` | 命名空间 ID |
| `flags` | `CachePutFlags` | 存储标志 |
| `body_len` | `int` | 对象字节数 |

### `CacheAckMetadata`

| 字段 | 类型 | 说明 |
|---|---|---|
| `object_kind` | `CacheObjectKind` | 对象类型 |
| `object_key` | `int` | 对象键 |
| `status` | `CacheAckStatus` | 存储结果 |

### `CacheInvalidateMetadata`

| 字段 | 类型 | 说明 |
|---|---|---|
| `scope` | `CacheInvalidateScope` | 失效范围 |
| `object_kind` | `CacheObjectKind` | 对象类型（`OBJECT_KIND` 范围时有效） |
| `namespace_id` | `int` | 命名空间 ID |
| `object_key` | `int` | 对象键（`OBJECT_KEY` 范围时有效） |

---

## 数据消息元数据

### `FrameSubmitMetadata`

帧提交消息元数据。

| 字段 | 类型 | 说明 |
|---|---|---|
| `input_profile` | `InputProfile` | 输入数据格式 |
| `submit_mode` | `SubmitMode` | 提交模式（内联/引用/混合） |
| `budget_policy` | `BudgetPolicy` | 允许的预算降质策略 |
| `payload_kind_bitmap` | `PayloadKind` | 载荷类型位掩码 |
| `tile_count` | `int` | 瓦片总数 |
| `section_count` | `int` | Tensor 分区数 |
| `inference_budget_ms` | `int` | 最大推理预算（毫秒） |
| `deadline_ms` | `int` | 绝对截止时间（毫秒） |

### `ResultPushMetadata`

结果推送消息元数据。

| 字段 | 类型 | 说明 |
|---|---|---|
| `result_class` | `ResultClass` | 结果完整性分类 |
| `result_flags` | `ResultFlags` | 结果标志 |
| `applied_budget_policy` | `BudgetPolicy` | 实际应用的降质策略 |
| `active_profile_id` | `int` | 推理时使用的 Profile ID |
| `inference_ms` | `int` | 推理耗时（毫秒） |
| `queue_ms` | `int` | 排队耗时（毫秒） |
| `server_total_ms` | `int` | 服务端总耗时（毫秒） |
| `status_code` | `int` | 状态码 |
| `tile_index_mode` | `TileIndexMode` | 瓦片索引编码格式 |
| `tile_base_id` | `int` | 瓦片索引基偏移 |
| `covered_tile_count` | `int` | 已覆盖的瓦片数 |
| `dropped_tile_count` | `int` | 已丢弃的瓦片数 |
| `reused_frame_id` | `int` | 重用的帧 ID（`ResultClass.STALE_REUSE` 时有效） |
| `payload_kind_bitmap` | `PayloadKind` | 实际载荷类型位掩码 |
| `payload_frame_count` | `int` | 非 Tensor 载荷帧数 |

---

## 控制扩展类型

扩展块附加在 `CLIENT_HELLO` / `SERVER_HELLO_ACK` 元数据之后，由 `ControlExtensionEntry` 描述。

```python
@dataclass(frozen=True, slots=True)
class ControlExtensionEntry:
    type_id: int        # 扩展类型 ID（见枚举常量）
    flags: ControlExtensionFlags
    payload: bytes
```

### 预定义扩展类型

| 类 | 方向 | 说明 |
|---|---|---|
| `ClientHelloTransportPolicyExtension` | C→S | 客户端声明传输策略偏好 |
| `ServerHelloAckTransportPolicyExtension` | S→C | 服务端确认传输策略 |
| `ClientHelloLossToleranceExtension` | C→S | 客户端声明丢包容忍度 |
| `ServerHelloAckLossToleranceExtension` | S→C | 服务端确认丢包容忍度 |
| `ClientHelloPayloadCapabilitiesExtension` | C→S | 客户端声明支持的载荷类型 |
| `ServerHelloAckPayloadCapabilitiesExtension` | S→C | 服务端确认载荷能力 |

---

## 包构造函数

高层构造函数，返回完整的 `NnrpPacket`。

```python
def build_frame_submit_packet(
    session_id: int,
    frame_id: int,
    *,
    tile_ids: tuple[int, ...],
    sections: tuple[TensorSectionData, ...],
    input_profile: InputProfile,
    submit_mode: SubmitMode,
    budget_policy: BudgetPolicy,
    payload_kind_bitmap: PayloadKind,
    inference_budget_ms: int,
    deadline_ms: int,
    flags: HeaderFlags = HeaderFlags.NONE,
    view_id: int = 0,
    route_id: int = 0,
    trace_id: int = 0,
) -> NnrpPacket: ...

def build_result_push_packet(
    session_id: int,
    frame_id: int,
    *,
    tile_ids: tuple[int, ...],
    sections: tuple[TensorSectionData, ...],
    result_flags: ResultFlags,
    active_profile_id: int,
    inference_ms: int,
    queue_ms: int,
    server_total_ms: int,
    status_code: int,
    tile_index_mode: TileIndexMode,
    tile_base_id: int,
    result_class: ResultClass,
    applied_budget_policy: BudgetPolicy,
    reused_frame_id: int,
    covered_tile_count: int,
    dropped_tile_count: int,
    payload_kind_bitmap: PayloadKind,
    payload_frame_count: int,
    flags: HeaderFlags = HeaderFlags.NONE,
    view_id: int = 0,
    route_id: int = 0,
    trace_id: int = 0,
) -> NnrpPacket: ...

def build_result_push_mixed_packet(...) -> NnrpPacket: ...
def build_result_push_typed_payload_packet(...) -> NnrpPacket: ...
def build_result_drop_packet(session_id: int, frame_id: int, *, ...) -> NnrpPacket: ...
def build_frame_cancel_packet(session_id: int, frame_id: int, *, ...) -> NnrpPacket: ...
def build_ping_packet(session_id: int, *, frame_id: int = 0, ...) -> NnrpPacket: ...
def build_pong_packet(session_id: int, *, frame_id: int = 0, ...) -> NnrpPacket: ...
def build_flow_update_packet(session_id: int, *, metadata: FlowUpdateMetadata, ...) -> NnrpPacket: ...
def build_result_hint_packet(session_id: int, *, metadata: ResultHintMetadata, ...) -> NnrpPacket: ...
```

---

## 解包工具函数

```python
def unpack_tensor_body(body: bytes, section_count: int) -> TensorBodyView:
    """从包体字节流解析 Tensor 分区数据视图。"""

def unpack_tile_index_block(body: bytes, mode: TileIndexMode) -> tuple[int, ...]:
    """解析瓦片索引块，返回瓦片 ID 元组。"""

def unpack_control_extension_block(payload: bytes) -> tuple[ControlExtensionEntry, ...]:
    """解析控制扩展块，返回所有扩展条目。"""

def unpack_inline_object_blocks(body: bytes) -> ...:
    """解析内联对象块。"""

def unpack_object_reference_blocks(body: bytes) -> tuple[ObjectReferenceBlock, ...]:
    """解析对象引用块。"""

def unpack_typed_payload_frames(body: bytes) -> ...:
    """解析非 Tensor 类型载荷帧列表。"""

def unpack_body(packet: NnrpPacket) -> ...:
    """通用包体解析入口（自动按消息类型分发）。"""

def validate_frame_submit_body(packet: NnrpPacket, metadata: FrameSubmitMetadata) -> None:
    """验证 FRAME_SUBMIT 包体完整性，不合法则抛出 ValueError。"""
```

---

## 典型使用场景

### 场景一：构造并发送帧提交包（低层方式）

生产路径通常应使用 native client connection；packet transport helper 场景使用 `ClientSession.submit()` 或 `ClientSession.send_submit()`。只有在自定义传输适配器或压测工具中，才直接使用构造函数。

```python
from nnrp.core import (
    build_frame_submit_packet,
    FrameSubmitMetadata,
    TensorSectionData,
)
from nnrp import SubmitMode, BudgetPolicy, InputProfile, TileIndexMode

metadata = FrameSubmitMetadata(
    frame_id=100,
    input_profile=InputProfile.CHANGED_TILES_LUMA,
    submit_mode=SubmitMode.INLINE,
    budget_policy=BudgetPolicy.ALLOW_PARTIAL,
    inference_budget_ms=8,
    tile_ids=(3, 7, 12),
    tile_index_mode=TileIndexMode.RAW_U16,
)
section = TensorSectionData(
    role_id=0,
    dtype_id=0,  # FP16
    tile_payloads=(tile_bytes_3, tile_bytes_7, tile_bytes_12),
)
packet = build_frame_submit_packet(
    session_id=42,
    metadata=metadata,
    sections=(section,),
)
raw = packet.pack()
await transport.send(raw)
```

### 场景二：解析握手扩展

自定义握手扩展通过 `ControlExtensionEntry` 携带，需按扩展类型 ID 分发解析。

```python
from nnrp.core import (
    unpack_control_extension_block,
    ClientHelloTransportPolicyExtension,
)
from nnrp.enums import CLIENT_HELLO_TRANSPORT_POLICY_EXTENSION

extensions = unpack_control_extension_block(packet.metadata)
for entry in extensions:
    if entry.ext_type == CLIENT_HELLO_TRANSPORT_POLICY_EXTENSION:
        policy_ext = ClientHelloTransportPolicyExtension.unpack(entry.payload)
        print("Requested transport policy:", policy_ext.transport_policy)
```

### 场景三：结果包解析与 Tensor 重组

```python
from nnrp.core import unpack_body, unpack_tensor_body
from nnrp.core.enums import MessageType

packet = await connection.receive_packet()
assert packet.header.msg_type is MessageType.RESULT_PUSH

body = unpack_body(packet)
# body.metadata: ResultPushMetadata
# body.tensor_body: TensorBodyView | None

if body.tensor_body:
    for section_idx, section in enumerate(body.tensor_body.sections):
        for tile_idx, tile_bytes in enumerate(section.tile_payloads):
            reconstruct_tile(section_idx, tile_idx, tile_bytes)
```

---

## 常见坑点

::: warning
1. **元数据（`metadata`）vs 包体（`body`）**：`NnrpPacket.metadata` 是小型结构化字段（帧 ID、预算、策略等），`NnrpPacket.body` 是大块二进制载荷（Tensor 数据）。两者物理上分开存储；若误用 `unpack_tensor_body(packet.metadata, ...)` 而非 `packet.body`，会得到解析错误或截断数据。

2. **`FrameSubmitMetadata.tile_ids` 与 `TensorSectionData.tile_payloads` 的顺序必须一致**：`tile_ids[i]` 对应 `tile_payloads[i]`，乱序会导致服务端用错误的位置索引拼合结果瓦片，渲染出现乱序伪影。

3. **`validate_frame_submit_body` 只做结构性校验**，不验证张量数值合法性；调用它不代表数据一定能被推理引擎正确处理。

4. **`build_result_push_mixed_packet` 和 `build_result_push_typed_payload_packet` 适用不同场景**：前者同时包含 Tensor 和非 Tensor 载荷，后者只含非 Tensor 载荷（如 Token 流）；混用会导致接收端解包出现空分区。
:::
