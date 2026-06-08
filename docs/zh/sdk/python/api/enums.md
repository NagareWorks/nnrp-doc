# 枚举与常量

> **如何使用本页**：第一部分（导入 +
> 各类型参考表）适合查询某个具体枚举成员的值和含义；第二部分「[使用场景指南](#使用场景指南)」按实际开发任务分组，包含代码示例和常见坑点，不确定用哪个枚举时从这里入手。

枚举分散在 `nnrp.core.enums` 和 `nnrp.core.messages` 子模块，通过顶层 `nnrp` 命名空间统一再导出。

## 导入

```python
# 推荐：顶层导入
from nnrp import (
    MessageType, HeaderFlags, FrameClass, ErrorCode,
    TransportId, TransportPolicy, LossTolerance, PayloadKind,
    FlowUpdateScopeKind, FlowUpdateReason, FlowUpdateBackpressureLevel, FlowUpdateFlags,
    ResultHintBudgetPolicy, ResultHintCongestionState, ResultHintReason,
)

# 精确导入
from nnrp.core.enums import WireFormat, MessageType, HeaderFlags, FrameClass, ErrorCode
from nnrp.core.messages.control import (
    ErrorScope, CacheObjectKind, CacheAckStatus, CacheInvalidateScope, CachePutFlags,
    SessionPatchField, SessionPatchAckStatus, SessionPatchRejectReason,
    FlowUpdateScopeKind, FlowUpdateReason, FlowUpdateBackpressureLevel, FlowUpdateFlags,
    ResultHintBudgetPolicy, ResultHintCongestionState, ResultHintReason,
    TransportId, TransportPolicy, LossTolerance, PayloadKind, ControlExtensionFlags,
)
from nnrp.core.messages.data import (
    InputProfile, TileIndexMode, TensorDType, TensorLayout, ScalePolicy,
    ResultFlags, SubmitMode, BudgetPolicy, ResultClass, SectionFlags,
)
```

---

## 线路格式

### `WireFormat(IntEnum)`

| 成员      | 值  | 说明                             |
| --------- | --- | -------------------------------- |
| `CURRENT` | `0` | 当前唯一支持的线路格式（NNRP/1） |

---

## 消息类型

### `MessageType(IntEnum)`

| 成员                  | 值     | 方向 | 说明                        |
| --------------------- | ------ | ---- | --------------------------- |
| `CLIENT_HELLO`        | `0x01` | C→S  | 连接建立，携带客户端能力集  |
| `SERVER_HELLO_ACK`    | `0x02` | S→C  | 握手应答，确认能力协商结果  |
| `SESSION_PATCH`       | `0x03` | C→S  | 会话参数动态调整请求        |
| `SESSION_PATCH_ACK`   | `0x04` | S→C  | 会话参数调整结果            |
| `CLOSE`               | `0x05` | 双向 | 优雅关闭                    |
| `ERROR`               | `0x06` | 双向 | 协议错误通知                |
| `FRAME_SUBMIT`        | `0x10` | C→S  | 提交帧数据                  |
| `FRAME_CANCEL`        | `0x11` | C→S  | 取消帧提交                  |
| `RESULT_PUSH`         | `0x12` | S→C  | 推送处理结果                |
| `RESULT_DROP`         | `0x13` | S→C  | 通知结果被丢弃              |
| `CACHE_PUT`           | `0x14` | C→S  | 存储缓存对象                |
| `CACHE_ACK`           | `0x15` | S→C  | 缓存存储结果                |
| `CACHE_INVALIDATE`    | `0x16` | C→S  | 缓存失效请求                |
| `FLOW_UPDATE`         | `0x17` | 双向 | 流控窗口更新                |
| `RESULT_HINT`         | `0x18` | S→C  | 服务端提示（背压/队列状态） |
| `TRANSPORT_PROBE`     | `0x19` | 双向 | 传输路径探测                |
| `TRANSPORT_PROBE_ACK` | `0x1A` | 双向 | 路径探测应答                |
| `SESSION_MIGRATE`     | `0x1B` | S→C  | 会话迁移通知                |
| `SESSION_MIGRATE_ACK` | `0x1C` | C→S  | 会话迁移确认                |
| `PING`                | `0x20` | 双向 | 保活探测                    |
| `PONG`                | `0x21` | 双向 | 保活应答                    |

---

## 包头标志

### `HeaderFlags(IntFlag)`

| 成员           | 位掩码 | 说明             |
| -------------- | ------ | ---------------- |
| `NONE`         | `0x00` | 无标志           |
| `ACK_REQUIRED` | `0x01` | 接收方须显式确认 |
| `CAN_DROP`     | `0x02` | 允许在背压下丢弃 |
| `STALE`        | `0x04` | 数据已过期       |
| `EOS`          | `0x08` | 流结束标记       |
| `RETRANSMIT`   | `0x10` | 重传包           |
| `KEYFRAME`     | `0x20` | 关键帧           |

---

## 帧分类

### `FrameClass(IntEnum)`

| 成员          | 值  | 说明                           |
| ------------- | --- | ------------------------------ |
| `KEYFRAME`    | `0` | 完整关键帧，不依赖任何先前帧   |
| `DELTA`       | `1` | 增量帧，依赖前一关键帧         |
| `RETRANSMIT`  | `2` | 重传帧                         |
| `DISCARDABLE` | `3` | 可丢弃帧，服务端高负载时可跳过 |

---

## 错误码

### `ErrorCode(IntEnum)`

| 成员                     | 值       | 说明                     |
| ------------------------ | -------- | ------------------------ |
| `UNSUPPORTED_VERSION`    | `0x0001` | 不支持请求的协议版本     |
| `AUTH_FAILED`            | `0x0002` | 认证失败                 |
| `INVALID_STATE`          | `0x0003` | 当前状态不允许该操作     |
| `MALFORMED_HEADER`       | `0x0004` | 包头格式错误             |
| `MALFORMED_BODY`         | `0x0005` | 包体格式错误             |
| `UNSUPPORTED_CAPABILITY` | `0x0006` | 客户端请求的能力不被支持 |
| `LIMIT_EXCEEDED`         | `0x0007` | 超出配置限制             |
| `FRAME_EXPIRED`          | `0x0008` | 帧已过期（超出延迟预算） |
| `FRAME_CANCELLED`        | `0x0009` | 帧已被客户端取消         |
| `CACHE_MISS`             | `0x000A` | 请求的缓存对象不存在     |
| `SERVER_BUSY`            | `0x000B` | 服务端暂时无法处理       |
| `INTERNAL_ERROR`         | `0x000C` | 服务端内部错误           |

---

## 错误作用域

### `ErrorScope(IntEnum)`

| 成员         | 值  | 说明                       |
| ------------ | --- | -------------------------- |
| `CONNECTION` | `0` | 连接级错误（致命，需重连） |
| `SESSION`    | `1` | 会话级错误                 |
| `FRAME`      | `2` | 帧级错误（可恢复）         |

---

## 传输与连接

### `TransportId(IntEnum)`

| 成员          | 值  | 说明                 |
| ------------- | --- | -------------------- |
| `UNSPECIFIED` | `0` | 未指定，由服务端选择 |
| `QUIC`        | `1` | QUIC 传输            |
| `TCP`         | `2` | TCP 传输             |

### `TransportPolicy(IntEnum)`

| 成员          | 值  | 说明             |
| ------------- | --- | ---------------- |
| `AUTO`        | `0` | 无要求，自动选择 |
| `PREFER_QUIC` | `1` | 优先使用 QUIC    |
| `PREFER_TCP`  | `2` | 优先使用 TCP     |
| `FORCE_QUIC`  | `3` | 强制使用 QUIC    |
| `FORCE_TCP`   | `4` | 强制使用 TCP     |

### `LossTolerance(IntEnum)`

| 成员              | 值  | 说明                     |
| ----------------- | --- | ------------------------ |
| `STRICT`          | `0` | 不允许丢包               |
| `BEST_EFFORT`     | `1` | 尽力而为                 |
| `LOW_LATENCY`     | `2` | 低延迟优先，允许少量丢包 |
| `FIRE_AND_FORGET` | `3` | 高丢包容忍               |

### `ControlExtensionFlags(IntFlag)`

| 成员       | 位掩码   | 说明                             |
| ---------- | -------- | -------------------------------- |
| `NONE`     | `0x0000` | 无标志                           |
| `CRITICAL` | `0x0001` | 关键扩展，接收方不识别则必须拒绝 |

---

## 载荷类型

### `PayloadKind(IntFlag)`

| 成员               | 位掩码 | 说明                        |
| ------------------ | ------ | --------------------------- |
| `NONE`             | `0x00` | 无                          |
| `TENSOR`           | `0x01` | Tensor 载荷（神经渲染推理） |
| `TOKEN_CHUNK`      | `0x02` | Token 流块（大模型生成）    |
| `AUDIO_CHUNK`      | `0x04` | 音频块                      |
| `VIDEO_CHUNK`      | `0x08` | 视频块                      |
| `STRUCTURED_EVENT` | `0x10` | 结构化事件                  |
| `TOOL_DELTA`       | `0x20` | Tool 调用增量               |
| `OPAQUE_BYTES`     | `0x40` | 不透明二进制                |

---

## 数据面枚举

### `InputProfile(IntEnum)`

| 成员                 | 值  | 说明                     |
| -------------------- | --- | ------------------------ |
| `UNSPECIFIED`        | `0` | 未指定                   |
| `CHANGED_TILES_LUMA` | `1` | 仅包含变化瓦片的亮度数据 |
| `DENSE_LUMA_FRAME`   | `2` | 完整帧亮度数据           |

### `TileIndexMode(IntEnum)`

| 成员          | 值  | 说明             |
| ------------- | --- | ---------------- |
| `DENSE_RANGE` | `0` | 密集连续区间     |
| `RAW_U16`     | `1` | 原始 uint16 列表 |
| `DELTA_U16`   | `2` | 增量编码 uint16  |
| `BITSET`      | `3` | 位图编码         |

### `TensorDType(IntEnum)`

| 成员       | 值  | 说明             |
| ---------- | --- | ---------------- |
| `FP16`     | `0` | 半精度浮点       |
| `FP32`     | `1` | 单精度浮点       |
| `FP8_E4M3` | `2` | FP8 E4M3         |
| `FP8_E5M2` | `3` | FP8 E5M2         |
| `INT8`     | `4` | 有符号 8 位整数  |
| `UINT8`    | `5` | 无符号 8 位整数  |
| `INT16`    | `6` | 有符号 16 位整数 |
| `UINT16`   | `7` | 无符号 16 位整数 |

### `TensorLayout(IntEnum)`

| 成员   | 值  | 说明                       |
| ------ | --- | -------------------------- |
| `NHWC` | `0` | Batch-Height-Width-Channel |
| `NCHW` | `1` | Batch-Channel-Height-Width |

### `ScalePolicy(IntEnum)`

| 成员         | 值  | 说明             |
| ------------ | --- | ---------------- |
| `NONE`       | `0` | 无量化缩放       |
| `LINEAR`     | `1` | 线性缩放         |
| `ZERO_POINT` | `2` | 带零点的线性缩放 |

### `SubmitMode(IntEnum)`

| 成员        | 值  | 说明                     |
| ----------- | --- | ------------------------ |
| `INLINE`    | `0` | 所有对象内联在包体中     |
| `REFERENCE` | `1` | 通过缓存键引用已存储对象 |
| `MIXED`     | `2` | 内联与引用混合           |

### `BudgetPolicy(IntFlag)`

| 成员                | 位掩码 | 说明                 |
| ------------------- | ------ | -------------------- |
| `NONE`              | `0x00` | 严格模式，不允许降质 |
| `ALLOW_PARTIAL`     | `0x01` | 允许部分结果         |
| `ALLOW_STALE_REUSE` | `0x02` | 允许重用过期缓存结果 |
| `ALLOW_DEGRADED`    | `0x04` | 允许降质结果         |
| `ALLOW_DROP`        | `0x08` | 允许直接丢弃         |

### `ResultClass(IntEnum)`

| 成员          | 值  | 说明                     |
| ------------- | --- | ------------------------ |
| `COMPLETE`    | `0` | 完整结果                 |
| `PARTIAL`     | `1` | 部分结果（缺少部分瓦片） |
| `STALE_REUSE` | `2` | 服务端重用了旧缓存结果   |
| `DEGRADED`    | `3` | 质量降级结果             |

### `ResultFlags(IntFlag)`

| 成员       | 位掩码   | 说明                     |
| ---------- | -------- | ------------------------ |
| `NONE`     | `0x0000` | 无标志                   |
| `STALE`    | `0x0001` | 结果来自缓存/过期数据    |
| `FALLBACK` | `0x0002` | 使用了降级 fallback 路径 |
| `PARTIAL`  | `0x0004` | 结果不完整               |

### `SectionFlags(IntFlag)`

| 成员           | 位掩码   | 说明                   |
| -------------- | -------- | ---------------------- |
| `NONE`         | `0x0000` | 无标志                 |
| `MIXED_CODEC`  | `0x0001` | 各瓦片使用不同编解码器 |
| `FIXED_STRIDE` | `0x0002` | 固定步长布局           |

---

## 缓存枚举

### `CacheObjectKind(IntEnum)`

| 成员                      | 值       | 说明                                       |
| ------------------------- | -------- | ------------------------------------------ |
| `CAMERA_BLOCK`            | `0x0001` | 相机参数块                                 |
| `TILE_INDEX_BLOCK`        | `0x0002` | 瓦片索引块（别名 `TILE_INDEX_TEMPLATE`）   |
| `TENSOR_SECTION_TABLE`    | `0x0003` | Tensor 分区表                              |
| `CODEC_TABLE`             | `0x0004` | 编解码辅助表（别名 `CODEC_AUX_BLOCK`）     |
| `REUSABLE_RESULT_OBJECT`  | `0x0005` | 可复用结果对象（别名 `FALLBACK_RESOURCE`） |
| `PAYLOAD_LAYOUT_TEMPLATE` | `0x0006` | 载荷布局模板                               |
| `PROMPT_SEGMENT`          | `0x0007` | Prompt 段（大模型场景）                    |
| `TOOL_SCHEMA`             | `0x0008` | Tool Schema                                |
| `STRUCTURED_EVENT_SCHEMA` | `0x0009` | 结构化事件 Schema                          |

### `CacheAckStatus(IntEnum)`

| 成员       | 值  | 说明                       |
| ---------- | --- | -------------------------- |
| `ACCEPTED` | `0` | 存储成功                   |
| `REJECTED` | `1` | 拒绝（容量不足或策略拒绝） |
| `REPLACED` | `2` | 替换了已存在的旧条目       |

### `CacheInvalidateScope(IntEnum)`

| 成员            | 值  | 说明                               |
| --------------- | --- | ---------------------------------- |
| `WHOLE_SESSION` | `0` | 清空整个会话缓存（别名 `SESSION`） |
| `NAMESPACE`     | `1` | 按命名空间清除                     |
| `OBJECT_KIND`   | `2` | 按对象类型清除                     |
| `OBJECT_KEY`    | `3` | 清除特定条目（别名 `ENTRY`）       |

### `CachePutFlags(IntFlag)`

| 成员       | 位掩码 | 说明                    |
| ---------- | ------ | ----------------------- |
| `NONE`     | `0x00` | 默认                    |
| `PINNED`   | `0x01` | 固定缓存，不被 LRU 驱逐 |
| `REUSABLE` | `0x02` | 可跨帧复用              |

---

## 会话补丁枚举

### `SessionPatchField(IntFlag)`

| 成员                    | 位掩码 | 说明                                    |
| ----------------------- | ------ | --------------------------------------- |
| `NONE`                  | `0x00` | 无字段                                  |
| `TARGET_CADENCE`        | `0x01` | 目标帧率（别名 `TARGET_FPS`）           |
| `QUALITY_TIER`          | `0x02` | 质量档位                                |
| `DEGRADE_POLICY`        | `0x04` | 降质策略                                |
| `ACTIVE_LANE_MASK`      | `0x08` | 活跃视角掩码（别名 `ACTIVE_VIEW_MASK`） |
| `PREFERRED_CODEC`       | `0x10` | 首选编解码器                            |
| `PREFERRED_COMPRESSION` | `0x20` | 首选压缩方式                            |
| `PROFILE_PATCH`         | `0x40` | 完整 Profile 更新                       |

### `SessionPatchAckStatus(IntEnum)`

| 成员                | 值  | 说明           |
| ------------------- | --- | -------------- |
| `ACCEPTED`          | `0` | 全部字段已应用 |
| `PARTIALLY_APPLIED` | `1` | 部分字段已应用 |
| `REJECTED`          | `2` | 完全拒绝       |

### `SessionPatchRejectReason(IntEnum)`

| 成员                   | 值  | 说明                                     |
| ---------------------- | --- | ---------------------------------------- |
| `NONE`                 | `0` | 无                                       |
| `UNSUPPORTED_FIELD`    | `1` | 不支持的字段                             |
| `INVALID_RANGE`        | `2` | 值超出允许范围                           |
| `UNSUPPORTED_STRATEGY` | `3` | 不支持的策略                             |
| `INVALID_LANE_MASK`    | `4` | 非法视角掩码（别名 `INVALID_VIEW_MASK`） |
| `RATE_LIMITED`         | `5` | 补丁频率受限                             |

---

## 流控枚举

### `FlowUpdateScopeKind(IntEnum)`

| 成员         | 值  | 说明     |
| ------------ | --- | -------- |
| `CONNECTION` | `0` | 连接级别 |
| `SESSION`    | `1` | 会话级别 |
| `OPERATION`  | `2` | 操作级别 |

### `FlowUpdateReason(IntEnum)`

| 成员         | 值  | 说明         |
| ------------ | --- | ------------ |
| `GRANT`      | `0` | 授予更多配额 |
| `REDUCE`     | `1` | 降低配额     |
| `PAUSE`      | `2` | 暂停         |
| `RESUME`     | `3` | 恢复         |
| `CONGESTION` | `4` | 拥塞通知     |

### `FlowUpdateBackpressureLevel(IntEnum)`

| 成员   | 值  | 说明               |
| ------ | --- | ------------------ |
| `NONE` | `0` | 无背压             |
| `SOFT` | `1` | 软背压（建议降速） |
| `HARD` | `2` | 硬背压（必须降速） |

### `FlowUpdateFlags(IntFlag)`

| 成员                   | 位掩码 | 说明                      |
| ---------------------- | ------ | ------------------------- |
| `NONE`                 | `0x00` | 无                        |
| `CREDIT_VALID`         | `0x01` | credit 字段有效           |
| `RETRY_AFTER_VALID`    | `0x02` | `retry_after_ms` 字段有效 |
| `BACKGROUND_ONLY`      | `0x04` | 仅影响后台低优先级操作    |
| `DRAIN_IN_FLIGHT_ONLY` | `0x08` | 仅排空在途操作后生效      |

---

## 结果提示枚举

### `ResultHintBudgetPolicy(IntEnum)`

| 成员          | 值  | 说明               |
| ------------- | --- | ------------------ |
| `NONE`        | `0` | 无建议             |
| `FULL`        | `1` | 建议使用全额预算   |
| `PARTIAL`     | `2` | 建议接受部分结果   |
| `STALE_REUSE` | `3` | 建议接受缓存重用   |
| `DROP`        | `4` | 建议客户端直接丢弃 |

### `ResultHintCongestionState(IntEnum)`

| 成员        | 值  | 说明     |
| ----------- | --- | -------- |
| `NONE`      | `0` | 无拥塞   |
| `STEADY`    | `1` | 稳定态   |
| `ELEVATED`  | `2` | 轻度拥塞 |
| `SATURATED` | `3` | 严重饱和 |

### `ResultHintReason(IntEnum)`

| 成员              | 值  | 说明           |
| ----------------- | --- | -------------- |
| `NONE`            | `0` | 无             |
| `QUEUE_FULL`      | `1` | 队列满         |
| `SERVER_BUSY`     | `2` | 服务端繁忙     |
| `BUDGET_EXCEEDED` | `3` | 预算超出       |
| `SUPERSEDED`      | `4` | 被后续提交取代 |

---

## 扩展类型常量

```python
# 控制扩展块类型 ID（uint16）
CLIENT_HELLO_TRANSPORT_POLICY_EXTENSION     = 0x0101
SERVER_HELLO_ACK_TRANSPORT_POLICY_EXTENSION = 0x0102
CLIENT_HELLO_LOSS_TOLERANCE_EXTENSION       = 0x0103
SERVER_HELLO_ACK_LOSS_TOLERANCE_EXTENSION   = 0x0104
CLIENT_HELLO_PAYLOAD_CAPABILITIES_EXTENSION = 0x0105
SERVER_HELLO_ACK_PAYLOAD_CAPABILITIES_EXTENSION = 0x0106
```

---

## 使用场景指南

### 场景一：建立连接与协商传输

**相关枚举**：`TransportId`、`TransportPolicy`、`LossTolerance`、`WireFormat`

握手时客户端在 `CLIENT_HELLO` 里声明传输偏好，服务端在 `SERVER_HELLO_ACK` 里确认。

```python
from nnrp import TransportId, TransportPolicy, LossTolerance
from nnrp.client import ClientProfile, connect_client_control

# 希望优先 QUIC，容忍少量丢包，降级到 TCP 也可以
profile = ClientProfile(
    transport_policy=TransportPolicy.PREFER_QUIC,
    loss_tolerance=LossTolerance.LOW_LATENCY,
)
async with connect_client_control(
    "render.example.com",
    quic_port=4433,
    quic_configuration=quic_cfg,
    client_profile=profile,
    selected_transport_id=TransportId.QUIC,
) as bootstrap:
    session = bootstrap.session
```

::: warning 常见坑点

- **`FORCE_QUIC` 在 TCP-only 防火墙下直接握手失败**，生产环境建议用 `PREFER_QUIC` 而非
  `FORCE_QUIC`。
- **`LossTolerance.FIRE_AND_FORGET` 不保证顺序**，适合遥测/统计场景，切勿用于帧提交主路径。
- `WireFormat.CURRENT` 是目前唯一合法值，不要硬编码数字
  `0`，以便未来升级时编译器能帮你找到所有调用点。 :::

---

### 场景二：提交帧数据

**相关枚举**：`InputProfile`、`SubmitMode`、`BudgetPolicy`、`PayloadKind`、`TileIndexMode`

```python
from nnrp import InputProfile, SubmitMode, BudgetPolicy, PayloadKind, TileIndexMode
from nnrp.client import SubmitRequest, TensorSectionData

# 只发送变化瓦片（增量帧），引用缓存中的重用对象
request = SubmitRequest(
    frame_id=42,
    tile_ids=(3, 7, 12),                          # 只有这三个瓦片有变化
    sections=(TensorSectionData(...),),
    input_profile=InputProfile.CHANGED_TILES_LUMA,
    submit_mode=SubmitMode.MIXED,                 # 部分内联，部分引用缓存
    budget_policy=BudgetPolicy.ALLOW_PARTIAL | BudgetPolicy.ALLOW_STALE_REUSE,
    inference_budget_ms=8,
    tile_index_mode=TileIndexMode.RAW_U16,
)
await session.submit_frame(request)
```

::: warning 常见坑点

- **`BudgetPolicy` 是位掩码（`IntFlag`）**，多个策略用 `|`
  组合，不是用逗号分隔的列表。`BudgetPolicy.NONE` 是严格模式，服务端任何降质行为都会返回
  `ResultClass.DEGRADED` 并触发错误。
- **`SubmitMode.REFERENCE` 要求提前调用 `session.put_cache()`**，否则服务端会返回
  `ErrorCode.CACHE_MISS`。
- `tile_ids` 为空元组时，`TileIndexMode` 的值无效，服务端会忽略瓦片索引字段。 :::

---

### 场景三：处理帧结果

**相关枚举**：`ResultClass`、`ResultFlags`

```python
from nnrp import ResultClass, ResultFlags

result = await session.receive_result(frame_id=42, timeout=0.05)

match result.metadata.result_class:
    case ResultClass.COMPLETE:
        apply_full_result(result)
    case ResultClass.PARTIAL:
        # 只有部分瓦片完成，result_flags 中会有 PARTIAL 位
        apply_partial_result(result)
    case ResultClass.STALE_REUSE:
        # 服务端重用了上一帧缓存——视频渲染时可直接复用上帧
        pass
    case ResultClass.DEGRADED:
        # 质量降级，检查 applied_budget_policy 了解实际使用的策略
        log_degraded(result.metadata.applied_budget_policy)

# 检查附加标志
if result.metadata.result_flags & ResultFlags.FALLBACK:
    metrics.increment("degraded_fallback")
```

::: warning 常见坑点

- **不要只检查 `COMPLETE` 然后对其他情况报错**；`STALE_REUSE` 和 `DEGRADED`
  在高负载下是正常现象，应在业务层决定是否接受。
- `ResultFlags.STALE` 与 `ResultClass.STALE_REUSE`
  含义重叠但粒度不同：前者是位标志（可与其他标志共存），后者是主类别，业务逻辑优先判断
  `result_class`。 :::

---

### 场景四：错误处理

**相关枚举**：`ErrorCode`、`ErrorScope`

```python
from nnrp import ErrorCode
from nnrp.core.enums import ErrorScope
from nnrp.errors import NnrpProtocolError

try:
    await session.submit_frame(request)
except NnrpProtocolError as e:
    match e.error_code:
        case ErrorCode.FRAME_EXPIRED:
            # 帧已过期，跳过本帧，继续下一帧
            pass
        case ErrorCode.SERVER_BUSY:
            # 服务端繁忙，等待后重试（见 ResultHint 背压信号）
            await asyncio.sleep(0.05)
        case ErrorCode.AUTH_FAILED:
            # 认证失败，不可重试，重建连接
            raise

    if e.error_scope == ErrorScope.CONNECTION:
        # 连接级错误是致命的，必须重新建立连接
        await session.close()
        async with connect_client_control(...) as bootstrap:
            session = bootstrap.session
    elif e.error_scope == ErrorScope.FRAME:
        # 帧级错误可恢复，只需跳过当前帧
        pass
```

::: warning 常见坑点

- **`ErrorScope.CONNECTION` 错误不可在同一 Session
  上重试**，必须重新握手。不少开发者在连接级错误后仍向旧 session 发送数据，导致死锁。
- `ErrorCode.LIMIT_EXCEEDED` 可能是每秒补丁频率受限（见
  `SessionPatchRejectReason.RATE_LIMITED`），不一定是硬件资源耗尽。 :::

---

### 场景五：缓存操作

**相关枚举**：`CacheObjectKind`、`CachePutFlags`、`CacheAckStatus`、`CacheInvalidateScope`

```python
from nnrp import CacheObjectKind, CachePutFlags, CacheAckStatus, CacheInvalidateScope

# 存储一个可复用的 Tensor 分区表，并固定不被 LRU 驱逐
ack = await session.put_cache(
    kind=CacheObjectKind.TENSOR_SECTION_TABLE,
    key=b"tst-v1",
    data=serialized_tensor_section_table,
    flags=CachePutFlags.PINNED | CachePutFlags.REUSABLE,
)

match ack.status:
    case CacheAckStatus.ACCEPTED:
        pass  # 正常存储
    case CacheAckStatus.REPLACED:
        log.warning("key %s already existed, replaced", ack.key)
    case CacheAckStatus.REJECTED:
        # 容量不足或策略拒绝，降级为 INLINE 提交
        use_inline_submit = True

# 会话结束前或模型切换时清除特定类型的缓存
await session.invalidate_cache(
    scope=CacheInvalidateScope.OBJECT_KIND,
    kind=CacheObjectKind.TENSOR_SECTION_TABLE,
)
```

::: warning 常见坑点

- **`CachePutFlags.PINNED` 不受 LRU 驱逐，但仍受服务端总缓存配额限制**，大量 PINNED 对象可能导致后续
  CACHE_PUT 全部被 REJECTED。
- `CacheObjectKind.TILE_INDEX_BLOCK` 有别名
  `TILE_INDEX_TEMPLATE`，两者值相同；代码里统一用一个，避免混用产生混乱。
- 用 `CacheInvalidateScope.WHOLE_SESSION`
  会清空整个会话的所有缓存对象，慎用，通常只在会话重置时才需要这个粒度。 :::

---

### 场景六：流控与背压

**相关枚举**：`FlowUpdateScopeKind`、`FlowUpdateReason`、`FlowUpdateBackpressureLevel`、`FlowUpdateFlags`、`ResultHintBudgetPolicy`、`ResultHintCongestionState`、`ResultHintReason`

```python
from nnrp import (
    FlowUpdateReason, FlowUpdateBackpressureLevel,
    ResultHintCongestionState, ResultHintBudgetPolicy,
)

# 服务端推送 RESULT_HINT，客户端据此调整发送速率
async def handle_result_hints(session):
    async for hint in session.result_hints():
        if hint.congestion_state == ResultHintCongestionState.SATURATED:
            # 严重饱和：立即停止提交，等待明确的 FLOW_UPDATE RESUME
            await session.pause_submit()
        elif hint.congestion_state == ResultHintCongestionState.ELEVATED:
            # 轻度拥塞：降低提交频率
            frame_interval_ms = frame_interval_ms * 1.5

        if hint.budget_policy == ResultHintBudgetPolicy.DROP:
            # 服务端建议客户端直接丢弃下一帧提交
            skip_next_frame = True

# 服务端推送 FLOW_UPDATE 时的处理
async def handle_flow_update(update):
    match update.reason:
        case FlowUpdateReason.PAUSE:
            await session.pause_submit()
        case FlowUpdateReason.RESUME:
            await session.resume_submit()
        case FlowUpdateReason.CONGESTION:
            if update.backpressure == FlowUpdateBackpressureLevel.HARD:
                # 硬背压：必须立即停止
                await session.pause_submit()
```

::: warning 常见坑点

- **`ResultHint` 是建议，不是命令**，但忽略 `SATURATED` 状态持续提交会导致服务端队列溢出，最终触发
  `RESULT_DROP`（服务端直接丢帧）。
- `FlowUpdateFlags.CREDIT_VALID` 标志未置位时，`credit` 字段值无意义，不要直接用于速率计算。
- `FlowUpdateFlags.RETRY_AFTER_VALID` 置位时，`retry_after_ms` 才有效；不检查此标志直接用
  `retry_after_ms` 可能读到默认零值，导致客户端立即重试（等于无退避）。 :::

---

### 场景七：会话动态调整

**相关枚举**：`SessionPatchField`、`SessionPatchAckStatus`、`SessionPatchRejectReason`

```python
from nnrp import SessionPatchField, SessionPatchAckStatus, SessionPatchRejectReason

# 在会话进行中动态调整目标帧率和质量档位
ack = await session.patch(
    fields=SessionPatchField.TARGET_CADENCE | SessionPatchField.QUALITY_TIER,
    target_cadence=30,   # 从 60fps 降为 30fps（省电模式）
    quality_tier=1,
)

match ack.status:
    case SessionPatchAckStatus.ACCEPTED:
        pass
    case SessionPatchAckStatus.PARTIALLY_APPLIED:
        # 部分字段被接受，检查哪些字段被拒绝
        for rejected_field, reason in ack.rejected_fields.items():
            if reason == SessionPatchRejectReason.RATE_LIMITED:
                # 补丁频率受限，稍后重试
                await asyncio.sleep(1.0)
            elif reason == SessionPatchRejectReason.INVALID_RANGE:
                log.error("Invalid value for field %s", rejected_field)
    case SessionPatchAckStatus.REJECTED:
        log.warning("Patch fully rejected: %s", ack.reject_reason)
```

::: warning 常见坑点

- **`SessionPatchField` 是位掩码（`IntFlag`）**，同时请求多个字段时必须用 `|`
  组合，不要多次发送单字段补丁（每次都计入频率限制）。
- 服务端对 `SESSION_PATCH` 有频率限制（默认每秒若干次），高频补丁（如每帧都 patch）会触发
  `RATE_LIMITED`，应在客户端合批。
- `SessionPatchAckStatus.PARTIALLY_APPLIED`
  时，**已被接受的字段不会回滚**，需要在客户端自行记录哪些字段当前生效，以便下次补丁时构造正确的
  diff。 :::
