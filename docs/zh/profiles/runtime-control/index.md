---
prev:
  text: Token Payload Frame
  link: /zh/profiles/token/payload-frame/
next:
  text: 运行时控制取值注册表
  link: /zh/profiles/runtime-control/value-registries/
---

# 运行时控制 Profiles

运行时控制 profiles 是 NNRP 的标准
profile。它们定义取消、优先级、deadline、部分结果、背压、缓存引用、路由提示和 trace context
等小型控制帧，让宿主不需要再把这些信号包进 JSON 或另一个应用层协议里。

这些 profile 和 `tensor`、`token` 一样属于标准 profile 注册表。实现不得把它们当成私有扩展名字。

## 阅读路径

1. 先看 [取值注册表](./value-registries)，确认 code、role、object kind、cache scope 和 flag mask
   的冻结取值。
2. 再看 [控制帧 Metadata](./control-frames)，覆盖取消、调度、背压、路由提示、trace context 和 drop
   reason。
3. 最后看 [对象与缓存 Metadata](./object-cache-frames)，覆盖运行时对象声明、对象引用、对象
   delta、释放和缓存引用。

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

| 编号   | 帧                       | 方向             | Profile           | 固定 metadata                                                                  |
| ------ | ------------------------ | ---------------- | ----------------- | ------------------------------------------------------------------------------ |
| `0x30` | `CANCEL`                 | C -> S 或 S -> C | `runtime.control` | [Control Request Metadata](./control-frames#control-request-metadata)          |
| `0x31` | `ABORT`                  | C -> S 或 S -> C | `runtime.control` | [Control Request Metadata](./control-frames#control-request-metadata)          |
| `0x32` | `PRIORITY_UPDATE`        | C -> S 或 S -> C | `runtime.control` | [Scheduling Metadata](./control-frames#scheduling-metadata)                    |
| `0x33` | `DEADLINE`               | C -> S 或 S -> C | `runtime.control` | [Scheduling Metadata](./control-frames#scheduling-metadata)                    |
| `0x34` | `EXPIRE_AT`              | C -> S 或 S -> C | `runtime.control` | [Scheduling Metadata](./control-frames#scheduling-metadata)                    |
| `0x35` | `SUPERSEDE`              | C -> S 或 S -> C | `runtime.control` | [Supersede Metadata](./control-frames#supersede-metadata)                      |
| `0x36` | `BUDGET_UPDATE`          | C -> S 或 S -> C | `runtime.control` | [Budget Metadata](./control-frames#budget-metadata)                            |
| `0x37` | `PROGRESS`               | S -> C 或 C -> S | `runtime.control` | [Progress Metadata](./control-frames#progress-metadata)                        |
| `0x38` | `PARTIAL_RESULT`         | S -> C 或 C -> S | `runtime.control` | [Partial Result Metadata](./control-frames#partial-result-metadata)            |
| `0x39` | `BACKPRESSURE`           | C -> S 或 S -> C | `runtime.control` | [Pressure Metadata](./control-frames#pressure-metadata)                        |
| `0x3A` | `CREDIT_UPDATE`          | C -> S 或 S -> C | `runtime.control` | [Pressure Metadata](./control-frames#pressure-metadata)                        |
| `0x3B` | `CAPABILITY_NEGOTIATION` | C -> S 或 S -> C | `runtime.control` | [Capability Metadata](./control-frames#capability-metadata)                    |
| `0x3C` | `DEGRADE_PROFILE`        | C -> S 或 S -> C | `runtime.control` | [Capability Metadata](./control-frames#capability-metadata)                    |
| `0x3D` | `ROUTE_HINT`             | C -> S 或 S -> C | `runtime.control` | [Route Hint Metadata](./control-frames#route-hint-metadata)                    |
| `0x3E` | `EXECUTION_HINT`         | C -> S 或 S -> C | `runtime.control` | [Route Hint Metadata](./control-frames#route-hint-metadata)                    |
| `0x3F` | `TRACE_CONTEXT`          | C -> S 或 S -> C | `runtime.control` | [Trace Context Metadata](./control-frames#trace-context-metadata)              |
| `0x40` | `RESULT_DROP_REASON`     | C -> S 或 S -> C | `runtime.control` | [Result Drop Metadata](./control-frames#result-drop-metadata)                  |
| `0x41` | `OBJECT_DECLARE`         | C -> S 或 S -> C | `runtime.object`  | [Object Descriptor Metadata](./object-cache-frames#object-descriptor-metadata) |
| `0x42` | `OBJECT_REF`             | C -> S 或 S -> C | `runtime.object`  | [Object Reference Metadata](./object-cache-frames#object-reference-metadata)   |
| `0x43` | `OBJECT_RELEASE`         | C -> S 或 S -> C | `runtime.object`  | [Object Release Metadata](./object-cache-frames#object-release-metadata)       |
| `0x44` | `OBJECT_PATCH`           | C -> S 或 S -> C | `runtime.object`  | [Object Delta Metadata](./object-cache-frames#object-delta-metadata)           |
| `0x45` | `OBJECT_DELTA`           | C -> S 或 S -> C | `runtime.object`  | [Object Delta Metadata](./object-cache-frames#object-delta-metadata)           |
| `0x46` | `CACHE_REFERENCE`        | C -> S 或 S -> C | `cache.reference` | [Cache Reference Metadata](./object-cache-frames#cache-reference-metadata)     |
| `0x47` | `CACHE_MISS`             | C -> S 或 S -> C | `cache.reference` | [Cache Miss Metadata](./object-cache-frames#cache-miss-metadata)               |

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
