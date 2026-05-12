---
prev:
  text: Token Profile
  link: /zh/profiles/token/
next:
  text: Token Schema 与 Body
  link: /zh/profiles/token/schema-body/
---

# Token Profile: Descriptor 公共头

共享字段定义已经抽到 [类型化载荷描述符](/zh/typed-payload-descriptor/) 里统一说明。这一页只讲这些共享字段在 token profile 里如何组合，避免和 tensor profile 重复解释同一套 descriptor 语义。

## 在 token 里最关键的字段组合

| 字段 | token 中主要关注什么 | 典型取值 |
| --- | --- | --- |
| `profile_id` | 明确告诉接收方当前 payload 属于离散序列语义家族 | `token` |
| `schema_id` | 区分聊天增量、工具结果流或别的 token 序列模板 | `llm.chat.delta.v1` |
| `schema_version` | 固定具体 schema 的解释版本 | `1` |
| `stream_semantics` | 决定消费方应按顺序追加、重组还是用别的方式消费 token 流 | `ordered_incremental` |
| `offset / length` | 把当前 chunk 放回逻辑序列中的正确位置 | `128 / 36` |
| `descriptor_flags` | 暴露 stop reason 等额外提示是否随当前 chunk 一起出现 | `stop_reason_present` |

## token 侧的阅读重点

1. `schema_id + schema_version` 决定 token body 里 `token_unit / sequence_start / sequence_end / terminal / stop_reason` 应如何解释。
2. `stream_semantics + offset + length` 决定当前 token chunk 是按顺序拼接、补洞重组，还是别的序列消费模式。
3. `descriptor_flags` 更适合表达“这个 chunk 额外带了什么提示”，不适合塞进采样参数或模型内部状态。

descriptor 这一层负责把 token chunk 挂到正确的 profile、schema 和逻辑序列上；真正的序列解释仍要回到 [Schema 与 Body](./schema-body) 和 [Payload Frame](./payload-frame)。