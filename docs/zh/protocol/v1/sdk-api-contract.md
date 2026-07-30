# 跨 SDK API 契约

NNRP/1 Preview 4 为 Rust、Python、JavaScript/TypeScript 与 C# 冻结同一套语义角色 API。
各语言可以采用符合自身习惯的命名和所有权表达，但字段、校验、调用基数和 wire 语义必须等价。

规范性的机器可读来源是 [`nnrp-1-preview4-sdk-api.json`](/contracts/nnrp-1-preview4-sdk-api.json)。各
SDK 的 CI 必须据此校验公共 API。仅通过 adapter 把语言特有对象归一化后完成 wire
一致性测试，不能证明公共 API 对等。

## 提交请求

所有客户端角色都接受同一种拥有数据所有权、与具体 profile 解耦的提交请求：

| 语义字段       | 必填 | 含义                                              |
| -------------- | ---: | ------------------------------------------------- |
| `operation_id` |   是 | 非零 `u64` operation 标识。                       |
| `frame_id`     |   是 | 非零 `u32` 公共帧头标识。                         |
| `metadata`     |   是 | 不重复包含 `operation_id` 的类型化提交 metadata。 |
| `body`         |   是 | SDK 拥有的应用负载；所选 profile 允许时可以为空。 |

SDK 将 `operation_id` 写入编码后的 `FRAME_SUBMIT` metadata，将 `frame_id` 写入公共帧头。
绑定层只编码一次 metadata 和 body，并执行一次粗粒度 FFI submit 调用。应用代码不构造 FFI buffer。

`SubmitMetadata` 保留 `FRAME_SUBMIT` 的全部规范语义；计数、字节长度和默认值由 profile 专属 builder
负责。Tensor、token、structured-event、tool-delta 和 opaque payload helper 最终都生成同一个
`SubmitRequest`，它们不是互不相同的角色协议。

缓存引用、runtime object、调度更新和控制帧继续使用各自的类型化 API，不得隐藏到任意 submit metadata
字典中。

## Runtime 事件

所有客户端和服务端角色事件都拥有：

| 字段       | 含义                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| `header`   | 完整的非派生公共帧头投影。                                              |
| `metadata` | 由 `header.message_type` 选择的类型化 metadata 联合类型。               |
| `tail`     | 类型化的无尾部、body、diagnostic 或 metadata-body-plus-delta 联合类型。 |

帧头包含 `version_major`、`wire_format`、`message_type`、`flags`、`session_id`、`frame_id`、
`view_id`、`route_id` 和 `trace_id`。`header_len`、`meta_len` 与 `body_len` 在编码时派生，
不是调用方可控制的 SDK 字段。

SDK 不得在 `header` 之外重复公开帧头字段，也不得在绑定层没有保留 wire 值时伪造零值或默认值。 Native
handle 和 generation counter 属于绑定上下文，不属于协议帧头。

## 发布门禁

Preview 4 SDK 只有同时满足以下条件才允许发布：

1. 公共 API 投影与机器可读契约一致。
2. Native 与 WebSocket 事件路径保留相同的帧头和尾部语义。
3. Profile builder 不增加额外 FFI 往返，并生成符合 wire 规范的 metadata。
4. Wire 一致性与公共 API 对等性都通过；两者不能互相替代。
5. 公共 API 不保留任何旧 Preview 兼容 shim。
