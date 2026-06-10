# nnrp-1-preview4 能力列表

本页对应 `nnrp-conformance/protocol/nnrp-1-preview4/`。Preview4 的重点是运行时编排：控制帧、运行时对象、缓存引用、IPC/WebSocket 传输，以及线路级互通测试。

这些 token 只应写入 `conformance/nnrp-1-preview4.capabilities.json`。声明某个 token 意味着实现接受由它选中的 mandatory 用例，以及下方列出的组合要求。

## Mandatory 控制能力

| Token | 层级 | 状态范围 | 组合要求 | 含义 |
| --- | --- | --- | --- | --- |
| `control.cancel_abort` | L1 | mandatory | 通常与 `control.result_drop_reason`、`control.trace_context` 同时声明。 | 按操作标识取消或中止任务，并输出类型化终态。 |
| `control.result_drop_reason` | L1 | mandatory / experimental | 会被取消、截止时间、supersede 与迟到结果路径复用。 | 标记结果被丢弃的原因，包括取消、中止、过期、被替换等状态。 |
| `control.trace_context` | L1 | mandatory | 通常与 `control.cancel_abort`、`control.result_drop_reason` 同时声明。 | 保留端到端 trace context，用于分段计时和问题定位。 |
| `control.priority_update` | L1 | mandatory | 通常与 `control.deadline_expire`、`control.result_drop_reason` 同时声明。 | 动态调整操作优先级，让调度器重新排序未完成工作。 |
| `control.deadline_expire` | L1 | mandatory | 通常与 `control.priority_update`、`control.result_drop_reason` 同时声明。 | 声明任务截止时间或过期时间，避免继续执行失效任务。 |
| `control.progress_partial` | L1 | mandatory | 通常与 `control.credit_backpressure` 同时声明。 | 在终态前返回进度和部分结果。 |
| `control.credit_backpressure` | L1 | mandatory | 通常与 `control.progress_partial` 同时声明。 | 用 credit update 与 backpressure 表达可接受的并发和数据量。 |
| `control.capability_costs` | L1 | mandatory | 无 | 在能力协商中声明成本、偏好、限制与降级元数据。 |

## 运行时对象与缓存能力

| Token | 层级 | 状态范围 | 组合要求 | 含义 |
| --- | --- | --- | --- | --- |
| `object.lifecycle` | L1 | mandatory | 会与 `object.cost`、`object.ownership`、`object.delta` 组合出现。 | 声明运行时对象、在操作中引用对象，并显式释放所有权。 |
| `object.cost` | L1 | mandatory | 通常与 `object.lifecycle`、`object.ownership` 同时声明。 | 为运行时对象声明计算、显存、带宽或生命周期成本。 |
| `object.ownership` | L1 | mandatory | 通常与 `object.lifecycle`、`object.cost` 同时声明。 | 固定对象所有权转移、释放和失效语义。 |
| `object.delta` | L1 | mandatory | 通常与 `object.lifecycle` 同时声明。 | 发送对象补丁或 delta，避免重复传输完整运行时对象。 |
| `cache.reference` | L1 | optional | 无 | 在身份与失效语义清晰的路径使用 cache reference、miss 和 invalidation。 |

## 调度与降级能力

| Token | 层级 | 状态范围 | 组合要求 | 含义 |
| --- | --- | --- | --- | --- |
| `control.route_execution_hint` | L1 | optional | 无 | 携带路由与执行 hint，供 runtime 或 subagent 调度使用，避免退回重包装格式。 |
| `control.degrade_profile` | L1 | optional | 通常与 `control.budget_update` 同时声明。 | 在会话中协商更便宜的执行 profile。 |
| `control.budget_update` | L1 | optional | 通常与 `control.degrade_profile` 同时声明。 | 更新 compute、token、memory 或 bandwidth budget。 |
| `control.supersede` | L1 | experimental | 通常与 `control.result_drop_reason` 同时声明。 | 用新操作替换过期操作，并保留 trace 连续性与迟到结果可丢弃语义。 |
| `control.retry_after` | L1 | experimental | 无 | 区分可重试压力与终止失败，并携带 retry-after 时间。 |

## 线路级一致性测试

Preview4 还提供独立的线路级目标声明，用于让 runner 直接扮演客户端、服务端或代理。这不是 adapter 内部单测，而是在线路边界验证帧顺序、终态、传输绑定与证据输出。

需要同时创建协议能力声明和线路级目标声明时，可以使用 [能力声明生成器](../capability-manifest-generator)。
