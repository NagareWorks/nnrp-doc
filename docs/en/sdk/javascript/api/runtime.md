# Runtime Control & Objects

JavaScript/TypeScript Preview 4 APIs freeze the runtime-control, object-reference, and WebSocket
binary-frame helpers that SDK packages must expose. The names below are the public API contract for
NNRP/1 JavaScript packages.

Runtime-neutral helpers live in `@nnrp/core`. Browser packages may call the WASM-backed helpers from
`@nnrp/browser-client`; backend packages may call native-backed helpers through role and transport
packages. Transport packages own their transport behavior; they are not configuration flags over a
hidden implementation.

## Import

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

Encodes one Preview 4 control metadata object.

| Parameter     | Type                                                  | Required | Description                                                                                      |
| ------------- | ----------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------ |
| `messageType` | [`NnrpMessageType`](#nnrpmessagetype)                 |      Yes | One of the Preview 4 control message types.                                                      |
| `metadata`    | [Runtime control metadata](#runtime-control-metadata) |      Yes | Metadata object matching `messageType`.                                                          |
| `tail`        | `Uint8Array`                                          |       No | Extension bytes, diagnostic bytes, progress body, or partial-result body declared by `metadata`. |

| Returns      |
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

Decodes one control metadata payload.

| Parameter     | Type                                  | Required | Description                                     |
| ------------- | ------------------------------------- | -------: | ----------------------------------------------- |
| `messageType` | [`NnrpMessageType`](#nnrpmessagetype) |      Yes | Message type that selected the metadata layout. |
| `payload`     | `Uint8Array`                          |      Yes | Metadata bytes plus the declared tail.          |

| Returns                         |
| ------------------------------- |
| `DecodedRuntimeControlMetadata` |

## `encodeRuntimeObjectMetadata`

Encodes object, object-reference, object-delta, cache-reference, and cache-miss metadata.

| Parameter     | Type                                                | Required | Description                                                                                                           |
| ------------- | --------------------------------------------------- | -------: | --------------------------------------------------------------------------------------------------------------------- |
| `messageType` | [`NnrpMessageType`](#nnrpmessagetype)               |      Yes | One of `ObjectDeclare`, `ObjectRef`, `ObjectRelease`, `ObjectPatch`, `ObjectDelta`, `CacheReference`, or `CacheMiss`. |
| `metadata`    | [Runtime object metadata](#runtime-object-metadata) |      Yes | Metadata object matching `messageType`.                                                                               |
| `tail`        | `Uint8Array`                                        |       No | Extension bytes, diagnostics, or delta payload declared by `metadata`.                                                |

| Returns      |
| ------------ |
| `Uint8Array` |

## `decodeRuntimeObjectMetadata`

Decodes one runtime object or cache metadata payload.

| Parameter     | Type                                  | Required | Description                                     |
| ------------- | ------------------------------------- | -------: | ----------------------------------------------- |
| `messageType` | [`NnrpMessageType`](#nnrpmessagetype) |      Yes | Message type that selected the metadata layout. |
| `payload`     | `Uint8Array`                          |      Yes | Metadata bytes plus the declared tail.          |

| Returns                        |
| ------------------------------ |
| `DecodedRuntimeObjectMetadata` |

## Baseline Cache Invalidation

Preview4 reuses the existing `CacheInvalidate` NNRP/1 frame instead of defining a second runtime
invalidation message.

| API                             | Parameters                | Returns                   |
| ------------------------------- | ------------------------- | ------------------------- |
| `encodeCacheInvalidateMetadata` | `CacheInvalidateMetadata` | `Uint8Array`              |
| `decodeCacheInvalidateMetadata` | `Uint8Array`              | `CacheInvalidateMetadata` |

`CacheInvalidateMetadata` has the frozen fields `invalidateScope`, `cacheNamespace`, `cacheKeyHi`,
`cacheKeyLo`, and `reasonCode`. `CacheLease` is local validated state with `objectId`,
`objectVersion`, `leaseId`, `ownerScope`, `ownerId`, `grantedAtMillis`, and `ttlMillis`.

## `encodeWebSocketBinaryFrame`

Builds the binary frame used by the WebSocket transport.

| Parameter  | Type                                                | Required | Description                                                                                               |
| ---------- | --------------------------------------------------- | -------: | --------------------------------------------------------------------------------------------------------- |
| `header`   | [`NnrpRuntimeFrameHeader`](#nnrpruntimeframeheader) |      Yes | Header fields except `metadataLength` and `bodyLength`; the helper derives both lengths from the buffers. |
| `metadata` | `Uint8Array`                                        |       No | Metadata payload.                                                                                         |
| `body`     | `Uint8Array`                                        |       No | Body payload.                                                                                             |

| Returns      |
| ------------ |
| `Uint8Array` |

## `decodeWebSocketBinaryFrame`

Splits one WebSocket binary frame into header, metadata view, and body view.

| Parameter | Type         | Required | Description                            |
| --------- | ------------ | -------: | -------------------------------------- |
| `frame`   | `Uint8Array` |      Yes | One complete WebSocket binary message. |

| Returns               |
| --------------------- |
| `DecodedRuntimeFrame` |

## `decodeWebSocketBinaryFrameBatch`

Decodes concatenated binary frames from local buffers and conformance fixtures.

| Parameter | Type                 | Required | Description                                            |
| --------- | -------------------- | -------: | ------------------------------------------------------ |
| `batch`   | `Uint8Array`         |      Yes | Concatenated frames.                                   |
| `options` | `{ limit?: number }` |       No | Maximum decoded frames; `0` or omitted means no limit. |

| Returns                 |
| ----------------------- |
| `DecodedRuntimeFrame[]` |

## Runtime Control Metadata

### `NnrpMessageType`

Preview 4 adds these message members to the JavaScript enum:

`Cancel`, `Abort`, `PriorityUpdate`, `Deadline`, `ExpireAt`, `Supersede`, `BudgetUpdate`,
`Progress`, `PartialResult`, `Backpressure`, `CreditUpdate`, `CapabilityNegotiation`,
`DegradeProfile`, `RouteHint`, `ExecutionHint`, `TraceContext`, `ResultDropReason`, `ObjectDeclare`,
`ObjectRef`, `ObjectRelease`, `ObjectPatch`, `ObjectDelta`, `CacheReference`, `CacheMiss`,
`CacheInvalidate`, `ErrorRecoverable`, `RetryAfter`.

### Control Metadata Field Map

| Type                       | Message types                             | Frozen fields                                                                                                                                                |
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

## Runtime Object Metadata

| Type                       | Message types                | Frozen fields                                                                                                                                                                   |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ObjectDescriptorMetadata` | `ObjectDeclare`              | `objectId`, `objectKind`, `producerRole`, `consumerRole`, `sessionId`, `byteSize`, `computeCostUnits`, `memoryLocationHint`, `ownershipHint`, `lifetimeHintMs`, `metadataBytes` |
| `ObjectReferenceMetadata`  | `ObjectRef`                  | `objectId`, `operationId`, `objectVersion`, `offset`, `length`, `flags`, `metadataBytes`                                                                                        |
| `ObjectReleaseMetadata`    | `ObjectRelease`              | `objectId`, `operationId`, `releaseReason`, `sourceRole`, `flags`, `diagnosticBytes`                                                                                            |
| `ObjectDeltaMetadata`      | `ObjectPatch`, `ObjectDelta` | `objectId`, `deltaSequence`, `regionOffset`, `regionBytes`, `deltaBytes`, `flags`, `metadataBytes`                                                                              |
| `CacheReferenceMetadata`   | `CacheReference`             | `cacheKeyHi`, `cacheKeyLo`, `profileId`, `reuseScope`, `leaseId`, `producerTraceId`, `expirationHintMs`, `metadataBytes`, `flags`                                               |
| `CacheMissMetadata`        | `CacheMiss`                  | `cacheKeyHi`, `cacheKeyLo`, `missReason`, `profileId`, `diagnosticBytes`                                                                                                        |

## Runtime Enums

| Enum                  | Members                                                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RuntimeObjectKind`   | `Unspecified`, `Tensor`, `TokenBlock`, `ImageTile`, `FeatureMap`, `ToolResult`, `TraceSegment`, `OpaqueBytes`, `DocumentChunk`, `AudioChunk`, `VideoChunk`, `RoutePlan`, `CacheManifest` |
| `RuntimeRole`         | `Unspecified`, `Client`, `Server`, `Runtime`, `Subagent`, `Tool`, `Scheduler`, `ConformanceRunner`                                                                                       |
| `MemoryLocationHint`  | `Unspecified`, `HostMemory`, `DeviceMemory`, `SharedMemory`, `RemoteMemory`, `MmapFile`, `ObjectStore`                                                                                   |
| `OwnershipHint`       | `Unspecified`, `ProducerOwned`, `ConsumerOwned`, `SessionOwned`, `Borrowed`, `TransferOnRef`, `ReleaseOnDrop`                                                                            |
| `ObjectReleaseReason` | `Completed`, `Cancelled`, `Expired`, `Replaced`, `Invalidated`, `OwnerClosed`, `LeaseExpired`, `ConformanceInjection`                                                                    |
| `CacheReuseScope`     | `Operation`, `Session`, `Connection`, `Global`, `Tenant`, `Profile`                                                                                                                      |
| `CacheMissReason`     | `Unknown`, `NotFound`, `Expired`, `Invalidated`, `SchemaMismatch`, `ProducerUnavailable`, `LeaseRequired`, `PermissionDenied`                                                            |

## `NnrpRuntimeFrameHeader`

| Field         | Type                                  | Description         |
| ------------- | ------------------------------------- | ------------------- |
| `messageType` | [`NnrpMessageType`](#nnrpmessagetype) | Frame message type. |
| `flags`       | `number`                              | Header flags.       |
| `sessionId`   | `number`                              | Session id.         |
| `generation`  | `number`                              | Session generation. |
| `frameId`     | `number`                              | Frame id.           |
