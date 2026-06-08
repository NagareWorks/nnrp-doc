# 运行时控制 Profiles

运行时控制 profiles 是 NNRP 的标准
profile。它们定义取消、优先级、deadline、部分结果、背压、缓存引用、路由提示和 trace context
等小型控制帧，让宿主不需要再把这些信号包进 JSON 或另一个应用层协议里。

这些 profile 和 `tensor`、`token` 一样属于标准 profile 注册表。实现不得把它们当成私有扩展名字。

## Profile 注册表

| `profile_id` | Profile               | 范围                                                                             |
| ------------ | --------------------- | -------------------------------------------------------------------------------- |
| `0x0100`     | `runtime.control`     | Operation 控制帧、调度更新、压力信号、路由提示、trace context 与 drop reason。   |
| `0x0101`     | `runtime.object`      | 运行时对象声明、对象引用、对象 delta、释放语义、成本元数据与所有权元数据。       |
| `0x0102`     | `cache.reference`     | 缓存引用、缓存未命中、失效、lease anchor、复用范围与 miss 诊断。                 |
| `0x0103`     | `coding.agent`        | Subagent 调度提示、工具 artifact 路由、任务取消与执行偏好。                      |
| `0x0104`     | `multimodal.artifact` | 图像、音频、视频、文档和工具 artifact 的类型化描述与部分结果流。                 |
| `0x0105`     | `render.runtime`      | 帧 deadline、局部区域结果、supersession、渲染阶段 trace context 与 drop reason。 |

## 帧类型注册表

Preview4 控制帧和对象帧扩展 NNRP/1 message type 注册表。公共头仍然是 40
字节；下列每个帧定义自己的固定 metadata 布局。

| 编号   | 帧                       | 方向             | Profile           | 固定 metadata                                               |
| ------ | ------------------------ | ---------------- | ----------------- | ----------------------------------------------------------- |
| `0x30` | `CANCEL`                 | C -> S 或 S -> C | `runtime.control` | [`Control Request Metadata`](#control-request-metadata)     |
| `0x31` | `ABORT`                  | C -> S 或 S -> C | `runtime.control` | [`Control Request Metadata`](#control-request-metadata)     |
| `0x32` | `PRIORITY_UPDATE`        | C -> S 或 S -> C | `runtime.control` | [`Scheduling Metadata`](#scheduling-metadata)               |
| `0x33` | `DEADLINE`               | C -> S 或 S -> C | `runtime.control` | [`Scheduling Metadata`](#scheduling-metadata)               |
| `0x34` | `EXPIRE_AT`              | C -> S 或 S -> C | `runtime.control` | [`Scheduling Metadata`](#scheduling-metadata)               |
| `0x35` | `SUPERSEDE`              | C -> S 或 S -> C | `runtime.control` | [`Supersede Metadata`](#supersede-metadata)                 |
| `0x36` | `BUDGET_UPDATE`          | C -> S 或 S -> C | `runtime.control` | [`Budget Metadata`](#budget-metadata)                       |
| `0x37` | `PROGRESS`               | S -> C 或 C -> S | `runtime.control` | [`Progress Metadata`](#progress-metadata)                   |
| `0x38` | `PARTIAL_RESULT`         | S -> C 或 C -> S | `runtime.control` | [`Partial Result Metadata`](#partial-result-metadata)       |
| `0x39` | `BACKPRESSURE`           | C -> S 或 S -> C | `runtime.control` | [`Pressure Metadata`](#pressure-metadata)                   |
| `0x3A` | `CREDIT_UPDATE`          | C -> S 或 S -> C | `runtime.control` | [`Pressure Metadata`](#pressure-metadata)                   |
| `0x3B` | `CAPABILITY_NEGOTIATION` | C -> S 或 S -> C | `runtime.control` | [`Capability Metadata`](#capability-metadata)               |
| `0x3C` | `DEGRADE_PROFILE`        | C -> S 或 S -> C | `runtime.control` | [`Capability Metadata`](#capability-metadata)               |
| `0x3D` | `ROUTE_HINT`             | C -> S 或 S -> C | `runtime.control` | [`Route Hint Metadata`](#route-hint-metadata)               |
| `0x3E` | `EXECUTION_HINT`         | C -> S 或 S -> C | `runtime.control` | [`Route Hint Metadata`](#route-hint-metadata)               |
| `0x3F` | `TRACE_CONTEXT`          | C -> S 或 S -> C | `runtime.control` | [`Trace Context Metadata`](#trace-context-metadata)         |
| `0x40` | `RESULT_DROP_REASON`     | C -> S 或 S -> C | `runtime.control` | [`Result Drop Metadata`](#result-drop-metadata)             |
| `0x41` | `OBJECT_DECLARE`         | C -> S 或 S -> C | `runtime.object`  | [`Object Descriptor Metadata`](#object-descriptor-metadata) |
| `0x42` | `OBJECT_REF`             | C -> S 或 S -> C | `runtime.object`  | [`Object Reference Metadata`](#object-reference-metadata)   |
| `0x43` | `OBJECT_RELEASE`         | C -> S 或 S -> C | `runtime.object`  | [`Object Release Metadata`](#object-release-metadata)       |
| `0x44` | `OBJECT_PATCH`           | C -> S 或 S -> C | `runtime.object`  | [`Object Delta Metadata`](#object-delta-metadata)           |
| `0x45` | `OBJECT_DELTA`           | C -> S 或 S -> C | `runtime.object`  | [`Object Delta Metadata`](#object-delta-metadata)           |
| `0x46` | `CACHE_REFERENCE`        | C -> S 或 S -> C | `cache.reference` | [`Cache Reference Metadata`](#cache-reference-metadata)     |
| `0x47` | `CACHE_MISS`             | C -> S 或 S -> C | `cache.reference` | [`Cache Miss Metadata`](#cache-miss-metadata)               |

`CACHE_INVALIDATE` 保持已有 NNRP/1 message type；当它作为本 profile 的一部分使用时，必须声明
`cache.reference` 能力。

## 能力 token

| 能力 token                     | 帧                                                  |
| ------------------------------ | --------------------------------------------------- |
| `control.cancel_abort`         | `CANCEL`, `ABORT`                                   |
| `control.supersede`            | `SUPERSEDE`                                         |
| `control.priority_update`      | `PRIORITY_UPDATE`                                   |
| `control.deadline_expire`      | `DEADLINE`, `EXPIRE_AT`                             |
| `control.progress_partial`     | `PROGRESS`, `PARTIAL_RESULT`                        |
| `control.credit_backpressure`  | `BACKPRESSURE`, `CREDIT_UPDATE`                     |
| `control.capability_costs`     | `CAPABILITY_NEGOTIATION`, `DEGRADE_PROFILE`         |
| `control.route_execution_hint` | `ROUTE_HINT`, `EXECUTION_HINT`                      |
| `control.trace_context`        | `TRACE_CONTEXT`                                     |
| `control.result_drop_reason`   | `RESULT_DROP_REASON`                                |
| `object.lifecycle`             | `OBJECT_DECLARE`, `OBJECT_REF`, `OBJECT_RELEASE`    |
| `object.delta`                 | `OBJECT_PATCH`, `OBJECT_DELTA`                      |
| `object.cost`                  | 对象描述符成本字段                                  |
| `object.ownership`             | 对象描述符所有权字段                                |
| `cache.reference`              | `CACHE_REFERENCE`, `CACHE_MISS`, `CACHE_INVALIDATE` |

## Control Request Metadata

| Offset | 字段               | 类型  | 必填 | 含义                                          |
| ------ | ------------------ | ----- | ---- | --------------------------------------------- |
| `0`    | `operation_id`     | `u64` | 是   | 目标 operation。`0` 表示 session 级控制。     |
| `8`    | `control_sequence` | `u64` | 是   | 发送方内单调递增序号。                        |
| `16`   | `reason_code`      | `u16` | 是   | 机器可读 cancel 或 abort 原因。               |
| `18`   | `source_role`      | `u8`  | 是   | `client`、`server`、`runtime` 或 `subagent`。 |
| `19`   | `flags`            | `u8`  | 是   | bit `0`：允许协作取消；bit `1`：允许硬中断。  |
| `20`   | `diagnostic_bytes` | `u32` | 否   | 可选诊断 body 长度。                          |
| `24`   | `reserved`         | `u64` | 是   | 必须为零。                                    |

## Scheduling Metadata

| Offset | 字段               | 类型  | 必填                          | 含义                                               |
| ------ | ------------------ | ----- | ----------------------------- | -------------------------------------------------- |
| `0`    | `operation_id`     | `u64` | 是                            | 目标 operation。                                   |
| `8`    | `control_sequence` | `u64` | 是                            | 发送方内单调递增序号。                             |
| `16`   | `priority_class`   | `u16` | `PRIORITY_UPDATE` 必填        | 新优先级。                                         |
| `18`   | `priority_delta`   | `i16` | 否                            | 相对优先级调整。                                   |
| `20`   | `deadline_unix_ms` | `u64` | `DEADLINE` / `EXPIRE_AT` 必填 | 绝对 deadline 或过期时间戳。                       |
| `28`   | `flags`            | `u32` | 是                            | bit `0`：丢弃过期任务；bit `1`：发出 drop reason。 |

## Supersede Metadata

| Offset | 字段               | 类型  | 必填 | 含义                               |
| ------ | ------------------ | ----- | ---- | ---------------------------------- |
| `0`    | `old_operation_id` | `u64` | 是   | 迟到结果可被丢弃的旧 operation。   |
| `8`    | `new_operation_id` | `u64` | 是   | 替代 operation。                   |
| `16`   | `control_sequence` | `u64` | 是   | 发送方内单调递增序号。             |
| `24`   | `drop_reason_code` | `u16` | 是   | 通常为 `superseded`。              |
| `26`   | `flags`            | `u16` | 是   | bit `0`：立即 abort 旧 operation。 |
| `28`   | `diagnostic_bytes` | `u32` | 否   | 可选诊断 body 长度。               |

## Budget Metadata

| Offset | 字段                     | 类型  | 必填 | 含义                                         |
| ------ | ------------------------ | ----- | ---- | -------------------------------------------- |
| `0`    | `operation_id`           | `u64` | 是   | 目标 operation，或 `0` 表示 session 级预算。 |
| `8`    | `compute_budget_units`   | `u64` | 否   | Runtime 定义的计算预算。                     |
| `16`   | `memory_budget_bytes`    | `u64` | 否   | 内存预算。                                   |
| `24`   | `bandwidth_budget_bytes` | `u64` | 否   | 传输预算。                                   |
| `32`   | `token_budget`           | `u32` | 否   | token 预算。                                 |
| `36`   | `flags`                  | `u32` | 是   | bit `0`：替换；bit `1`：增量。               |

## Progress Metadata

| Offset | 字段                | 类型  | 必填 | 含义                            |
| ------ | ------------------- | ----- | ---- | ------------------------------- |
| `0`    | `operation_id`      | `u64` | 是   | 正在报告的 operation。          |
| `8`    | `progress_sequence` | `u64` | 是   | 单调递增进度序号。              |
| `16`   | `stage_code`        | `u16` | 是   | Profile 定义的阶段。            |
| `18`   | `percent_x100`      | `u16` | 否   | `0..10000`；`0xffff` 表示未知。 |
| `20`   | `object_id`         | `u64` | 否   | 该进度事件附带的运行时对象。    |
| `28`   | `body_bytes`        | `u32` | 否   | 可选 progress payload 长度。    |

## Partial Result Metadata

| Offset | 字段              | 类型  | 必填 | 含义                                                  |
| ------ | ----------------- | ----- | ---- | ----------------------------------------------------- |
| `0`    | `operation_id`    | `u64` | 是   | 正在报告的 operation。                                |
| `8`    | `result_sequence` | `u64` | 是   | 单调递增结果序号。                                    |
| `16`   | `object_id`       | `u64` | 否   | 被引用的运行时对象。                                  |
| `24`   | `delta_sequence`  | `u64` | 否   | 对象 delta 序号。                                     |
| `32`   | `body_bytes`      | `u32` | 否   | 内联 body 长度。                                      |
| `36`   | `flags`           | `u32` | 是   | bit `0`：最后一个 partial；bit `1`：存在 object ref。 |

## Pressure Metadata

| Offset | 字段              | 类型  | 必填                 | 含义                                             |
| ------ | ----------------- | ----- | -------------------- | ------------------------------------------------ |
| `0`    | `scope_id`        | `u64` | 是                   | Session 或 operation scope。                     |
| `8`    | `credit_window`   | `u64` | `CREDIT_UPDATE` 必填 | 新发送窗口。                                     |
| `16`   | `pressure_level`  | `u16` | `BACKPRESSURE` 必填  | `none`、`soft` 或 `hard`。                       |
| `18`   | `pressure_reason` | `u16` | 否                   | 机器可读原因。                                   |
| `20`   | `retry_after_ms`  | `u32` | 否                   | 发送方等待时间。                                 |
| `24`   | `flags`           | `u32` | 是                   | bit `0`：作用于连接；bit `1`：作用于 operation。 |
| `28`   | `reserved`        | `u32` | 是                   | 必须为零。                                       |

## Capability Metadata

| Offset | 字段               | 类型  | 必填 | 含义                                   |
| ------ | ------------------ | ----- | ---- | -------------------------------------- |
| `0`    | `profile_id`       | `u16` | 是   | 正在协商的 profile。                   |
| `2`    | `capability_count` | `u16` | 是   | body 中的 capability entry 数量。      |
| `4`    | `cost_model_id`    | `u16` | 否   | body entry 使用的成本模型。            |
| `6`    | `preference_rank`  | `u16` | 否   | 数值越低偏好越高。                     |
| `8`    | `limit_bytes`      | `u64` | 否   | 该 profile 的聚合字节限制。            |
| `16`   | `limit_units`      | `u64` | 否   | 聚合计算或 token 限制。                |
| `24`   | `body_bytes`       | `u32` | 是   | Capability entry body 长度。           |
| `28`   | `flags`            | `u32` | 是   | bit `0`：硬性要求；bit `1`：允许降级。 |

## Route Hint Metadata

| Offset | 字段               | 类型  | 必填 | 含义                                   |
| ------ | ------------------ | ----- | ---- | -------------------------------------- |
| `0`    | `operation_id`     | `u64` | 是   | 被路由的 operation。                   |
| `8`    | `route_id`         | `u32` | 否   | 首选 route。                           |
| `12`   | `executor_class`   | `u16` | 否   | Runtime 定义的 executor 类别。         |
| `14`   | `affinity_class`   | `u16` | 否   | 本地性或 placement hint。              |
| `16`   | `deadline_unix_ms` | `u64` | 否   | 路由级 deadline。                      |
| `24`   | `body_bytes`       | `u32` | 否   | 可选 hint body 长度。                  |
| `28`   | `flags`            | `u32` | 是   | bit `0`：必须遵守；bit `1`：尽力而为。 |

## Trace Context Metadata

| Offset | 字段             | 类型  | 必填 | 含义                             |
| ------ | ---------------- | ----- | ---- | -------------------------------- |
| `0`    | `trace_id`       | `u64` | 是   | Trace ID，尽量与公共头一致。     |
| `8`    | `span_id`        | `u64` | 是   | 当前 span。                      |
| `16`   | `parent_span_id` | `u64` | 否   | 父 span。                        |
| `24`   | `stage_code`     | `u16` | 否   | Profile 定义的阶段。             |
| `26`   | `flags`          | `u16` | 是   | bit `0`：采样；bit `1`：错误。   |
| `28`   | `body_bytes`     | `u32` | 否   | 可选 trace attribute body 长度。 |

## Result Drop Metadata

| Offset | 字段               | 类型  | 必填 | 含义                                                                                                             |
| ------ | ------------------ | ----- | ---- | ---------------------------------------------------------------------------------------------------------------- |
| `0`    | `operation_id`     | `u64` | 是   | 被丢弃的 operation 或 result。                                                                                   |
| `8`    | `result_sequence`  | `u64` | 否   | 被丢弃的 result 序号。                                                                                           |
| `16`   | `drop_reason_code` | `u16` | 是   | `deadline_expired`、`superseded`、`peer_cancelled`、`backpressure`、`capability_mismatch` 或 `budget_exceeded`。 |
| `18`   | `source_role`      | `u8`  | 是   | 决策来源。                                                                                                       |
| `19`   | `flags`            | `u8`  | 是   | bit `0`：最终；bit `1`：可重试。                                                                                 |
| `20`   | `diagnostic_bytes` | `u32` | 否   | 可选诊断 body 长度。                                                                                             |
| `24`   | `reserved`         | `u64` | 是   | 必须为零。                                                                                                       |

## Object Descriptor Metadata

| Offset | 字段                   | 类型  | 必填 | 含义                                                                                       |
| ------ | ---------------------- | ----- | ---- | ------------------------------------------------------------------------------------------ |
| `0`    | `object_id`            | `u64` | 是   | 运行时对象身份。                                                                           |
| `8`    | `object_kind`          | `u16` | 是   | Tensor、token block、image tile、feature map、tool result、trace segment 或 opaque bytes。 |
| `10`   | `producer_role`        | `u8`  | 是   | 生产方角色。                                                                               |
| `11`   | `consumer_role`        | `u8`  | 是   | 目标消费方角色。                                                                           |
| `12`   | `session_id`           | `u32` | 是   | 所属 session。                                                                             |
| `16`   | `byte_size`            | `u64` | 是   | 对象大小。                                                                                 |
| `24`   | `compute_cost_units`   | `u32` | 否   | Runtime 定义的计算成本。                                                                   |
| `28`   | `memory_location_hint` | `u16` | 否   | host memory、device memory、shared memory 或 remote memory。                               |
| `30`   | `ownership_hint`       | `u16` | 是   | producer-owned、consumer-owned、session-owned 或 borrowed。                                |
| `32`   | `lifetime_hint_ms`     | `u32` | 否   | 建议生命周期。                                                                             |
| `36`   | `metadata_bytes`       | `u32` | 否   | 可选对象 metadata body 长度。                                                              |
| `40`   | `reserved`             | `u64` | 是   | 必须为零。                                                                                 |

## Object Reference Metadata

| Offset | 字段             | 类型  | 必填 | 含义                                                        |
| ------ | ---------------- | ----- | ---- | ----------------------------------------------------------- |
| `0`    | `object_id`      | `u64` | 是   | 被引用对象。                                                |
| `8`    | `operation_id`   | `u64` | 否   | 使用该对象的 operation。                                    |
| `16`   | `object_version` | `u64` | 否   | 版本或 generation。                                         |
| `24`   | `offset`         | `u64` | 否   | 被引用字节或区域 offset。                                   |
| `32`   | `length`         | `u64` | 否   | 被引用字节或区域长度。                                      |
| `40`   | `flags`          | `u32` | 是   | bit `0`：borrowed；bit `1`：mutable；bit `2`：存在 region。 |
| `44`   | `metadata_bytes` | `u32` | 否   | 可选引用 metadata body 长度。                               |

## Object Release Metadata

| Offset | 字段               | 类型  | 必填 | 含义                                                                   |
| ------ | ------------------ | ----- | ---- | ---------------------------------------------------------------------- |
| `0`    | `object_id`        | `u64` | 是   | 被释放对象。                                                           |
| `8`    | `operation_id`     | `u64` | 否   | 不再需要该对象的 operation。                                           |
| `16`   | `release_reason`   | `u16` | 是   | completed、cancelled、expired、replaced、invalidated 或 owner closed。 |
| `18`   | `source_role`      | `u8`  | 是   | 释放方。                                                               |
| `19`   | `flags`            | `u8`  | 是   | bit `0`：最终释放；bit `1`：使依赖对象失效。                           |
| `20`   | `diagnostic_bytes` | `u32` | 否   | 可选诊断 body 长度。                                                   |
| `24`   | `reserved`         | `u64` | 是   | 必须为零。                                                             |

## Object Delta Metadata

| Offset | 字段             | 类型  | 必填 | 含义                                                    |
| ------ | ---------------- | ----- | ---- | ------------------------------------------------------- |
| `0`    | `object_id`      | `u64` | 是   | 被 patch 的对象。                                       |
| `8`    | `delta_sequence` | `u64` | 是   | 该对象内单调递增 delta 序号。                           |
| `16`   | `region_offset`  | `u64` | 否   | 区域 offset。                                           |
| `24`   | `region_bytes`   | `u32` | 否   | 区域长度。                                              |
| `28`   | `delta_bytes`    | `u32` | 是   | Delta payload 长度。                                    |
| `32`   | `flags`          | `u32` | 是   | bit `0`：替换区域；bit `1`：压缩；bit `2`：最终 delta。 |
| `36`   | `metadata_bytes` | `u32` | 否   | 可选 delta metadata body 长度。                         |

## Cache Reference Metadata

| Offset | 字段                 | 类型  | 必填 | 含义                                               |
| ------ | -------------------- | ----- | ---- | -------------------------------------------------- |
| `0`    | `cache_key_hi`       | `u64` | 是   | 缓存身份高 64 位。                                 |
| `8`    | `cache_key_lo`       | `u64` | 是   | 缓存身份低 64 位。                                 |
| `16`   | `profile_id`         | `u16` | 是   | 定义解释方式的 profile。                           |
| `18`   | `reuse_scope`        | `u16` | 是   | Operation、session、connection 或 global。         |
| `20`   | `lease_id`           | `u64` | 否   | Lease anchor。                                     |
| `28`   | `producer_trace_id`  | `u64` | 否   | Producer trace ID。                                |
| `36`   | `expiration_hint_ms` | `u32` | 否   | 过期提示。                                         |
| `40`   | `metadata_bytes`     | `u32` | 否   | 可选 metadata body 长度。                          |
| `44`   | `flags`              | `u32` | 是   | bit `0`：要求 lease；bit `1`：存在 body fallback。 |

## Cache Miss Metadata

| Offset | 字段               | 类型  | 必填 | 含义                                                                       |
| ------ | ------------------ | ----- | ---- | -------------------------------------------------------------------------- |
| `0`    | `cache_key_hi`     | `u64` | 是   | 缓存身份高 64 位。                                                         |
| `8`    | `cache_key_lo`     | `u64` | 是   | 缓存身份低 64 位。                                                         |
| `16`   | `miss_reason`      | `u16` | 是   | not found、expired、invalidated、schema mismatch 或 producer unavailable。 |
| `18`   | `profile_id`       | `u16` | 否   | 拒绝解释的 profile。                                                       |
| `20`   | `diagnostic_bytes` | `u32` | 否   | 可选诊断 body 长度。                                                       |
| `24`   | `reserved`         | `u64` | 是   | 必须为零。                                                                 |

## 一致性测试要求

线路级一致性测试必须通过直接交换 NNRP 帧验证这些 profile。SDK adapter manifest
可以帮助生成场景，但不能替代真实客户端/服务端线路检查。
