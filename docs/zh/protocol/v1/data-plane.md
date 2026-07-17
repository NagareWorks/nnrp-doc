---
prev:
  text: 会话与操作模型
  link: /zh/protocol/v1/operation-model/
next:
  text: 传输策略与探测
  link: /zh/protocol/v1/transport-strategy/
---

# 数据面与 Operation 标识

`FRAME_SUBMIT` 创建一个 operation。Operation 标识与 frame 标识相互关联，但不能混为一谈：

- `operation_id: u64` 是稳定的生命周期标识，供取消、调度、进度、部分结果、路由提示、对象引用、
  trace 关联与丢弃原因使用。
- `header.frame_id: u32` 是有序的数据面工作单元标识，供 submit、终结结果、重放与 frame-oriented
  profile 数据关联使用。

实现必须在 operation 的完整生命周期内保存这一对标识。禁止从本地 handle 推导 `operation_id`，禁止把它
截断为 `frame_id`，也禁止静默令两者相等。SDK/FFI 的 opaque handle 只在进程内有效，永远不是 wire identity。

## `FRAME_SUBMIT` Metadata

Preview4 将 fixed metadata 冻结为 72 字节：

| Offset | 字段 | 类型 | 规则 |
|---:|---|---|---|
| 0 | `src_width` | `u16` | Tensor 字段；非 tensor payload 必须为零。 |
| 2 | `src_height` | `u16` | Tensor 字段；非 tensor payload 必须为零。 |
| 4 | `tile_width` | `u16` | Tensor 字段。 |
| 6 | `tile_height` | `u16` | Tensor 字段。 |
| 8 | `tile_count` | `u16` | Tensor 字段。 |
| 10 | `section_count` | `u16` | 声明的 tensor section 数。 |
| 12 | `frame_class` | `u8` | Profile 定义的 frame class。 |
| 13 | `input_profile` | `u8` | 标准 input profile 注册值。 |
| 14 | `tile_index_mode` | `u8` | Tile index 编码。 |
| 15 | `reserved0` | `u8` | 必须为零。 |
| 16 | `latency_budget_ms` | `u16` | Submit latency budget。 |
| 18 | `target_fps_x100` | `u16` | 可选 frame-rate target。 |
| 20 | `retry_of_frame` | `u32` | 旧 frame identity；无则为零。 |
| 24 | `tile_base_id` | `u32` | 首个 tile identity。 |
| 28 | `camera_bytes` | `u32` | Camera block 声明长度。 |
| 32 | `tile_index_bytes` | `u32` | Tile-index block 声明长度。 |
| 36 | `reserved1` | `u32` | 必须为零。 |
| 40 | `operation_id` | `u64` | 本次 submit 的非零生命周期标识。 |
| 48 | `reserved2` | `u32` | 必须为零。 |
| 52 | `submit_mode` | `u8` | `inline`、`reference` 或 `mixed`。 |
| 53 | `budget_policy` | `u8` | 已冻结的 budget-policy bitmask。 |
| 54 | `loss_tolerance_policy` | `u8` | Frame policy，或以 `0xff` 表示继承。 |
| 55 | `reserved3` | `u8` | 必须为零。 |
| 56 | `object_ref_mask` | `u32` | 标准 referenced-object slots。 |
| 60 | `dependency_frame_id` | `u32` | 依赖 frame；无则为零。 |
| 64 | `payload_kind_bitmap` | `u32` | 声明的 payload families。 |
| 68 | `payload_frame_count` | `u16` | Typed payload frame 数。 |
| 70 | `reserved4` | `u16` | 必须为零。 |

`tile_index_bytes` 固定占用 `32..35`；`36..39` 是 reserved，不得与 tile-index 长度重叠。
`operation_id` 固定占用 `40..47`，每个合法的 Preview4 `FRAME_SUBMIT` 都必须携带它。

## 运行时关联

1. Client 在编码 submit 前分配两个标识。
2. Server 接受 submit 时记录两个标识，并将它们绑定到本地 operation handle。
3. Partial result 与 operation-scope control frame 在 fixed metadata 中使用 `operation_id`。
4. 每个 operation-scope 消息必须在 `header.frame_id` 中携带其 metadata `operation_id` 已绑定的
   frame 标识；接收端必须拒绝未知 operation 或不匹配的标识对。
5. `RESULT_PUSH` 与 `RESULT_DROP` 继续使用 `header.frame_id` 关联。
6. 只有对应 terminal event 已交付或持久记录后，才释放 operation 生命周期状态。
