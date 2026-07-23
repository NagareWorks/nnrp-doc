# 运行时控制与对象

Python Preview 4 API 固定 Rust core 已发布的运行时控制、对象引用和 WebSocket 二进制帧语义。后续
SDK 实现必须保持这里的函数名和字段名，不再用实现完成后回填文档的方式调整公开接口。

## 导入

```python
from nnrp import MessageType
from nnrp.runtime import (
    decode_runtime_control_metadata,
    decode_runtime_object_metadata,
    decode_websocket_binary_frame,
    decode_websocket_binary_frame_batch,
    encode_runtime_control_metadata,
    encode_runtime_object_metadata,
    encode_websocket_binary_frame,
)
from nnrp.runtime.types import ProgressMetadata, RuntimeFrameHeader
```

## `encode_runtime_control_metadata`

编码一个 Preview 4 控制面 metadata。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `message_type` | [`MessageType`](./enums.md#messagetypeintenum) | 是 | `CANCEL`、`ABORT`、`PRIORITY_UPDATE`、`DEADLINE`、`EXPIRE_AT`、`SUPERSEDE`、`BUDGET_UPDATE`、`PROGRESS`、`PARTIAL_RESULT`、`BACKPRESSURE`、`CREDIT_UPDATE`、`CAPABILITY_NEGOTIATION`、`DEGRADE_PROFILE`、`ROUTE_HINT`、`EXECUTION_HINT`、`TRACE_CONTEXT`、`RESULT_DROP_REASON`、`ERROR_RECOVERABLE` 或 `RETRY_AFTER`。 |
| `metadata` | [运行时控制 metadata](#运行时控制-metadata) | 是 | 与 `message_type` 匹配的数据结构。 |
| `tail` | `bytes` | 否 | 扩展字节、诊断字节、进度 body 或 partial result body。 |

| 返回 |
|---|
| `bytes` |

```python
payload = encode_runtime_control_metadata(
    MessageType.PROGRESS,
    ProgressMetadata(operation_id=42, progress_sequence=1, stage_code=2, percent_x100=2500, object_id=0, body_bytes=0),
)
```

## `decode_runtime_control_metadata`

解码一个 Preview 4 控制面 metadata payload。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `message_type` | [`MessageType`](./enums.md#messagetypeintenum) | 是 | 决定 metadata 布局的消息类型。 |
| `payload` | `bytes` | 是 | metadata 字节和声明的 tail。 |

| 返回 |
|---|
| `DecodedRuntimeControlMetadata`，包含 `metadata` 和 `tail` |

## `encode_runtime_object_metadata`

编码对象、对象引用、对象增量、缓存引用和缓存 miss metadata。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `message_type` | [`MessageType`](./enums.md#messagetypeintenum) | 是 | `OBJECT_DECLARE`、`OBJECT_REF`、`OBJECT_RELEASE`、`OBJECT_PATCH`、`OBJECT_DELTA`、`CACHE_REFERENCE` 或 `CACHE_MISS`。 |
| `metadata` | [运行时对象 metadata](#运行时对象-metadata) | 是 | 与 `message_type` 匹配的数据结构。 |
| `tail` | `bytes` | 否 | 扩展字节、诊断字节或 delta payload。 |

| 返回 |
|---|
| `bytes` |

## `decode_runtime_object_metadata`

解码一个运行时对象或缓存 metadata payload。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `message_type` | [`MessageType`](./enums.md#messagetypeintenum) | 是 | 决定 metadata 布局的消息类型。 |
| `payload` | `bytes` | 是 | metadata 字节和声明的 tail。 |

| 返回 |
|---|
| `DecodedRuntimeObjectMetadata`，包含 `metadata` 和 `tail` |

## 高层 Runtime Frame 契约

上面的 codec 函数属于高级协议 helper。普通应用通过 `NativeRuntimeSession` 或
`NativeRuntimeServerSession` 上的具名方法发送 Preview4 frame，不需要自行编码 payload、选择
message type 或调用 `control()`。

SDK 在这些具名方法内部校验 metadata 与 message 的配对关系、编码完整 payload，并只执行一次
粗粒度 native 调用。这个与角色无关的 frame-send 原语属于内部 binding 边界，不属于公开
session API。协议扩展应增加 typed metadata model 和具名 SDK 方法，而不是向应用暴露原始
frame 构造能力。

## `NativeRuntimeFrameEvent`

Runtime-frame polling 返回已经解码的 `NativeRuntimeFrameEvent`，而不是原始 control code 和
byte buffer。冻结字段为 `type`、`message_type`、`metadata`、`body`、`diagnostic`、
`metadata_body`、`delta`、`connection`、`session`、`operation`、`frame_id` 和
`native_diagnostic`。不适用于当前消息的 byte 字段为 `b""`。

`type` 使用 JavaScript runtime event 表中的 kebab-case 名称；`metadata` 是匹配消息类型的
typed metadata。Object patch 和 delta event 把 tail 拆成 `metadata_body` 与 `delta`；其他
声明 tail 以 `body` 或 `diagnostic` 暴露。Binding 返回 event 前必须复制并释放 native owned
payload。

`NativeRuntimeEvent.to_runtime_frame()` 对 Preview4 runtime frame 返回
`NativeRuntimeFrameEvent`，对 submit/result/lifecycle event 返回 `None`。
Rust ABI 的 role event 以 session 为作用域，因此
`NativeRuntimeSession.poll_runtime_frames()` 和 `iter_runtime_frames()` 跳过非 runtime event，
直接返回解码后的类型。Client connection 不提供 connection-wide event pump，因为存在多个
session 时无法保持无歧义的事件所有权。

## `encode_websocket_binary_frame`

构造 WebSocket 传输层使用的二进制帧。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `header` | [`RuntimeFrameHeader`](#runtimeframeheader) | 是 | 除 `meta_len` 和 `body_len` 之外的 header 字段；函数从 buffer 长度推导这两个值。 |
| `metadata` | `bytes` | 否 | metadata payload。 |
| `body` | `bytes` | 否 | body payload。 |

| 返回 |
|---|
| `bytes` |

## `decode_websocket_binary_frame`

拆分一个 WebSocket 二进制帧。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `frame` | `bytes` | 是 | 一个完整 WebSocket binary message。 |

| 返回 |
|---|
| `DecodedRuntimeFrame` |

## `decode_websocket_binary_frame_batch`

解码本地 buffer 或测试夹具里的连续二进制帧。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `batch` | `bytes` | 是 | 连续帧。 |
| `limit` | `int` | 否 | 最大解码帧数；`0` 表示不限制。 |

| 返回 |
|---|
| `list[DecodedRuntimeFrame]` |

## 运行时控制 Metadata

| 类型 | 消息类型 | 冻结字段 |
|---|---|---|
| `ControlRequestMetadata` | `CANCEL`, `ABORT` | `operation_id`, `control_sequence`, `reason_code`, `source_role`, `flags`, `diagnostic_bytes` |
| `SchedulingMetadata` | `PRIORITY_UPDATE`, `DEADLINE`, `EXPIRE_AT` | `operation_id`, `control_sequence`, `priority_class`, `priority_delta`, `deadline_unix_ms`, `flags` |
| `SupersedeMetadata` | `SUPERSEDE` | `old_operation_id`, `new_operation_id`, `control_sequence`, `drop_reason_code`, `flags`, `diagnostic_bytes` |
| `BudgetMetadata` | `BUDGET_UPDATE` | `operation_id`, `compute_budget_units`, `memory_budget_bytes`, `bandwidth_budget_bytes`, `token_budget`, `flags` |
| `ProgressMetadata` | `PROGRESS` | `operation_id`, `progress_sequence`, `stage_code`, `percent_x100`, `object_id`, `body_bytes` |
| `PartialResultMetadata` | `PARTIAL_RESULT` | `operation_id`, `result_sequence`, `object_id`, `delta_sequence`, `body_bytes`, `flags` |
| `PressureMetadata` | `BACKPRESSURE`, `CREDIT_UPDATE` | `scope_id`, `credit_window`, `pressure_level`, `pressure_reason`, `retry_after_ms`, `flags` |
| `CapabilityMetadata` | `CAPABILITY_NEGOTIATION`, `DEGRADE_PROFILE` | `profile_id`, `capability_count`, `cost_model_id`, `preference_rank`, `limit_bytes`, `limit_units`, `body_bytes`, `flags` |
| `RouteHintMetadata` | `ROUTE_HINT`, `EXECUTION_HINT` | `operation_id`, `route_id`, `executor_class`, `affinity_class`, `deadline_unix_ms`, `body_bytes`, `flags` |
| `TraceContextMetadata` | `TRACE_CONTEXT` | `trace_id`, `span_id`, `parent_span_id`, `stage_code`, `flags`, `body_bytes` |
| `ResultDropReasonMetadata` | `RESULT_DROP_REASON` | `operation_id`, `result_sequence`, `drop_reason_code`, `source_role`, `flags`, `diagnostic_bytes` |
| `RecoverableErrorMetadata` | `ERROR_RECOVERABLE` | `error_code`, `error_scope`, `recovery_action`, `source_role`, `flags`, `retry_after_ms`, `related_session_id`, `related_frame_id`, `related_view_id`, `diagnostic_bytes` |
| `RetryAfterMetadata` | `RETRY_AFTER` | `scope_id`, `control_sequence`, `retry_after_ms`, `jitter_ms`, `reason_code`, `source_role`, `flags`, `diagnostic_bytes` |

## 运行时对象 Metadata

| 类型 | 消息类型 | 冻结字段 |
|---|---|---|
| `ObjectDescriptorMetadata` | `OBJECT_DECLARE` | `object_id`, `object_kind`, `producer_role`, `consumer_role`, `session_id`, `byte_size`, `compute_cost_units`, `memory_location_hint`, `ownership_hint`, `lifetime_hint_ms`, `metadata_bytes` |
| `ObjectReferenceMetadata` | `OBJECT_REF` | `object_id`, `operation_id`, `object_version`, `offset`, `length`, `flags`, `metadata_bytes` |
| `ObjectReleaseMetadata` | `OBJECT_RELEASE` | `object_id`, `operation_id`, `release_reason`, `source_role`, `flags`, `diagnostic_bytes` |
| `ObjectDeltaMetadata` | `OBJECT_PATCH`, `OBJECT_DELTA` | `object_id`, `delta_sequence`, `region_offset`, `region_bytes`, `delta_bytes`, `flags`, `metadata_bytes` |
| `CacheReferenceMetadata` | `CACHE_REFERENCE` | `cache_namespace`, `cache_key_hi`, `cache_key_lo`, `profile_id`, `reuse_scope`, `lease_id`, `producer_trace_id`, `expiration_hint_ms`, `metadata_bytes`, `flags` |
| `CacheMissMetadata` | `CACHE_MISS` | `cache_namespace`, `cache_key_hi`, `cache_key_lo`, `miss_reason`, `profile_id`, `diagnostic_bytes` |

## 本地缓存租约状态

`CacheLeaseDescriptor` 是已经授予租约的 Python 本地校验值，不是 wire payload，也不是 native handle。

| Python 字段 | 类型 | 协议字段 |
|---|---|---|
| `identity` | `CacheObjectIdentity` | `object_id` |
| `object_version` | `int`（`u64`） | `object_version` |
| `lease_id` | `int`（`u64`） | `lease_id` |
| `owner_scope` | `CacheLeaseOwnerScope` | `owner_scope` |
| `owner_id` | `int`（`u64`） | `owner_id` |
| `granted_at_ms` | `int`（`u64`） | `granted_at_ms` |
| `ttl_ms` | `int`（`u32`） | `ttl_ms` |

`CacheObjectIdentity` 包含 `cache_namespace: int`（`u32`）、`cache_key_hi: int`（`u64`）、
`cache_key_lo: int`（`u64`）和 `object_kind: CacheObjectKind`（`u32`）。
`CacheLeaseOwnerScope` 的取值为 `CONNECTION = 0`、`SESSION = 1` 或 `OPERATION = 2`。
本地校验应使用 `expires_at_ms`、`is_expired` 和 `validate_version`。

## `CachePolicyOptions`

`CachePolicyOptions` 是本地显式启用值，不会执行隐式查询或自动发送帧。

| Python 字段 | 类型 | 默认值 |
| --- | --- | --- |
| `enabled` | `bool` | `False` |
| `reuse_scope` | `CacheReuseScope | None` | `None` |
| `expiration_hint_ms` | `int` (`u64`) | `0` |
| `invalidation_reason` | `CacheInvalidationReason` | `EXPLICIT` |

`CacheInvalidationReason` 包含 `EXPLICIT`、`DEPENDENCY_INVALIDATED`、`LEASE_EXPIRED`、
`VERSION_MISMATCH` 和 `SCHEMA_MISMATCH`。启用时必须提供 `reuse_scope`；禁用时要求
`reuse_scope is None` 且 `expiration_hint_ms == 0`。

## 运行时枚举

| 枚举 | 成员 |
|---|---|
| `RuntimeObjectKind` | `UNSPECIFIED`, `TENSOR`, `TOKEN_BLOCK`, `IMAGE_TILE`, `FEATURE_MAP`, `TOOL_RESULT`, `TRACE_SEGMENT`, `OPAQUE_BYTES`, `DOCUMENT_CHUNK`, `AUDIO_CHUNK`, `VIDEO_CHUNK`, `ROUTE_PLAN`, `CACHE_MANIFEST` |
| `RuntimeRole` | `UNSPECIFIED`, `CLIENT`, `SERVER`, `RUNTIME`, `SUBAGENT`, `TOOL`, `SCHEDULER`, `CONFORMANCE_RUNNER` |
| `MemoryLocationHint` | `UNSPECIFIED`, `HOST_MEMORY`, `DEVICE_MEMORY`, `SHARED_MEMORY`, `REMOTE_MEMORY`, `MMAP_FILE`, `OBJECT_STORE` |
| `OwnershipHint` | `UNSPECIFIED`, `PRODUCER_OWNED`, `CONSUMER_OWNED`, `SESSION_OWNED`, `BORROWED`, `TRANSFER_ON_REF`, `RELEASE_ON_DROP` |
| `ObjectReleaseReason` | `COMPLETED`, `CANCELLED`, `EXPIRED`, `REPLACED`, `INVALIDATED`, `OWNER_CLOSED`, `LEASE_EXPIRED`, `CONFORMANCE_INJECTION` |
| `CacheReuseScope` | `OPERATION`, `SESSION`, `CONNECTION`, `GLOBAL`, `TENANT`, `PROFILE` |
| `CacheMissReason` | `UNKNOWN`, `NOT_FOUND`, `EXPIRED`, `INVALIDATED`, `SCHEMA_MISMATCH`, `PRODUCER_UNAVAILABLE`, `LEASE_REQUIRED`, `PERMISSION_DENIED` |

## `RuntimeFrameHeader`

| 字段 | 类型 | 说明 |
|---|---|---|
| `message_type` | [`MessageType`](./enums.md#messagetypeintenum) | 帧消息类型。 |
| `flags` | [`HeaderFlags`](./enums.md#headerflagsintflag) | Header flags。 |
| `session_id` | `int` | Session id。 |
| `generation` | `int` | Session generation。 |
| `frame_id` | `int` | Frame id。 |
