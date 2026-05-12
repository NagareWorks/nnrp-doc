# NNRP/1-preview3 标准 Profile

preview3 的公共层是 profile-neutral 的。首轮标准 profile 先冻结为 `tensor` 与 `token`，两者在公共层并列，不再把 token、事件或工具增量勉强伪装成 tensor 附属物。

| Profile | 面向对象 | 最小公共语义 |
| --- | --- | --- |
| `tensor` | 数值块、区域化载荷、可选 coverage 语义 | shape/layout/dtype 解释入口，允许 `partial / degraded / stale_reuse` |
| `token` | 离散 token 或 token chunk | 序列位置范围、增量输出、完成状态、stop reason 口径 |

首轮边界：

1. `tensor` 仍允许 coverage 语义，但 coverage 不再是所有 profile 的公共要求。
2. `token` 的 `partial` 默认表示“序列尚未完成但当前 chunk 可消费”，而不是 tensor 风格的覆盖缺口。
3. logits、候选分布、模型私有采样状态等内容不被抬升为公共必选字段，只能通过 schema 或 profile 扩展进入。

用户侧实现需要牢记：

1. 解释 payload 时，先看 `profile_id + schema_id + schema_version`，再看语言绑定私有对象。
2. 如果同一连接里同时跑 tensor 与 token，会话层和流控层仍共享同一套公共机制。