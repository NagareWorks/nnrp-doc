---
prev:
  text: 公共头
  link: /zh/common-header/
next:
  text: Tensor Profile
  link: /zh/profiles/tensor/
---

# 类型化载荷描述符

这一页讲的是跨 profile 共用的 descriptor 公共字段。它的职责不是替代公共头，也不是替代各个 profile 的 body，而是把“这块 payload 属于哪种语义、按哪套 schema 解释、在逻辑流里处在哪一段”统一钉住。

## 这一层解决什么问题

1. 公共头只能告诉你消息属于哪一类消息，不能单独说明 payload 的 profile 与 schema 语义。
2. profile-specific body 负责具体解释，但前提是接收方先知道应该按哪套 profile 与 schema 去读。
3. 增量结果、分片结果、区域结果都需要一套独立于 profile body 的位置与流语义锚点。

## 共享字段总览

| 字段名 | 数据形态 | 语义角色 | 典型取值 | 取值范围 |
| --- | --- | --- | --- | --- |
| profile_id | 枚举或短字符串 | 标识 payload 属于哪一类 profile 语义家族 | `tensor`、`token` | 协议注册表中公开的 profile 标识 |
| schema_id | 枚举或短字符串 | 标识具体 schema 模板 | `im.render.tile.v1`、`llm.chat.delta.v1` | 当前 profile 名下公开注册的 schema 标识 |
| schema_version | 整数 | 固定 schema 自身版本 | `1` | 非负整数，具体上限由实现决定 |
| stream_semantics | 枚举或短字符串 | 描述当前 payload 在结果流中的消费方式 | `region_partial`、`ordered_incremental` | 由具体 schema 或 profile 公开定义的流语义集合 |
| offset | 整数 | 指向当前 payload chunk 在逻辑流中的起点 | `0`、`128` | 非负整数 |
| length | 整数 | 描述当前 payload chunk 的逻辑长度 | `3145728`、`36` | 非负整数 |
| descriptor_flags | 标志位集合或短字符串数组 | 暴露当前 descriptor 的附加提示 | `degraded_allowed`、`coverage_present`、`stop_reason_present` | 由协议与 profile 共同约定的可选标志集合 |

## 阅读方式

1. 先看 `profile_id / schema_id / schema_version`，建立语义绑定关系。
2. 再看 `stream_semantics / offset / length`，理解一块 payload 在逻辑流中的位置和消费方式。
3. 最后看 `descriptor_flags`，理解可选提示和附加消费线索。

## profile_id

| 字段名 | 数据形态 | 语义角色 | 典型取值 | 取值范围 |
| --- | --- | --- | --- | --- |
| profile_id | 枚举或短字符串 | 标识 payload 属于哪一类 profile 语义家族 | `tensor`、`token` | 协议注册表中公开的 profile 标识 |

`profile_id` 是 descriptor 层的第一层语义分叉点。没有它，接收方很难知道后续 body 应该按 tensor、token，还是别的 profile 去解释。

## schema_id

| 字段名 | 数据形态 | 语义角色 | 典型取值 | 取值范围 |
| --- | --- | --- | --- | --- |
| schema_id | 枚举或短字符串 | 标识具体 schema 模板 | `im.render.tile.v1`、`llm.chat.delta.v1` | 当前 profile 名下公开注册的 schema 标识 |

同一个 profile 下可以有多套 schema。`schema_id` 的职责就是避免“都叫 tensor / token，但 body 里实际字段集完全不同”的歧义。

## schema_version

| 字段名 | 数据形态 | 语义角色 | 典型取值 | 取值范围 |
| --- | --- | --- | --- | --- |
| schema_version | 整数 | 固定 schema 自身版本 | `1` | 非负整数，具体上限由实现决定 |

当 `schema_id` 需要演进但又不想通过改名字硬分叉时，`schema_version` 就是最直接的冻结点。它和 `schema_id` 必须一起看。

## stream_semantics

| 字段名 | 数据形态 | 语义角色 | 典型取值 | 取值范围 |
| --- | --- | --- | --- | --- |
| stream_semantics | 枚举或短字符串 | 描述当前 payload 在结果流中的消费方式 | `region_partial`、`ordered_incremental` | 由具体 schema 或 profile 公开定义的流语义集合 |

`stream_semantics` 回答的是“消费方应该怎样看待这一段数据”。它不是简单的状态标签，而是对重组方式、追加方式和局部可消费性的约束。

## offset

| 字段名 | 数据形态 | 语义角色 | 典型取值 | 取值范围 |
| --- | --- | --- | --- | --- |
| offset | 整数 | 指向当前 payload chunk 在逻辑流中的起点 | `0`、`128` | 非负整数 |

`offset` 只描述逻辑位置，不直接声明单位。它是字节偏移、序列位置还是别的单位，要结合当前 schema 定义一起解释。

## length

| 字段名 | 数据形态 | 语义角色 | 典型取值 | 取值范围 |
| --- | --- | --- | --- | --- |
| length | 整数 | 描述当前 payload chunk 的逻辑长度 | `3145728`、`36` | 非负整数 |

`length` 与 `offset` 一起工作，用来描述“当前这一块覆盖了逻辑流的哪一段”。具体长度单位也要结合 schema 定义，不要擅自假定总是字节数。

## descriptor_flags

| 字段名 | 数据形态 | 语义角色 | 典型取值 | 取值范围 |
| --- | --- | --- | --- | --- |
| descriptor_flags | 标志位集合或短字符串数组 | 暴露当前 descriptor 的附加提示 | `degraded_allowed`、`coverage_present`、`stop_reason_present` | 由协议与 profile 共同约定的可选标志集合 |

`descriptor_flags` 适合承载“这块 payload 还有哪些额外消费提示”。它不适合拿来替代结构化 body 字段，也不适合塞进模型内部状态。

<div class="page-note">
  这套页讲的是跨 profile 共享字段语义。真正到了 tensor、token 等 profile 时，请回到各自的 descriptor 子页看这些共享字段如何被具体组合使用。
</div>