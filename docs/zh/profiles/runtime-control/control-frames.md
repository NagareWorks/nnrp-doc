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
