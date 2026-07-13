# 运行时控制与对象

JavaScript/TypeScript Preview 4 API 固定运行时控制、对象引用和 WebSocket 二进制帧 helper。运行时无关
helper 位于 `@nnrp/core`；浏览器包可以通过 `@nnrp/browser-client` 使用 WASM 支撑的
helper；后端包通过角色包 和传输包接入 native
能力。传输包必须维护自己的传输行为，不只是隐藏实现上的配置开关。

## 导入

```ts
import {
  decodeCacheInvalidateMetadata,
  decodeRuntimeControlMetadata,
  decodeRuntimeObjectMetadata,
  decodeWebSocketBinaryFrame,
  decodeWebSocketBinaryFrameBatch,
  encodeCacheInvalidateMetadata,
  encodeRuntimeControlMetadata,
  encodeRuntimeObjectMetadata,
  encodeWebSocketBinaryFrame,
  NnrpMessageType,
} from "@nnrp/core";
```

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
`cacheKeyLo`、`reasonCode`。`CacheLease` 是本地校验状态，冻结字段为 `objectId`、
`objectVersion`、`leaseId`、`ownerScope`、`ownerId`、`grantedAtMillis`、`ttlMillis`。

## 高层 Runtime Frame 契约

应用通过 client 或 server session 方法发送 Preview4 控制帧、运行时对象和缓存帧，不需要
自行构造 native request、选择 ABI 符号或拼接 metadata buffer。SDK 校验并编码 typed 参数后，
每个 session 方法只执行一次粗粒度 runtime 调用。

内部 native/WASM binding 方法冻结为：

```ts
sendRuntimeFrame(request: NnrpRuntimeFrameSendRequest): void | Promise<void>;
```

`NnrpRuntimeFrameSendRequest` 的 readonly 字段为 `sessionOptions`、`messageType`、`frameId`
和 `payload`。`payload` 是完整编码后的 metadata 与声明 tail。它属于内部 binding 契约；应用
使用 client 和 server 页面记录的具名 session 方法。

## Typed Runtime Frame Event

Preview4 入站帧必须在交给应用前完成解码。每个 event 都包含 `type`、`messageType`、
`metadata`、`sessionId`，并按照下表提供语义化 tail 字段。Tail buffer 是 SDK 持有的
`Uint8Array` 副本；没有 tail 的 event 不提供 tail 字段。

| Event `type` | 消息 | Metadata | 语义化 tail 字段 |
|---|---|---|---|
| `cancel`, `abort` | `Cancel`, `Abort` | `ControlRequestMetadata` | `diagnostic` |
| `priority-update`, `deadline`, `expire-at` | 对应调度消息 | `SchedulingMetadata` | 无 |
| `supersede` | `Supersede` | `SupersedeMetadata` | `diagnostic` |
| `budget-update` | `BudgetUpdate` | `BudgetMetadata` | 无 |
| `progress` | `Progress` | `ProgressMetadata` | `body` |
| `partial-result` | `PartialResult` | `PartialResultMetadata` | `body` |
| `backpressure`, `credit-update` | 对应 pressure 消息 | `PressureMetadata` | 无 |
| `capability-negotiation`, `degrade-profile` | 对应 capability 消息 | `CapabilityMetadata` | `body` |
| `route-hint`, `execution-hint` | 对应 routing 消息 | `RouteHintMetadata` | `body` |
| `trace-context` | `TraceContext` | `TraceContextMetadata` | `body` |
| `result-drop-reason` | `ResultDropReason` | `ResultDropReasonMetadata` | `diagnostic` |
| `recoverable-error` | `ErrorRecoverable` | `RecoverableErrorMetadata` | `diagnostic` |
| `retry-after` | `RetryAfter` | `RetryAfterMetadata` | `diagnostic` |
| `object-declare` | `ObjectDeclare` | `ObjectDescriptorMetadata` | `body` |
| `object-ref` | `ObjectRef` | `ObjectReferenceMetadata` | `body` |
| `object-release` | `ObjectRelease` | `ObjectReleaseMetadata` | `diagnostic` |
| `object-patch`, `object-delta` | 对应 object update 消息 | `ObjectDeltaMetadata` | `metadataBody`, `delta` |
| `cache-reference` | `CacheReference` | `CacheReferenceMetadata` | `body` |
| `cache-miss` | `CacheMiss` | `CacheMissMetadata` | `diagnostic` |
| `cache-invalidate` | `CacheInvalidate` | `CacheInvalidateMetadata` | 无 |

Object patch 和 delta event 由 SDK 在 `metadata.metadataBytes` 位置切分 wire tail，剩余的
`metadata.deltaBytes` 字节作为 `delta`。长度错误必须在 event 交付前失败。既有 submit、result、
lifecycle 和 migration event 与这组 runtime-frame union 保持独立。

## `encodeWebSocketBinaryFrame`

构造 WebSocket 传输层使用的二进制帧。

| 参数       | 类型                                                | 必填 | 说明                                                                                     |
| ---------- | --------------------------------------------------- | ---: | ---------------------------------------------------------------------------------------- |
| `header`   | [`NnrpRuntimeFrameHeader`](#nnrpruntimeframeheader) |   是 | 除 `metadataLength` 和 `bodyLength` 之外的 header 字段；函数从 buffer 长度推导这两个值。 |
| `metadata` | `Uint8Array`                                        |   否 | metadata payload。                                                                       |
| `body`     | `Uint8Array`                                        |   否 | body payload。                                                                           |

| 返回         |
| ------------ |
| `Uint8Array` |

## `decodeWebSocketBinaryFrame`

拆分一个 WebSocket 二进制帧。

| 参数    | 类型         | 必填 | 说明                                |
| ------- | ------------ | ---: | ----------------------------------- |
| `frame` | `Uint8Array` |   是 | 一个完整 WebSocket binary message。 |

| 返回                  |
| --------------------- |
| `DecodedRuntimeFrame` |

## `decodeWebSocketBinaryFrameBatch`

解码本地 buffer 或测试夹具里的连续二进制帧。

| 参数      | 类型                 | 必填 | 说明                                 |
| --------- | -------------------- | ---: | ------------------------------------ |
| `batch`   | `Uint8Array`         |   是 | 连续帧。                             |
| `options` | `{ limit?: number }` |   否 | 最大解码帧数；`0` 或省略表示不限制。 |

| 返回                    |
| ----------------------- |
| `DecodedRuntimeFrame[]` |

## 运行时控制 Metadata

### TypeScript 数值映射

线路字段中的 `u64` 在 JavaScript API 中使用 `bigint`；`u32`、`u16`、`u8` 和 `i16` 使用
`number`，非整数或超出冻结线路范围的值必须被拒绝。枚举字段使用对应的数值 TypeScript enum。
编码器复制可选 `tail`；解码器返回独立 `Uint8Array`，不暴露调用方输入缓冲区的 view。
`ProgressMetadata.percentX100` 接受 `0..10000`，以及表示未知值的冻结哨兵 `0xffff`。

`RuntimeControlMetadata` 是下表全部 metadata interface 的 union。每个 metadata 对象只允许与其所在行列出的
消息类型配对。

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
| `CacheReferenceMetadata`   | `CacheReference`             | `cacheKeyHi`, `cacheKeyLo`, `profileId`, `reuseScope`, `leaseId`, `producerTraceId`, `expirationHintMs`, `metadataBytes`, `flags`                                               |
| `CacheMissMetadata`        | `CacheMiss`                  | `cacheKeyHi`, `cacheKeyLo`, `missReason`, `profileId`, `diagnosticBytes`                                                                                                        |

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

## `NnrpRuntimeFrameHeader`

| 字段          | 类型                                  | 说明                 |
| ------------- | ------------------------------------- | -------------------- |
| `messageType` | [`NnrpMessageType`](#nnrpmessagetype) | 帧消息类型。         |
| `flags`       | `number`                              | Header flags。       |
| `sessionId`   | `number`                              | Session id。         |
| `generation`  | `number`                              | Session generation。 |
| `frameId`     | `number`                              | Frame id。           |
