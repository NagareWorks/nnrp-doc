---
prev:
  text: Tensor Profile
  link: /zh/profiles/tensor/
next:
  text: Tensor Schema 与 Body
  link: /zh/profiles/tensor/schema-body/
---

# Tensor Profile: Descriptor 公共头

共享字段定义已经抽到 [类型化载荷描述符](/zh/typed-payload-descriptor/) 里统一说明。这一页只讲这些共享字段在 tensor profile 里分别承担什么职责，避免和 token profile 重复讲同一套定义。

## 在 tensor 里最关键的字段组合

| 字段 | tensor 中主要关注什么 | 典型取值 |
| --- | --- | --- |
| `profile_id` | 明确告诉接收方后续 body 要按 tensor 家族解释 | `tensor` |
| `schema_id` | 指向具体 tensor 语义模板，例如 tile、frame 或别的数值结构 | `im.render.tile.v1` |
| `schema_version` | 固定 schema 的解释版本，避免名字不变但字段漂移 | `1` |
| `stream_semantics` | 决定当前 tensor 是全量、分片还是区域增量结果 | `region_partial` |
| `offset / length` | 把当前 chunk 放回逻辑 tensor 流中的正确位置 | `0 / 3145728` |
| `descriptor_flags` | 暴露 tensor 特有的附加提示，例如 coverage 是否显式存在 | `degraded_allowed`、`coverage_present` |

## tensor 侧的阅读重点

1. `schema_id + schema_version` 决定你该用哪套 tensor body 去解释 `shape / layout / dtype / coverage`。
2. `stream_semantics + offset + length` 决定你当前看到的是完整 tensor，还是某个区域块或增量片段。
3. `descriptor_flags` 常常承担“这个 chunk 还有哪些额外消费提示”的职责，但不应该替代 body 本身去承载结构化字段。

descriptor 这一层负责把 tensor payload 正确挂到 profile、schema 和逻辑流上；真正的数值解释仍要回到 [Schema 与 Body](./schema-body) 和 [Payload Frame](./payload-frame)。