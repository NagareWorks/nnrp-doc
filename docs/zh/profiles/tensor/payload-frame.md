---
prev:
  text: Tensor Schema 与 Body
  link: /zh/profiles/tensor/schema-body/
next:
  text: Token Profile
  link: /zh/profiles/token/
---

# Tensor Profile: Payload Frame

Payload frame 是 tensor profile 里真正承载数值块的部分。descriptor 和 body 负责告诉你“怎么解释”，payload frame 才是“真正的数据”。

## 这一层主要回答什么

1. 当前 chunk 里到底装了多少原始 tensor 数据。
2. 这些数据和 `offset / length` 怎样对应。
3. 接收方是否需要按 chunk、区域或完整张量去做重组。

## 典型表示

| 名称 | 典型形态 | 说明 |
| --- | --- | --- |
| tensor_chunk | 二进制块 | 可以是一整块 tensor，也可以只是分片或区域增量 |

## 工程注意点

1. payload frame 不负责自解释全部语义，shape、layout、dtype 仍应从 schema/body 获取。
2. 只靠 payload frame 本身不能判断它是完整结果、部分结果还是退化结果，这些语义仍要结合 metadata 与 descriptor。
3. 如果 transport 或实现选择分块传输，接收方要结合 `offset / length` 做拼接，而不是假设每次都收到完整 tensor。