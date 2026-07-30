# 跨 SDK API 契约

NNRP/1 Preview 4 为 Rust、Python、JavaScript/TypeScript 与 C# 冻结同一套语义角色 API。
各语言可以采用符合自身习惯的命名和所有权表达，但字段、校验、调用基数和 wire 语义必须等价。

规范性的机器可读来源是 [`nnrp-1-preview4-sdk-api.json`](/contracts/nnrp-1-preview4-sdk-api.json)。各
SDK 的 CI 必须据此校验公共 API。仅通过 adapter 把语言特有对象归一化后完成 wire
一致性测试，不能证明公共 API 对等。

## 提交请求

所有客户端角色都接受同一种拥有数据所有权、与具体 profile 解耦的提交请求：

| 语义字段       | 必填 | 含义                                               |
| -------------- | ---: | -------------------------------------------------- |
| `operation_id` |   是 | 非零 `u64` operation 标识。                        |
| `frame_id`     |   是 | 非零 `u32` 公共帧头标识。                          |
| `header`       |   是 | Flags 以及调用方指定的 view、route 与 trace 标识。 |
| `metadata`     |   是 | 不重复包含 `operation_id` 的类型化提交 metadata。  |
| `body`         |   是 | SDK 拥有的应用负载；所选 profile 允许时可以为空。  |

SDK 将 `operation_id` 写入编码后的 `FRAME_SUBMIT` metadata，将 `frame_id` 写入公共帧头。
绑定层只编码一次 metadata 和 body，并执行一次携带 `SubmitHeaderContext` 的粗粒度 FFI submit 调用；
Rust 补入协商后的 `session_id` 与派生帧头长度。应用代码不构造 FFI buffer。

`SubmitMetadata` 保留 `FRAME_SUBMIT` 的全部规范语义；tile/section 计数、字节长度、payload bitmap、
payload frame 计数和默认值由 profile 专属 builder 负责。必须提供 tensor、token 和通用 typed-payload
三类 builder；structured-event、tool-delta、audio、video 与 opaque payload 统一使用 typed-payload
builder。所有 builder 最终都生成同一个 `SubmitRequest`，它们不是互不相同的角色协议。

每个 builder 都接收一个封闭的类型化输入对象，不接受开放式关键字字典：

| Builder       | 输入                      | 由 SDK 派生的 wire 字段                                                              |
| ------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| tensor        | `TensorSubmitInput`       | tile/section 计数、section descriptor、body region、长度、mode 与引用 mask           |
| token         | `TokenSubmitInput`        | token profile/schema 默认值、descriptor offset、payload bitmap 与 payload frame 计数 |
| typed payload | `TypedPayloadSubmitInput` | descriptor offset、payload bitmap 与 payload frame 计数                              |

三种输入都包含 `SubmitIdentity` 和 `SubmitPolicy`。`SubmitIdentity` 持有非零 operation/frame 标识及
`SubmitHeaderContext`；`SubmitPolicy` 持有 frame class、延迟与 cadence 目标、retry/dependency 标识、
budget policy 和 loss-tolerance policy。Tensor 输入还持有尺寸、tile ID、语义化
`TensorSection`、camera bytes、input profile、tile-index mode、tile base 与标准对象引用。Token
输入持有 token chunk，SDK 负责应用已经冻结的 token profile、schema 与 append-stream 默认值。通用
typed-payload 输入持有明确的 `TypedPayloadInputFrame`；此输入不暴露 descriptor offset 与
length，它们由 SDK 根据 frame 顺序与 owned payload 长度派生。

`TensorSection` 是语义输入，不是预编码 descriptor。它持有 role、codec、dtype、layout、scale policy、
element count、逐 tile payload、可选逐 tile codec 与可选固定 stride；descriptor flags
以及全部表/负载 长度都由 SDK 派生。NNRP/1 继承的 32 字节 tensor descriptor 按 offset 固定为
`role_id`、`codec_id`、
`dtype_id`、`layout_id`、`scale_policy`、`section_flags`、`element_count_per_tile`、
`codec_table_bytes`、`length_table_bytes`、`payload_bytes`、`payload_stride_bytes` 与全零
`reserved`。

缓存引用、runtime object、调度更新和控制帧继续使用各自的类型化 API，不得隐藏到任意 submit metadata
字典中。

## Typed Payload Frame

所有 SDK 都以同样的八个语义字段公开当前 24 字节 `TypedPayloadDescriptor`：`profile_id`、
`payload_kind`、`descriptor_flags`、`schema_id`、`schema_version`、`stream_semantics`、`offset` 和
`length`。 解码后的 `TypedPayloadFrame` 拥有该 descriptor 与 payload bytes。

每个 descriptor 都明确携带一个 payload kind。`payload_kind_bitmap` 等于这些 kind 的并集， 并在存在
tensor region 时额外包含 `tensor`。SDK 必须校验这一等式，禁止根据 descriptor 顺序 猜测逐帧
kind。当前布局不得退回 Preview2 的 16 字节 descriptor，也不得采用早期 Preview3 草案中遗漏逐帧 kind
的布局。

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

机器契约冻结了封闭的 `RuntimeEventMetadata` 与 `RuntimeEventTail` variant，并穷举 role event pump
可能交付的每一种消息。握手响应、probe 响应、迁移确认、cache command 确认、ping/pong、connection
close 与致命 connection error 由各自的 role 或 connection API 消费，不得被静默改装为 runtime event。

FFI carrier 也可以报告本地生命周期状态。此类事件的 `header.present == 0`，在 SDK
中必须继续使用独立的 lifecycle-event 类型；只有 `header.present == 1` 才能构造
`RuntimeEvent`。绑定层不得为本地状态伪造 全零 wire header。

## 发布门禁

Preview 4 SDK 只有同时满足以下条件才允许发布：

1. 公共 API 投影与机器可读契约一致。
2. Native 与 WebSocket 事件路径保留相同的帧头和尾部语义。
3. Profile builder 不增加额外 FFI 往返，并生成符合 wire 规范的 metadata。
4. 当前数据面记录与机器契约的精确长度、offset 和 canonical bytes 一致。
5. Wire 一致性与公共 API 对等性都通过；两者不能互相替代。
6. 公共 API 不保留任何旧 Preview 兼容 shim。
