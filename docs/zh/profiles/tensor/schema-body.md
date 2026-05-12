---
prev:
  text: Tensor Descriptor 公共头
  link: /zh/profiles/tensor/descriptor-header/
next:
  text: Tensor Payload Frame
  link: /zh/profiles/tensor/payload-frame/
---

# Tensor Profile: Schema 与 Body

这一页讲 tensor profile 自己补充的解释字段。它们不应该被抬升到公共头，因为它们只在 tensor 家族里成立。

## dtype

| 字段名 | 数据形态 | 典型取值 | 说明 |
| --- | --- | --- | --- |
| dtype | 标量类型 | `f16`、`f32`、`u8` | 指定 payload 里每个元素按什么数值类型解释 |

## shape

| 字段名 | 数据形态 | 典型取值 | 说明 |
| --- | --- | --- | --- |
| shape | 整数数组 | `[1, 3, 512, 512]` | 定义张量的逻辑维度，决定元素总数与维度语义 |

## layout

| 字段名 | 数据形态 | 典型取值 | 说明 |
| --- | --- | --- | --- |
| layout | 布局枚举或短字符串 | `nchw`、`nhwc` | 定义 shape 每一维如何映射到语义维度 |

## coverage

| 字段组 | 子字段 | 典型取值 | 说明 |
| --- | --- | --- | --- |
| coverage | `tile_x / tile_y / width / height` | `12 / 7 / 512 / 512` | 说明当前 tensor 覆盖的是哪一块区域，以及这块区域的尺寸 |

当 schema 需要区域化解释时，`coverage` 会很重要；当 schema 是全量 tensor 或非空间语义 tensor 时，它也可以不存在。不要把 coverage 当成 tensor profile 的全局必选字段。