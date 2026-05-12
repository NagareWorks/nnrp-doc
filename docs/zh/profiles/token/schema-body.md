---
prev:
  text: Token Descriptor 公共头
  link: /zh/profiles/token/descriptor-header/
next:
  text: Token Payload Frame
  link: /zh/profiles/token/payload-frame/
---

# Token Profile: Schema 与 Body

这一页讲 token profile 自己补充的解释字段。它们才是真正定义“当前这段 token 应该怎样被理解”的地方。

## token_unit

| 字段名 | 数据形态 | 典型取值 | 说明 |
| --- | --- | --- | --- |
| token_unit | 枚举或短字符串 | `bpe`、`sentencepiece` | 指定序列单位的切分口径 |

## sequence_start

| 字段名 | 数据形态 | 典型取值 | 说明 |
| --- | --- | --- | --- |
| sequence_start | 整数 | `128` | 表示当前 chunk 覆盖的序列起点 |

## sequence_end

| 字段名 | 数据形态 | 典型取值 | 说明 |
| --- | --- | --- | --- |
| sequence_end | 整数 | `136` | 表示当前 chunk 覆盖到的序列终点 |

## terminal

| 字段名 | 数据形态 | 典型取值 | 说明 |
| --- | --- | --- | --- |
| terminal | 布尔值 | `true`、`false` | 表示当前 operation 或该 profile 输出是否已经终止 |

## stop_reason

| 字段名 | 数据形态 | 典型取值 | 说明 |
| --- | --- | --- | --- |
| stop_reason | 枚举或字符串 | `none`、`eos`、`tool_call` | 描述终止原因，是否出现以及枚举空间由 schema 决定 |

`sequence_start / sequence_end` 决定了这一块 token 在逻辑序列里的位置；`terminal / stop_reason` 决定了消费方是否还应继续等待后续 chunk。