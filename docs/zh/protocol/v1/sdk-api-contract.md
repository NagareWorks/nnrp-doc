# 跨 SDK API 契约

NNRP/1 Preview 4 为 Rust、Python、JavaScript/TypeScript 与 C# 冻结同一套语义角色 API。
各语言可以采用符合自身习惯的命名和所有权表达，但字段、校验、调用基数和 wire 语义必须等价。

规范性的机器可读来源是 [`nnrp-1-preview4-sdk-api.json`](/contracts/nnrp-1-preview4-sdk-api.json)。各
SDK 的 CI 必须据此校验公共 API。仅通过 adapter 把语言特有对象归一化后完成 wire
一致性测试，不能证明公共 API 对等。

机器契约把每一项 SDK 投影唯一归入一个必备 domain：submission、runtime events、lifecycle、
capability、cache、schema、transport 或 roles。新增 SDK 或 feature 时只要缺少任一 domain，
就属于契约失败；wire adapter 通过一致性测试也不能替代 API domain 覆盖。

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

## Runtime Metadata 与枚举

机器契约是封闭图，而不是示例清单。它冻结每一种 runtime-event metadata 的全部字段、这些字段引用的
全部枚举或 bitmask，以及每个枚举成员的数值和 wire 宽度。Metadata 联合类型不得引用契约中不存在的
类型，SDK 也不得用语言本地状态模型替换已冻结枚举。

`RESULT_PUSH.status_code` 是应用自定义的 `u16` 细节码，不承载协议终态。`RESULT_PUSH` 表示成功完成；
取消、丢弃和错误由相应协议消息及 operation 生命周期确定。规范终态注册表是
`ResultTerminalState`：`success`、`cancelled`、`dropped`、`error`。

本地 operation 生命周期统一使用 `OperationState`：`accepted`、`running`、`partial`、
`waiting_tool`、`superseded`、`cancelled`、`failed`、`completed`，并继续与 wire
事件分离。终态映射固定为 completed 到 success、cancelled 到 cancelled、superseded 到 dropped、failed
到 error。

## 缓存与 Provider Host 模型

机器契约同时冻结不直接作为 wire record 的跨 SDK host value。语义枚举具有唯一、闭合的成员集，
但允许使用符合语言习惯的表示，例如 Rust/C# enum、Python `StrEnum` 或 TypeScript 字符串 union； SDK
不得增加或遗漏语义成员。

缓存身份、租约、依赖、版本、结果、失效和显式启用策略统一使用 `CacheObjectId`、`CacheLease`、
`CacheDependency`、`CacheDependencyState`、`CacheObjectVersion`、`CacheLeaseResult`、
`CacheInvalidation`、`CacheDependencyInvalidation` 与 `CachePolicyOptions`。`CacheValidationFailure`
只包含失败原因；语言可以通过 `Result`、无异常返回或 `Try` 方法表达成功，但 success 不是额外的
failure reason。

Provider 发现与选择统一使用规范的 cost、limits、metadata、descriptor、readiness、probe、candidate、
selection、failure 和 options 类型。选择结果保留全部有序 candidate 及其 rejection evidence；
`TransportSelection.policy` 记录产生该决策的策略，`TransportSelectionFailure` 保留同一组 candidate
诊断，而不是把失败压缩成不透明字符串。Provider 包仍然拥有传输行为与产物，这些共享 host value 不会把
provider 包退化成 feature flag。

## 规范角色 Options

所有 SDK 公开同一套与 transport 无关的 options 模型。语言可以调整大小写、builder 与构造语法，但不得
增加、遗漏或重新解释字段。

`ClientSessionOptions` 是建立 session 时统一使用的 host model。多数成员被规范化为
`SESSION_OPEN`，两个例外在下文单独说明。

| 字段                           |                  默认值 | 含义                                                              |
| ------------------------------ | ----------------------: | ----------------------------------------------------------------- |
| `requested_session_id`         |                     `0` | 期望的 wire session id；零表示由服务端分配。                      |
| `profile_id`                   |      标准 token profile | 请求的 profile registry id。                                      |
| `schema_id` / `schema_version` | 标准 token delta schema | 请求的 schema 身份。                                              |
| `priority_class`               |              `balanced` | Session 调度类别。                                                |
| `default_deadline_ms`          |                   `500` | 默认 operation deadline。                                         |
| `max_in_flight_operations`     |                     `4` | 请求的 session 并发上限。                                         |
| `lease_ttl_hint_ms`            |                 `30000` | 请求的 cache lease 生命周期。                                     |
| `allow_resume`                 |                 `false` | 是否启用可恢复 session 协商。                                     |
| `resume_token_bytes`           |                     `0` | 本地可接受的 recovery token 字节上限；零表示使用 runtime 默认值。 |
| `cache_hints`                  |                      空 | 合并到连接自动发送的 `CLIENT_HELLO` 的 cache object kind。        |

Runtime 派生 `session_flags`、认证与扩展字节长度以及 client session tag；应用不构造这些 wire 字段。
新建 session 时，`resume_token_bytes` 不会复制到 wire 的 `SESSION_OPEN.resume_token_bytes`：wire
字段表示实际 runtime-issued token 的长度，仅在恢复 session 时非零。`cache_hints` 同样不是
SESSION_OPEN 字段，而是在第一个 session 建立前参与派生 `CLIENT_HELLO.cache_object_bitmap`。

`ServerSessionOptions` 冻结 `supported_profiles`、`supported_cache_objects`、cache object
与字节上限、 `schema_registry`、resume token 容量、in-flight 与 granted credit 上限、lease 与 resume
window 以及 `application_policy`。默认值对应标准 token profile：四个 in-flight operation、两个
granted credit、 30 秒 lease 与 120 秒 resume window。默认 policy 接受所有 wire 合法的 session。

Client 与 server bootstrap options 包含应用端点、有序 provider route、transport policy 及对应的
session defaults。`ServerAcceptOptions` 只包含 accept timeout。Connection、session、server handle 或
generation 都是 FFI 实现细节，不得出现在应用 options。Cadence、quality tier 与应用 metadata 属于
profile 或 `SESSION_PATCH`，不得改变 `SESSION_OPEN`。

## Schema Registry Host API

所有 SDK 都把继承自 NNRP/1 的 schema registry 公开为应用侧 host object，而不是 FFI handle。
`SchemaDescriptorHeader` 是规范的 32-byte descriptor。Registry 提供 `install`、`lookup`、
`invalidate`、`validate_binding` 与 `snapshot`；action 和 failure 使用闭合的 `SchemaRegistryAction`
与 `SchemaRegistryFailure` registry。Profile 私有 schema body 不进入公共 descriptor。

## 角色接口与结果

客户端和服务端角色 API 都按 session 内 wire 顺序接收 runtime event。Runtime-event 注册表中的接收方
布尔值同时确定另一角色是允许发送方。每个角色必须通过符合习惯的类型化方法或类型化通用 runtime-frame
方法覆盖全部允许发送的消息；只接受裸 message code 且不校验 metadata 的入口不属于应用 API。

应用侧 `NnrpResult` 持有非零 operation 标识、规范 `ResultTerminalState` 和一个闭合的 `TerminalEvent`
variant。Runtime variant 完整保留 wire header、类型化 metadata 与语义化 tail； lifecycle variant
保留不带 header 的原始本地 operation event。SDK 禁止把任一 variant 压平成私有 payload
或字符串字典，也不得公开 nullable 的并行 event 字段或伪造 wire header。

每个角色还必须公开不可变的 connection 与 session lifecycle snapshot。Connection state 只能是
`open`、`closing`、`closed`；session state 只能是 `open`、`resumed`、`closing`、`draining`、
`closed`。Session snapshot 保留协商后的 profile、priority、schema、in-flight 上限、route scope、
last operation 与 session error code。SDK 本地 state machine 可以负责状态迁移，但不得公开更小或
语义名称不同的状态 registry。

角色 API 会自动完成连接握手。Client 在第一个 `SESSION_OPEN` 前只发送一次 `CLIENT_HELLO` 并校验
`SERVER_HELLO_ACK`；server 完成同一组校验后才接收 session open。应用不能注入或绕过这些握手记录。

一个逻辑 client connection 可以并发持有多个 session，调用 `open_session` 不会消耗 client
connection。一个逻辑 server 持有已安装 provider 的 listener 集合并可接收多个 session，其中包括
在同一条已接收 carrier 上多路复用的多个 session。应用端点始终使用 `nnrp://` 或
`nnrps://`；`tcp://`、`quic://`、 `unix://`、`npipe://`、`ws://` 与 `wss://` 都只是 provider 本地
locator，不能替代应用端点。

### 客户端事件泵

每个 client session 都公开一个规范事件接收操作，并返回闭合的 `ClientEvent` 联合类型。`runtime`
variant 持有完整 wire `RuntimeEvent`；`lifecycle` variant 持有一个不带 header 的本地
`OperationLifecycleEvent`。两者恰好只有一个处于 active 状态。SDK 不得把 lifecycle variant 压平为
伪造的 runtime frame，也不得公开 nullable 的并行字段。

机器契约把该操作命名为 `client_session.next_event`。Rust 投影为 `await_event`，Python 投影为
`next_event`，JavaScript 投影为 `nextEvent`，C# 投影为 `NextEventAsync`。只返回 result 的便利接口
可以保留并跳过无关事件，但不得丢弃或重排它们。

### 服务端事件泵

每个 server session 都只有一个规范的、不过滤事件的接收操作，返回闭合的 `ServerEvent` 联合类型：

| Variant     | 值                        | 含义                                                       |
| ----------- | ------------------------- | ---------------------------------------------------------- |
| `submit`    | `ServerOperation`         | 一个已接收的 `FRAME_SUBMIT` 及仍然有效的回复能力。         |
| `runtime`   | `RuntimeEvent`            | 发给 server role 的任意非 submit wire event。              |
| `lifecycle` | `OperationLifecycleEvent` | Native role carrier 产生的不带 header 的本地生命周期证据。 |

`ServerOperation` 持有完整的 submit `RuntimeEvent`；它的 operation 与 frame 标识必须分别匹配 event
metadata 和 header。应用消费规范事件泵时，不会把 submit 与发送 progress、partial result、 一个终态
result 或一个终态 drop 所需的能力拆开。

机器契约把这一语义操作命名为 `server_session.next_event`。Rust 投影为 `await_event`，Python 投影为
`next_event`，JavaScript 投影为 `receive`，C# 投影为 `NextEventAsync`。这些只是同一操作的语言惯用
命名，不代表不同语义。

`server_session.receive_submit` 只是一种选择性便利接口。它在等待 submit 时如果观察到其他事件，
必须把这些事件保留在同一个 session queue 中，供后续 `next_event` 交付；不得丢弃、解码后遗忘、
提前确认或重新分类。一个 session 必须串行化所有接收调用，避免便利接口与规范事件泵竞争 native queue。

## Session 恢复票据

所有 SDK 都通过同一个不透明 `SessionRecoveryTicket` value 提供恢复能力。可恢复 session 被接受后，
runtime 生成票据，`client_session.recovery_ticket()`
在票据可用时返回它。应用可以持久化票据，并在之后原样传给
`client.resume_session(ticket, options)`，但不得构造或修改 token 字节。

票据包含非零 session id、不为空的不透明 resume token、可选的最后确认 operation id，以及协商后的
resume window。服务端保存并校验实际 token。因此，即便启用了恢复能力，新建 session 也不会携带 token
body；恢复 session 才携带 runtime 生成的 token 及其精确字节长度。无效、截断、过期或未知票据必须被
拒绝，不能退化成新建 session。

SDK 只能通过规范的 `NRTK` version 1 envelope 持久化该 value，各语言以惯用命名提供
`ticket.to_bytes()` 与 `SessionRecoveryTicket.from_bytes(...)`。该 envelope 使用小端序，由 28-byte
固定前缀和长度精确匹配的 resume token 组成：`"NRTK"`、`version:u16`、`flags:u16`、
`session_id:u32`、`resume_token_bytes:u32`、`resume_window_ms:u32` 以及
`resume_from_operation_id:u64`。flag bit 0 表示 operation id 存在，其余 flag bit
必须为零。解码器必须拒绝错误 magic 或 version、零 session id、空 token、保留
flags、截断数据及尾随数据。该格式只是 host 持久化 envelope，不是 NNRP wire
message，也不是留给应用扩展的接口。

## 发布门禁

Preview 4 SDK 只有同时满足以下条件才允许发布：

1. 公共 API 投影与机器可读契约一致。
2. Native 与 WebSocket 事件路径保留相同的帧头和尾部语义。
3. Profile builder 不增加额外 FFI 往返，并生成符合 wire 规范的 metadata。
4. 当前数据面记录与机器契约的精确长度、offset 和 canonical bytes 一致。
5. Wire 一致性与公共 API 对等性都通过；两者不能互相替代。
6. 公共 API 不保留任何旧 Preview 兼容 shim。
7. 所有类型引用、metadata 联合分支、枚举值、角色方向和语言投影均通过机器契约闭包检查。
8. Cache host 与 provider selection 的公开 value 符合同一语义契约；语言专属便利封装不得替代或
   截断这些 value。
9. Client、server、session、schema registry 与 admission policy host API 符合规范的 options 和
   method 契约，包括默认值与只能内部使用的字段。
