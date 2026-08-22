---
prev:
  text: 运行时控制取值注册表
  link: /zh/profiles/runtime-control/value-registries/
next:
  text: 运行时对象与缓存 Metadata
  link: /zh/profiles/runtime-control/object-cache-frames/
---

# 运行时控制帧 Metadata

本页定义 `runtime.control` 帧的固定
metadata。多取值字段统一使用[运行时控制取值注册表](./value-registries)。

## Control Request Metadata

用于 `CANCEL` 和 `ABORT`。

| Offset | 字段               | 类型  | 必填 | 含义                                      |
| ------ | ------------------ | ----- | ---- | ----------------------------------------- |
| `0`    | `operation_id`     | `u64` | 是   | 目标 operation。`0` 表示 session 级控制。 |
| `8`    | `control_sequence` | `u64` | 是   | 发送方内单调递增序号。                    |
| `16`   | `reason_code`      | `u16` | 是   | 见取值注册表里的 `reason_code`。          |
| `18`   | `source_role`      | `u8`  | 是   | 见取值注册表里的 role codes。             |
| `19`   | `flags`            | `u8`  | 是   | 见取值注册表里的 flag masks。             |
| `20`   | `diagnostic_bytes` | `u32` | 否   | 可选诊断 body 长度。                      |
| `24`   | `reserved`         | `u64` | 是   | 必须为零。                                |

## Scheduling Metadata

用于 `PRIORITY_UPDATE`、`DEADLINE` 和 `EXPIRE_AT`。

| Offset | 字段               | 类型  | 必填                          | 含义                          |
| ------ | ------------------ | ----- | ----------------------------- | ----------------------------- |
| `0`    | `operation_id`     | `u64` | 是                            | 目标 operation。              |
| `8`    | `control_sequence` | `u64` | 是                            | 发送方内单调递增序号。        |
| `16`   | `priority_class`   | `u16` | `PRIORITY_UPDATE` 必填        | 新优先级。                    |
| `18`   | `priority_delta`   | `i16` | 否                            | 相对优先级调整。              |
| `20`   | `deadline_unix_ms` | `u64` | `DEADLINE` / `EXPIRE_AT` 必填 | 非零的绝对 Unix 毫秒 deadline 或过期时间戳；`0` 表示非法或未设置。 |
| `28`   | `flags`            | `u32` | 是                            | 见取值注册表里的 flag masks。 |

## Supersede Metadata

用于 `SUPERSEDE`。

| Offset | 字段               | 类型  | 必填 | 含义                                  |
| ------ | ------------------ | ----- | ---- | ------------------------------------- |
| `0`    | `old_operation_id` | `u64` | 是   | 迟到结果可被丢弃的旧 operation。      |
| `8`    | `new_operation_id` | `u64` | 是   | 替代 operation。                      |
| `16`   | `control_sequence` | `u64` | 是   | 发送方内单调递增序号。                |
| `24`   | `drop_reason_code` | `u16` | 是   | 见取值注册表里的 `drop_reason_code`。 |
| `26`   | `flags`            | `u16` | 是   | 见取值注册表里的 flag masks。         |
| `28`   | `diagnostic_bytes` | `u32` | 否   | 可选诊断 body 长度。                  |

## Budget Metadata

用于 `BUDGET_UPDATE`。

| Offset | 字段                     | 类型  | 必填 | 含义                                         |
| ------ | ------------------------ | ----- | ---- | -------------------------------------------- |
| `0`    | `operation_id`           | `u64` | 是   | 目标 operation，或 `0` 表示 session 级预算。 |
| `8`    | `compute_budget_units`   | `u64` | 否   | 协商成本模型下的计算单元预算。               |
| `16`   | `memory_budget_bytes`    | `u64` | 否   | 内存预算。                                   |
| `24`   | `bandwidth_budget_bytes` | `u64` | 否   | 传输预算。                                   |
| `32`   | `token_budget`           | `u32` | 否   | token 预算。                                 |
| `36`   | `flags`                  | `u32` | 是   | 见取值注册表里的 flag masks。                |

`BUDGET_UPDATE` 携带的是可执行的剩余消耗硬上限，不是调度建议。接收方把更新应用到自己为目标
operation 执行的工作。`operation_id` 为 `0` 时更新会话默认值，只影响此后进入 admission 的
operation；已经进入 admission 的 operation 只有在使用其非零 operation id 定向更新时才会变化。

更新遵循以下规范语义：

1. `replace` 与 `increment` flag 必须且只能设置一个。两者同时设置或均未设置都属于语义错误，
   即使固定 metadata 布局在结构上仍然可以解码。
2. 数值字段为零表示该预算维度保持不变。`replace` 模式下，每个非零字段替换剩余上限；
   `increment` 模式下，每个非零字段增加剩余上限，溢出属于错误。
3. `compute_budget_units` 使用通过 `CAPABILITY_NEGOTIATION` 接受的 cost model。接收方没有具体
   cost model 时不得声明支持 compute budget。
4. `memory_budget_bytes` 限制更新后该 operation 新增持有的活跃内存；
   `bandwidth_budget_bytes` 限制更新后接收方向发送方输出的 NNRP payload 字节；
   `token_budget` 使用当前 profile 的 token unit。对 `openai-compatible/1`，它限制更新被接受后
   生成的 output token 数。
5. 每个非零预算都是硬上限。接收方必须停止、丢弃，或在上限内完成。只有提交请求的预算策略
   允许对应降级，并且兼容的 `DEGRADE_PROFILE` 已被接受时，接收方才可以降级；降级不能放宽
   当前预算上限。
6. 超出上限必须产生终态 `RESULT_DROP_REASON`，其中
   `drop_reason_code=budget_exceeded`；如果 profile 要求先发送 profile 终态事件，则该事件之后
   仍必须留下同一个可观测终态原因。

## Progress Metadata

用于 `PROGRESS`。

| Offset | 字段                | 类型  | 必填 | 含义                            |
| ------ | ------------------- | ----- | ---- | ------------------------------- |
| `0`    | `operation_id`      | `u64` | 是   | 正在报告的 operation。          |
| `8`    | `progress_sequence` | `u64` | 是   | 单调递增进度序号。              |
| `16`   | `stage_code`        | `u16` | 是   | 见取值注册表里的 `stage_code`。 |
| `18`   | `percent_x100`      | `u16` | 否   | `0..10000`；`0xffff` 表示未知。 |
| `20`   | `object_id`         | `u64` | 否   | 该进度事件附带的运行时对象。    |
| `28`   | `body_bytes`        | `u32` | 否   | 可选 progress payload 长度。    |

## Partial Result Metadata

用于 `PARTIAL_RESULT`。

| Offset | 字段              | 类型  | 必填 | 含义                          |
| ------ | ----------------- | ----- | ---- | ----------------------------- |
| `0`    | `operation_id`    | `u64` | 是   | 正在报告的 operation。        |
| `8`    | `result_sequence` | `u64` | 是   | 单调递增结果序号。            |
| `16`   | `object_id`       | `u64` | 否   | 被引用的运行时对象。          |
| `24`   | `delta_sequence`  | `u64` | 否   | 对象 delta 序号。             |
| `32`   | `body_bytes`      | `u32` | 否   | 内联 body 长度。              |
| `36`   | `flags`           | `u32` | 是   | 见取值注册表里的 flag masks。 |

## Pressure Metadata

用于 `BACKPRESSURE` 和 `CREDIT_UPDATE`。

| Offset | 字段              | 类型  | 必填                 | 含义                                 |
| ------ | ----------------- | ----- | -------------------- | ------------------------------------ |
| `0`    | `scope_id`        | `u64` | 是                   | Session 或 operation scope。         |
| `8`    | `credit_window`   | `u64` | `CREDIT_UPDATE` 必填 | 新发送窗口。                         |
| `16`   | `pressure_level`  | `u16` | `BACKPRESSURE` 必填  | 见取值注册表里的 `pressure_level`。  |
| `18`   | `pressure_reason` | `u16` | 否                   | 见取值注册表里的 `pressure_reason`。 |
| `20`   | `retry_after_ms`  | `u32` | 否                   | 发送方等待时间。                     |
| `24`   | `flags`           | `u32` | 是                   | 见取值注册表里的 flag masks。        |
| `28`   | `reserved`        | `u32` | 是                   | 必须为零。                           |

## Capability Metadata

用于 `CAPABILITY_NEGOTIATION` 和 `DEGRADE_PROFILE`。

| Offset | 字段               | 类型  | 必填 | 含义                               |
| ------ | ------------------ | ----- | ---- | ---------------------------------- |
| `0`    | `profile_id`       | `u16` | 是   | 正在协商的 profile。               |
| `2`    | `capability_count` | `u16` | 是   | body 中的 capability entry 数量。  |
| `4`    | `cost_model_id`    | `u16` | 否   | 见取值注册表里的 `cost_model_id`。 |
| `6`    | `preference_rank`  | `u16` | 否   | 数值越低偏好越高。                 |
| `8`    | `limit_bytes`      | `u64` | 否   | 该 profile 的聚合字节限制。        |
| `16`   | `limit_units`      | `u64` | 否   | 聚合计算或 token 限制。            |
| `24`   | `body_bytes`       | `u32` | 是   | Capability entry body 长度。       |
| `28`   | `flags`            | `u32` | 是   | 见取值注册表里的 flag masks。      |

## Route Hint Metadata

用于 `ROUTE_HINT` 和 `EXECUTION_HINT`。

| Offset | 字段               | 类型  | 必填 | 含义                                |
| ------ | ------------------ | ----- | ---- | ----------------------------------- |
| `0`    | `operation_id`     | `u64` | 是   | 被路由的 operation。                |
| `8`    | `route_id`         | `u32` | 否   | 首选 route。                        |
| `12`   | `executor_class`   | `u16` | 否   | 见取值注册表里的 `executor_class`。 |
| `14`   | `affinity_class`   | `u16` | 否   | 见取值注册表里的 `affinity_class`。 |
| `16`   | `deadline_unix_ms` | `u64` | 否   | 路由级 deadline。                   |
| `24`   | `body_bytes`       | `u32` | 否   | 可选 hint body 长度。               |
| `28`   | `flags`            | `u32` | 是   | 见取值注册表里的 flag masks。       |

## Trace Context Metadata

用于 `TRACE_CONTEXT`。

| Offset | 字段             | 类型  | 必填 | 含义                             |
| ------ | ---------------- | ----- | ---- | -------------------------------- |
| `0`    | `trace_id`       | `u64` | 是   | Trace ID，尽量与公共头一致。     |
| `8`    | `span_id`        | `u64` | 是   | 当前 span。                      |
| `16`   | `parent_span_id` | `u64` | 否   | 父 span。                        |
| `24`   | `stage_code`     | `u16` | 否   | 见取值注册表里的 `stage_code`。  |
| `26`   | `flags`          | `u16` | 是   | 见取值注册表里的 flag masks。    |
| `28`   | `body_bytes`     | `u32` | 否   | 可选 trace attribute body 长度。 |

`TRACE_CONTEXT` 冻结为两种关联作用域：

- `header.frame_id == 0` 表示更新 session 级 trace context。
- 非零 `header.frame_id` 表示更新与该 submit frame 绑定的 operation。该 frame ID 必须指向
  active operation，并且必须等于该 operation 记录的 `FRAME_SUBMIT` frame ID。

Metadata 不重复携带 `operation_id`。Role 级 SDK 接受可选 operation identity，在编码公共头
之前通过 active `operation_id` / `frame_id` 配对完成解析。SDK 不得为 `TRACE_CONTEXT` 分配
无关的新 frame ID。接收方必须拒绝非零但未知或配对不一致的 frame ID。公共头
`trace_id` 非零时，必须等于 `TraceContextMetadata.trace_id`。

## Result Drop Metadata

用于 `RESULT_DROP_REASON`。

| Offset | 字段               | 类型  | 必填 | 含义                                  |
| ------ | ------------------ | ----- | ---- | ------------------------------------- |
| `0`    | `operation_id`     | `u64` | 是   | 被丢弃的 operation 或 result。        |
| `8`    | `result_sequence`  | `u64` | 否   | 被丢弃的 result 序号。                |
| `16`   | `drop_reason_code` | `u16` | 是   | 见取值注册表里的 `drop_reason_code`。 |
| `18`   | `source_role`      | `u8`  | 是   | 见取值注册表里的 role codes。         |
| `19`   | `flags`            | `u8`  | 是   | 见取值注册表里的 flag masks。         |
| `20`   | `diagnostic_bytes` | `u32` | 否   | 可选诊断 body 长度。                  |
| `24`   | `reserved`         | `u64` | 是   | 必须为零。                            |

## Recoverable Error Metadata

用于 `ERROR_RECOVERABLE`。

| Offset | 字段                 | 类型  | 必填 | 含义                                      |
| ------ | -------------------- | ----- | ---- | ----------------------------------------- |
| `0`    | `error_code`         | `u32` | 是   | 当前错误注册表中的错误码。                |
| `4`    | `error_scope`        | `u32` | 是   | Connection、session 或 frame 作用域。     |
| `8`    | `recovery_action`    | `u16` | 是   | 见取值注册表里的 `reason_code`。          |
| `10`   | `source_role`        | `u8`  | 是   | 见取值注册表里的 role codes。             |
| `11`   | `flags`              | `u8`  | 是   | 见取值注册表里的 flag masks。             |
| `12`   | `retry_after_ms`     | `u32` | 否   | 建议重试延迟；`0` 表示无显式延迟。        |
| `16`   | `related_session_id` | `u32` | 否   | 相关 session id。                         |
| `20`   | `related_frame_id`   | `u32` | 否   | 相关 frame 或 operation id 的低位。        |
| `24`   | `related_view_id`    | `u32` | 否   | 相关 view id。                            |
| `28`   | `diagnostic_bytes`   | `u32` | 否   | 可选诊断 body 长度。                      |

## Retry After Metadata

用于 `RETRY_AFTER`。

| Offset | 字段               | 类型  | 必填 | 含义                                           |
| ------ | ------------------ | ----- | ---- | ---------------------------------------------- |
| `0`    | `scope_id`         | `u64` | 是   | Session 或 operation 作用域；`0` 表示 connection。 |
| `8`    | `control_sequence` | `u64` | 是   | 发送方内单调递增序号。                         |
| `16`   | `retry_after_ms`   | `u32` | 是   | 最小重试等待时间，单位毫秒。                   |
| `20`   | `jitter_ms`        | `u32` | 否   | 可选 jitter 窗口，单位毫秒。                   |
| `24`   | `reason_code`      | `u16` | 是   | 见取值注册表里的 `reason_code`。               |
| `26`   | `source_role`      | `u8`  | 是   | 见取值注册表里的 role codes。                  |
| `27`   | `flags`            | `u8`  | 是   | 见取值注册表里的 flag masks。                  |
| `28`   | `diagnostic_bytes` | `u32` | 否   | 可选诊断 body 长度。                           |
