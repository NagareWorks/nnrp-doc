---
prev:
  text: Token Schema 与 Body
  link: /zh/profiles/token/schema-body/
next: false
---

# Token Profile: Payload Frame

Payload frame 是 token profile 里真正承载离散序列内容的部分。descriptor 和 body 只负责解释规则，payload frame 才是用户最终要展示、缓存或拼接的那一段 token 数据。

## 这一层主要回答什么

1. 当前 chunk 里到底携带了什么 token 片段。
2. 它和 `sequence_start / sequence_end`、`offset / length` 怎样对应。
3. 接收方应把它直接展示、暂存，还是等待更多 chunk 再合并。

## 典型表示

| 名称 | 典型形态 | 说明 |
| --- | --- | --- |
| token_chunk | 字符串、字节块或编码后的 token 序列片段 | 表示当前增量返回的离散序列内容 |

## 工程注意点

1. payload frame 不负责声明 token 单位，`bpe` 还是别的切分口径应由 schema/body 提供。
2. 不要仅凭 payload frame 判断是否结束，还要结合 `terminal` 与 `stop_reason`。
3. 如果实现支持断续传输或重组，接收方应结合 descriptor 中的偏移信息按顺序拼接。