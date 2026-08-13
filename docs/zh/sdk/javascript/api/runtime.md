# 运行时控制与对象

JavaScript/TypeScript Preview 4 API 公开运行时控制、对象引用 codec 与 typed runtime event。WebSocket
packet framing 保持在 WebSocket Provider 内部，不作为应用层公开 helper。运行时无关 helper 位于
`@nnrp/core`；浏览器包可以通过 `@nnrp/browser-client` 使用 WASM 支撑的
helper；后端包通过角色包和传输包接入 native
能力。传输包必须维护自己的传输行为，不只是隐藏实现上的配置开关。

## 导入

```ts
import {
  decodeCacheInvalidateMetadata,
  decodeFlowUpdateMetadata,
  decodeFrameSubmitMetadata,
  decodeResultHintMetadata,
  decodeRuntimeControlMetadata,
  decodeRuntimeObjectMetadata,
  encodeCacheInvalidateMetadata,
  encodeFlowUpdateMetadata,
  encodeFrameSubmitMetadata,
  encodeResultHintMetadata,
  encodeRuntimeControlMetadata,
  encodeRuntimeObjectMetadata,
  encodeRuntimeObjectMetadataSegments,
  NnrpMessageType,
} from "@nnrp/core";
```

## 基线 Metadata Codec

`@nnrp/core` 为 Preview 4 角色 API 和公开一致性测试套件使用的每一种已冻结 NNRP/1 基线 metadata
类型提供精确宽度 codec。每个 encoder 接受对应 metadata 类型并返回 `Uint8Array`；每个 decoder 接受
`Uint8Array` 并返回同一种 metadata 类型。Decoder 必须拒绝错误长度、非零保留字段、 非法枚举值和非法
flag 组合。

| Metadata 类型               | Encoder                           | Decoder                           |
| --------------------------- | --------------------------------- | --------------------------------- |
| `ClientHelloMetadata`       | `encodeClientHelloMetadata`       | `decodeClientHelloMetadata`       |
| `SessionPatchAckMetadata`   | `encodeSessionPatchAckMetadata`   | `decodeSessionPatchAckMetadata`   |
| `NnrpFlowUpdateMetadata`    | `encodeFlowUpdateMetadata`        | `decodeFlowUpdateMetadata`        |
| `NnrpResultHintMetadata`    | `encodeResultHintMetadata`        | `decodeResultHintMetadata`        |
| `NnrpFrameSubmitMetadata`   | `encodeFrameSubmitMetadata`       | `decodeFrameSubmitMetadata`       |
| `NnrpResultPushMetadata`    | `encodeResultPushMetadata`        | `decodeResultPushMetadata`        |
| `CachePutMetadata`          | `encodeCachePutMetadata`          | `decodeCachePutMetadata`          |
| `CacheAckMetadata`          | `encodeCacheAckMetadata`          | `decodeCacheAckMetadata`          |
| `CacheInvalidateMetadata`   | `encodeCacheInvalidateMetadata`   | `decodeCacheInvalidateMetadata`   |
| `TransportProbeMetadata`    | `encodeTransportProbeMetadata`    | `decodeTransportProbeMetadata`    |
| `TransportProbeAckMetadata` | `encodeTransportProbeAckMetadata` | `decodeTransportProbeAckMetadata` |
| `NnrpObjectReferenceBlock`  | `encodeObjectReferenceBlock`      | `decodeObjectReferenceBlock`      |

Packet 级一致性测试把这些 metadata codec 与 native/WASM runtime 拥有的 common-header framing
组合起来，不会定义第二套 JavaScript wire 实现。

## `encodeRuntimeControlMetadata`

编码一个 Preview 4 控制面 metadata。

| 参数          | 类型                                        | 必填 | 说明                                                   |
| ------------- | ------------------------------------------- | ---: | ------------------------------------------------------ |
| `messageType` | [`NnrpMessageType`](#nnrpmessagetype)       |   是 | Preview 4 控制消息类型。                               |
| `metadata`    | [运行时控制 metadata](#运行时控制-metadata) |   是 | 与 `messageType` 匹配的数据结构。                      |
| `tail`        | `Uint8Array`                                |   否 | 扩展字节、诊断字节、进度 body 或 partial result body。 |

| 返回         |
| ------------ |
| `Uint8Array` |

```ts
const payload = encodeRuntimeControlMetadata(NnrpMessageType.Progress, {
  operationId: 42n,
  progressSequence: 1n,
  stageCode: 2,
  percentX100: 2500,
  objectId: 0n,
  bodyBytes: 0,
});
```

## `decodeRuntimeControlMetadata`

解码一个控制面 metadata payload。

| 参数          | 类型                                  | 必填 | 说明                           |
| ------------- | ------------------------------------- | ---: | ------------------------------ |
| `messageType` | [`NnrpMessageType`](#nnrpmessagetype) |   是 | 决定 metadata 布局的消息类型。 |
| `payload`     | `Uint8Array`                          |   是 | metadata 字节和声明的 tail。   |

| 返回                            |
| ------------------------------- |
| `DecodedRuntimeControlMetadata` |

`DecodedRuntimeControlMetadata` 包含两个只读字段：

| 字段       | 类型                     | 说明                                         |
| ---------- | ------------------------ | -------------------------------------------- |
| `metadata` | `RuntimeControlMetadata` | 由 `messageType` 选择的 metadata 对象。      |
| `tail`     | `Uint8Array`             | 已声明诊断、body 或扩展 payload 的独立副本。 |

## `encodeRuntimeObjectMetadata`

编码对象、对象引用、对象增量、缓存引用和缓存 miss metadata。

| 参数          | 类型                                        | 必填 | 说明                                                                                                           |
| ------------- | ------------------------------------------- | ---: | -------------------------------------------------------------------------------------------------------------- |
| `messageType` | [`NnrpMessageType`](#nnrpmessagetype)       |   是 | `ObjectDeclare`、`ObjectRef`、`ObjectRelease`、`ObjectPatch`、`ObjectDelta`、`CacheReference` 或 `CacheMiss`。 |
| `metadata`    | [运行时对象 metadata](#运行时对象-metadata) |   是 | 与 `messageType` 匹配的数据结构。                                                                              |
| `tail`        | `Uint8Array`                                |   否 | 扩展字节、诊断字节或 delta payload。                                                                           |

| 返回         |
| ------------ |
| `Uint8Array` |

## `encodeRuntimeObjectMetadataSegments`

把运行时对象 metadata 与有序 tail segment 直接编码到一个独立 payload。对象 metadata 与大块 delta
分开提供时，该 helper 不需要先构造中间拼接缓冲区。

| 参数           | 类型                                        | 必填 | 说明                                                                                           |
| -------------- | ------------------------------------------- | ---: | ---------------------------------------------------------------------------------------------- |
| `messageType`  | [`NnrpMessageType`](#nnrpmessagetype)       |   是 | [`encodeRuntimeObjectMetadata`](#encoderuntimeobjectmetadata) 接受的运行时对象或缓存消息类型。 |
| `metadata`     | [运行时对象 metadata](#运行时对象-metadata) |   是 | 与 `messageType` 匹配；声明的 tail 长度应用于所有 segment 的长度总和。                         |
| `tailSegments` | `readonly Uint8Array[]`                     |   是 | 按 wire 顺序排列的 tail segment；每段直接复制到返回的独立 payload。                            |

| 返回         |
| ------------ |
| `Uint8Array` |

`ObjectPatch` 与 `ObjectDelta` 必须传 `[metadataBody, delta]`。即使其中一段为空，segment
顺序仍有语义。

## `decodeRuntimeObjectMetadata`

解码一个运行时对象或缓存 metadata payload。

| 参数          | 类型                                  | 必填 | 说明                           |
| ------------- | ------------------------------------- | ---: | ------------------------------ |
| `messageType` | [`NnrpMessageType`](#nnrpmessagetype) |   是 | 决定 metadata 布局的消息类型。 |
| `payload`     | `Uint8Array`                          |   是 | metadata 字节和声明的 tail。   |

| 返回                           |
| ------------------------------ |
| `DecodedRuntimeObjectMetadata` |

## 基线缓存失效

Preview4 复用已有的 NNRP/1 `CacheInvalidate` frame，不再定义第二种 runtime invalidation message。

| API                             | 参数                      | 返回值                    |
| ------------------------------- | ------------------------- | ------------------------- |
| `encodeCacheInvalidateMetadata` | `CacheInvalidateMetadata` | `Uint8Array`              |
| `decodeCacheInvalidateMetadata` | `Uint8Array`              | `CacheInvalidateMetadata` |

`CacheInvalidateMetadata` 的冻结字段为 `invalidateScope`、`cacheNamespace`、`cacheKeyHi`、
`cacheKeyLo`、`reasonCode`。`cacheNamespace` 类型为 `number`，两个 key word 类型均为 `bigint`。
`CachePutMetadata`、`CacheAckMetadata` 和 `ObjectReferenceBlock` 使用相同身份字段宽度。

### 本地缓存租约状态

`CacheLease` 是已经授予租约的 TypeScript 本地校验值，不是 wire payload，也不是 native/WASM handle。

| TypeScript 字段   | 类型                   | 协议字段         |
| ----------------- | ---------------------- | ---------------- |
| `objectId`        | `CacheObjectId`        | `object_id`      |
| `objectVersion`   | `bigint`               | `object_version` |
| `leaseId`         | `bigint`               | `lease_id`       |
| `ownerScope`      | `CacheLeaseOwnerScope` | `owner_scope`    |
| `ownerId`         | `bigint`               | `owner_id`       |
| `grantedAtMillis` | `bigint`               | `granted_at_ms`  |
| `ttlMillis`       | `number`（`u32`）      | `ttl_ms`         |

`CacheObjectId` 包含 `cacheNamespace: number`（`u32`）、`cacheKeyHi: bigint`、`cacheKeyLo: bigint`
和 `objectKind: NnrpCacheObjectKind`（`u32`）。`CacheLeaseOwnerScope` 的取值为
`Connection = 0`、`Session = 1` 或 `Operation = 2`。本地校验应使用 `expiresAtMillis`、`isExpiredAt`
和 `validateVersion`。

## 高层 Runtime Frame 契约

应用通过 client 或 server session 方法发送 Preview4 控制帧、运行时对象和缓存帧，不需要自行构造
native request、选择 ABI 符号或拼接 metadata buffer。SDK 校验并编码 typed 参数后，每个 session
方法只执行一次粗粒度 runtime 调用。

内部 native/WASM binding 方法冻结为：

```ts
sendRuntimeFrame(request: NnrpRuntimeFrameSendRequest): void | Promise<void>;
```

`NnrpRuntimeFrameSendRequest` 的 readonly 字段为 `sessionOptions`、`messageType`、`frameId` 和
`payload`。`payload` 是完整编码后的 metadata 与声明 tail。它属于内部 binding 契约；应用使用 client
和 server 页面记录的具名 session 方法。

## `NnrpRuntimeEvent`

每个入站 role event 都解码为一个包含完整 wire header 和两个闭合 tagged union 的 envelope。应用通过
`event.metadata.type` 与 `event.tail.type` 做判别；已删除的扁平 `NnrpRuntimeFrameEvent.type` 不属于
Preview4 API。

```ts
interface NnrpRuntimeEvent {
  readonly header: NnrpRuntimeFrameHeader;
  readonly metadata: NnrpRuntimeEventMetadata;
  readonly tail: NnrpRuntimeEventTail;
}
```

`NnrpRuntimeEventMetadata` 与 `NnrpRuntimeEventTail` 都是闭合 tagged union；下方穷举表根据
`header.messageType` 唯一确定两个 union 的 variant。

`NnrpRuntimeFrameHeader` 完整保留 `versionMajor`、`wireFormat`、`messageType`、`flags`、
`sessionId`、`frameId`、`viewId`、`routeId` 和 `traceId`。本地 lifecycle 通知没有 wire
header，因此保持为 `NnrpOperationLifecycleEvent`；SDK 不会伪造全零 header。

下表是穷举映射。消息类型在 event 交付给应用前确定唯一 metadata variant 和 tail variant。

| 消息                                      | `metadata.type`      | Metadata 值                | `tail.type`               |
| ----------------------------------------- | -------------------- | -------------------------- | ------------------------- |
| `SessionClose`                            | `session_close`      | `NnrpSessionCloseMetadata` | `none`                    |
| `FrameSubmit`                             | `frame_submit`       | `NnrpFrameSubmitMetadata`  | `body`                    |
| `FrameCancel`、`ResultDrop`               | `none`               | 无                         | `none`                    |
| `ResultPush`                              | `result_push`        | `NnrpResultPushMetadata`   | `body`                    |
| `ResultHint`                              | `result_hint`        | `NnrpResultHintMetadata`   | `none`                    |
| `FlowUpdate`                              | `flow_update`        | `NnrpFlowUpdateMetadata`   | `none`                    |
| `Cancel`、`Abort`                         | `control_request`    | `ControlRequestMetadata`   | `diagnostic`              |
| `PriorityUpdate`、`Deadline`、`ExpireAt`  | `scheduling`         | `SchedulingMetadata`       | `none`                    |
| `Supersede`                               | `supersede`          | `SupersedeMetadata`        | `diagnostic`              |
| `BudgetUpdate`                            | `budget`             | `BudgetMetadata`           | `none`                    |
| `Progress`                                | `progress`           | `ProgressMetadata`         | `body`                    |
| `PartialResult`                           | `partial_result`     | `PartialResultMetadata`    | `body`                    |
| `Backpressure`、`CreditUpdate`            | `pressure`           | `PressureMetadata`         | `none`                    |
| `CapabilityNegotiation`、`DegradeProfile` | `capability`         | `CapabilityMetadata`       | `body`                    |
| `RouteHint`、`ExecutionHint`              | `route_hint`         | `RouteHintMetadata`        | `body`                    |
| `TraceContext`                            | `trace_context`      | `TraceContextMetadata`     | `body`                    |
| `ResultDropReason`                        | `result_drop_reason` | `ResultDropReasonMetadata` | `diagnostic`              |
| `ErrorRecoverable`                        | `recoverable_error`  | `RecoverableErrorMetadata` | `diagnostic`              |
| `RetryAfter`                              | `retry_after`        | `RetryAfterMetadata`       | `diagnostic`              |
| `ObjectDeclare`                           | `object_descriptor`  | `ObjectDescriptorMetadata` | `body`                    |
| `ObjectRef`                               | `object_reference`   | `ObjectReferenceMetadata`  | `body`                    |
| `ObjectRelease`                           | `object_release`     | `ObjectReleaseMetadata`    | `diagnostic`              |
| `ObjectPatch`、`ObjectDelta`              | `object_delta`       | `ObjectDeltaMetadata`      | `metadata_body_and_delta` |
| `CacheReference`                          | `cache_reference`    | `CacheReferenceMetadata`   | `body`                    |
| `CacheMiss`                               | `cache_miss`         | `CacheMissMetadata`        | `diagnostic`              |
| `CacheInvalidate`                         | `cache_invalidate`   | `CacheInvalidateMetadata`  | `none`                    |

Tail variant 独立持有字节：`body` 包含 `body`，`diagnostic` 包含 `diagnostic`，
`metadata_body_and_delta` 包含彼此独立的 `metadataBody` 和 `delta`。声明长度不合法时，event
会在交付前失败。握手回复、probe 回复、迁移确认、缓存命令确认、ping/pong、连接关闭和
致命连接错误由各自的专用 API 消费，不会被重新分类为 runtime event。

## 运行时控制 Metadata

### TypeScript 数值映射

线路字段中的 `u64` 在 JavaScript API 中使用 `bigint`；`u32`、`u16`、`u8` 和 `i16` 使用
`number`，非整数或超出冻结线路范围的值必须被拒绝。枚举字段使用对应的数值 TypeScript enum。
编码器复制可选 `tail`；解码器返回独立 `Uint8Array`，不暴露调用方输入缓冲区的 view。
`ProgressMetadata.percentX100` 接受 `0..10000`，以及表示未知值的冻结哨兵 `0xffff`。

`RuntimeControlMetadata` 是下表全部 metadata interface 的 union。每个 metadata
对象只允许与其所在行列出的消息类型配对。

| 类型                       | 消息类型                                  | 冻结字段                                                                                                                                                     |
| -------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ControlRequestMetadata`   | `Cancel`, `Abort`                         | `operationId`, `controlSequence`, `reasonCode`, `sourceRole`, `flags`, `diagnosticBytes`                                                                     |
| `SchedulingMetadata`       | `PriorityUpdate`, `Deadline`, `ExpireAt`  | `operationId`, `controlSequence`, `priorityClass`, `priorityDelta`, `deadlineUnixMs`, `flags`                                                                |
| `SupersedeMetadata`        | `Supersede`                               | `oldOperationId`, `newOperationId`, `controlSequence`, `dropReasonCode`, `flags`, `diagnosticBytes`                                                          |
| `BudgetMetadata`           | `BudgetUpdate`                            | `operationId`, `computeBudgetUnits`, `memoryBudgetBytes`, `bandwidthBudgetBytes`, `tokenBudget`, `flags`                                                     |
| `ProgressMetadata`         | `Progress`                                | `operationId`, `progressSequence`, `stageCode`, `percentX100`, `objectId`, `bodyBytes`                                                                       |
| `PartialResultMetadata`    | `PartialResult`                           | `operationId`, `resultSequence`, `objectId`, `deltaSequence`, `bodyBytes`, `flags`                                                                           |
| `PressureMetadata`         | `Backpressure`, `CreditUpdate`            | `scopeId`, `creditWindow`, `pressureLevel`, `pressureReason`, `retryAfterMs`, `flags`                                                                        |
| `CapabilityMetadata`       | `CapabilityNegotiation`, `DegradeProfile` | `profileId`, `capabilityCount`, `costModelId`, `preferenceRank`, `limitBytes`, `limitUnits`, `bodyBytes`, `flags`                                            |
| `RouteHintMetadata`        | `RouteHint`, `ExecutionHint`              | `operationId`, `routeId`, `executorClass`, `affinityClass`, `deadlineUnixMs`, `bodyBytes`, `flags`                                                           |
| `TraceContextMetadata`     | `TraceContext`                            | `traceId`, `spanId`, `parentSpanId`, `stageCode`, `flags`, `bodyBytes`                                                                                       |
| `ResultDropReasonMetadata` | `ResultDropReason`                        | `operationId`, `resultSequence`, `dropReasonCode`, `sourceRole`, `flags`, `diagnosticBytes`                                                                  |
| `RecoverableErrorMetadata` | `ErrorRecoverable`                        | `errorCode`, `errorScope`, `recoveryAction`, `sourceRole`, `flags`, `retryAfterMs`, `relatedSessionId`, `relatedFrameId`, `relatedViewId`, `diagnosticBytes` |
| `RetryAfterMetadata`       | `RetryAfter`                              | `scopeId`, `controlSequence`, `retryAfterMs`, `jitterMs`, `reasonCode`, `sourceRole`, `flags`, `diagnosticBytes`                                             |

## 运行时对象 Metadata

| 类型                       | 消息类型                     | 冻结字段                                                                                                                                                                        |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ObjectDescriptorMetadata` | `ObjectDeclare`              | `objectId`, `objectKind`, `producerRole`, `consumerRole`, `sessionId`, `byteSize`, `computeCostUnits`, `memoryLocationHint`, `ownershipHint`, `lifetimeHintMs`, `metadataBytes` |
| `ObjectReferenceMetadata`  | `ObjectRef`                  | `objectId`, `operationId`, `objectVersion`, `offset`, `length`, `flags`, `metadataBytes`                                                                                        |
| `ObjectReleaseMetadata`    | `ObjectRelease`              | `objectId`, `operationId`, `releaseReason`, `sourceRole`, `flags`, `diagnosticBytes`                                                                                            |
| `ObjectDeltaMetadata`      | `ObjectPatch`, `ObjectDelta` | `objectId`, `deltaSequence`, `regionOffset`, `regionBytes`, `deltaBytes`, `flags`, `metadataBytes`                                                                              |
| `CacheReferenceMetadata`   | `CacheReference`             | `cacheNamespace`, `cacheKeyHi`, `cacheKeyLo`, `profileId`, `reuseScope`, `leaseId`, `producerTraceId`, `expirationHintMs`, `metadataBytes`, `flags`                             |
| `CacheMissMetadata`        | `CacheMiss`                  | `cacheNamespace`, `cacheKeyHi`, `cacheKeyLo`, `missReason`, `profileId`, `diagnosticBytes`                                                                                      |

## 运行时枚举

| 枚举                  | 成员                                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RuntimeObjectKind`   | `Unspecified`, `Tensor`, `TokenBlock`, `ImageTile`, `FeatureMap`, `ToolResult`, `TraceSegment`, `OpaqueBytes`, `DocumentChunk`, `AudioChunk`, `VideoChunk`, `RoutePlan`, `CacheManifest` |
| `RuntimeRole`         | `Unspecified`, `Client`, `Server`, `Runtime`, `Subagent`, `Tool`, `Scheduler`, `ConformanceRunner`                                                                                       |
| `ErrorScope`          | `Connection`, `Session`, `Frame`                                                                                                                                                         |
| `MemoryLocationHint`  | `Unspecified`, `HostMemory`, `DeviceMemory`, `SharedMemory`, `RemoteMemory`, `MmapFile`, `ObjectStore`                                                                                   |
| `OwnershipHint`       | `Unspecified`, `ProducerOwned`, `ConsumerOwned`, `SessionOwned`, `Borrowed`, `TransferOnRef`, `ReleaseOnDrop`                                                                            |
| `ObjectReleaseReason` | `Completed`, `Cancelled`, `Expired`, `Replaced`, `Invalidated`, `OwnerClosed`, `LeaseExpired`, `ConformanceInjection`                                                                    |
| `CacheReuseScope`     | `Operation`, `Session`, `Connection`, `Global`, `Tenant`, `Profile`                                                                                                                      |
| `CacheMissReason`     | `Unknown`, `NotFound`, `Expired`, `Invalidated`, `SchemaMismatch`, `ProducerUnavailable`, `LeaseRequired`, `PermissionDenied`                                                            |
