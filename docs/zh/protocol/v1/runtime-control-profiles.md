# Runtime Control Profiles（Preview4 基线）

本页记录 preview4 的协议扩展基线，使 NNRP 不再只有 token profile。下面的 capability token、帧族名称、runner mode、transport enum 和 target manifest 字段属于 SDK bring-up 可以直接依赖的冻结表面；后续 canonical vector 只补齐字节样例和互操作断言。

## Profile 族

| Profile | 范围 | 主要使用者 |
| --- | --- | --- |
| `runtime.control` | 取消、优先级、deadline、进度、背压、trace 与结果丢弃诊断。 | 所有跨会话调度任务的 runtime。 |
| `runtime.object` | 对象声明、引用、delta、release、生命周期、成本与所有权。 | 重 artifact、tensor、图像与多模态流水线。 |
| `coding.agent` | Subagent 调度、工具调用 artifact、route hint、execution hint 与取消策略。 | AI Coding Agent 与本地 subagent 编排。 |
| `multimodal.artifact` | 图像、音频、视频、文档与工具 artifact 的类型化描述符和部分结果流。 | 多模态工具和 assistant runtime。 |
| `render.runtime` | 帧 deadline、局部区域结果、supersession、trace stage 与 drop reason。 | 神经渲染和交互式 runtime 服务。 |
| `cache.reference` | Cache reference、cache miss、invalidate 与可选 lease 元数据。 | 已经测出可复用性的工作负载。 |

## 控制帧目录

| Capability token | 帧族 | 必需行为 |
| --- | --- | --- |
| `control.cancel_abort` | `CANCEL`, `ABORT` | 按 operation ID 停止任务，并报告是协作式终止还是强制终止。 |
| `control.supersede` | `SUPERSEDE` | 将替代操作与被替代操作关联，并标记旧结果可丢弃。 |
| `control.priority_update` | `PRIORITY_UPDATE` | 入队后更新优先级，不需要重开会话。 |
| `control.deadline_expire` | `DEADLINE`, `EXPIRE_AT` | 任务失去使用价值后丢弃或降级。 |
| `control.progress_partial` | `PROGRESS`, `PARTIAL_RESULT` | 在最终结果前发出进度与部分 artifact。 |
| `control.credit_backpressure` | `BACKPRESSURE`, `CREDIT_UPDATE` | 调整发送窗口并报告压力，不依赖外部限流通道。 |
| `control.capability_costs` | `CAPABILITY_NEGOTIATION` | 声明支持能力，同时声明成本、偏好、限制与降级行为。 |
| `control.route_execution_hint` | `ROUTE_HINT`, `EXECUTION_HINT` | 携带调度提示，不要求再套 JSON/protobuf wrapper。 |
| `control.cache_reference` | `CACHE_REFERENCE`, `CACHE_MISS`, `CACHE_INVALIDATE` | 只有 profile 能定义身份与失效语义时才使用缓存引用。 |
| `control.trace_context` | `TRACE_CONTEXT` | 跨帧传播关联 ID 与阶段计时。 |
| `control.result_drop_reason` | `RESULT_DROP_REASON` | 用机器可读原因解释任务为什么被丢弃。 |
| `control.degrade_profile` | `DEGRADE_PROFILE` | 首选路径不可用时协商更便宜或更兼容的 profile。 |
| `control.budget_update` | `BUDGET_UPDATE` | 会话内更新 compute、token、memory 或 bandwidth 预算。 |
| `control.retry_after` | `ERROR_RECOVERABLE`, `RETRY_AFTER` | 区分可重试压力与终止性协议失败。 |

## Runtime object 目录

| Capability token | 帧族 | 必需行为 |
| --- | --- | --- |
| `object.lifecycle` | `OBJECT_DECLARE`, `OBJECT_REF`, `OBJECT_RELEASE` | 命名运行时对象，在操作中引用，并显式释放。 |
| `object.delta` | `OBJECT_PATCH`, `OBJECT_DELTA` | 发送变化区域或状态 delta，而不是重发完整对象。 |
| `object.cost` | object metadata | 声明大小、计算成本、推荐存储位置与生命周期提示。 |
| `object.ownership` | object metadata | 声明 producer、consumer 或 session 哪一方负责释放。 |

## 一致性测试影响

Preview4 的 Wire 级一致性测试必须通过直接交换帧来测试这些 profile。Adapter 声明仍然有价值，但不足以证明不同 SDK 通过 wire 通信时的 client/server 语义一致。
