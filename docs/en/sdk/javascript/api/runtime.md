# Runtime Control & Objects

JavaScript/TypeScript Preview 4 APIs expose runtime-control and object-reference codecs plus typed
runtime events. WebSocket packet framing remains inside the WebSocket provider and is not a public
application helper.

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
  encodeCacheInvalidateMetadata,
  encodeRuntimeControlMetadata,
  encodeRuntimeObjectMetadata,
  encodeRuntimeObjectMetadataSegments,
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

`DecodedRuntimeControlMetadata` has two readonly fields:

| Field      | Type                     | Description                                                        |
| ---------- | ------------------------ | ------------------------------------------------------------------ |
| `metadata` | `RuntimeControlMetadata` | Metadata object selected by `messageType`.                         |
| `tail`     | `Uint8Array`             | Owned copy of the declared diagnostic, body, or extension payload. |

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

## `encodeRuntimeObjectMetadataSegments`

Encodes runtime object metadata and ordered tail segments directly into one owned payload. This
helper avoids an intermediate concatenated buffer when object metadata and a large delta are
supplied separately.

| Parameter      | Type                                                | Required | Description                                                                                                         |
| -------------- | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------- |
| `messageType`  | [`NnrpMessageType`](#nnrpmessagetype)               |      Yes | Any runtime object or cache message type accepted by [`encodeRuntimeObjectMetadata`](#encoderuntimeobjectmetadata). |
| `metadata`     | [Runtime object metadata](#runtime-object-metadata) |      Yes | Metadata matching `messageType`; declared tail lengths apply to the sum of all segments.                            |
| `tailSegments` | `readonly Uint8Array[]`                             |      Yes | Tail segments in exact wire order, copied directly into the returned owned payload.                                 |

| Returns      |
| ------------ |
| `Uint8Array` |

For `ObjectPatch` and `ObjectDelta`, pass `[metadataBody, delta]`. Segment order remains semantic
when either segment is empty.

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
`cacheKeyLo`, and `reasonCode`. `cacheNamespace` is a `number`; both key words are `bigint`.
`CachePutMetadata`, `CacheAckMetadata`, and `ObjectReferenceBlock` use the same identity widths.

### Local Cache Lease State

`CacheLease` is the validated TypeScript value for a granted lease. It is not a wire payload or a
native/WASM handle.

| TypeScript field  | Type                   | Protocol field   |
| ----------------- | ---------------------- | ---------------- |
| `objectId`        | `CacheObjectId`        | `object_id`      |
| `objectVersion`   | `bigint`               | `object_version` |
| `leaseId`         | `bigint`               | `lease_id`       |
| `ownerScope`      | `CacheLeaseOwnerScope` | `owner_scope`    |
| `ownerId`         | `bigint`               | `owner_id`       |
| `grantedAtMillis` | `bigint`               | `granted_at_ms`  |
| `ttlMillis`       | `number` (`u32`)       | `ttl_ms`         |

`CacheObjectId` contains `cacheNamespace: number` (`u32`), `cacheKeyHi: bigint`,
`cacheKeyLo: bigint`, and `objectKind: NnrpCacheObjectKind` (`u32`). `CacheLeaseOwnerScope` is
`Connection = 0`, `Session = 1`, or `Operation = 2`. Use `expiresAtMillis`, `isExpiredAt`, and
`validateVersion` for local validation.

## High-Level Runtime Frame Contract

Applications send Preview4 controls, runtime objects, and cache frames through client or server
session methods. They do not construct a native request, select an ABI symbol, or concatenate a
metadata buffer manually. Every session method performs exactly one coarse runtime call after the
SDK validates and encodes its typed arguments.

The internal native/WASM binding method is frozen as:

```ts
sendRuntimeFrame(request: NnrpRuntimeFrameSendRequest): void | Promise<void>;
```

`NnrpRuntimeFrameSendRequest` has the readonly fields `sessionOptions`, `messageType`, `frameId`,
and `payload`. `payload` is the complete encoded metadata and declared tail. It is an internal
binding contract; public applications use the named session methods documented on the client and
server pages.

## `NnrpRuntimeEvent`

Every incoming role event is decoded into one envelope with a complete wire header and two closed
tagged unions. Applications discriminate `event.metadata.type` and `event.tail.type`; the removed
flat `NnrpRuntimeFrameEvent.type` surface is not part of Preview4.

```ts
interface NnrpRuntimeEvent {
  readonly header: NnrpRuntimeFrameHeader;
  readonly metadata: NnrpRuntimeEventMetadata;
  readonly tail: NnrpRuntimeEventTail;
}
```

`NnrpRuntimeEventMetadata` and `NnrpRuntimeEventTail` are closed tagged unions. The exhaustive table
below selects exactly one variant of each union from `header.messageType`.

`NnrpRuntimeFrameHeader` preserves `versionMajor`, `wireFormat`, `messageType`, `flags`,
`sessionId`, `frameId`, `viewId`, `routeId`, and `traceId`. A local lifecycle notification has no
wire header and therefore remains `NnrpOperationLifecycleEvent`; the SDK never fabricates a
zero-filled header.

The mapping below is exhaustive. The message type selects one metadata variant and one semantic tail
variant before the event reaches application code.

| Messages                                  | `metadata.type`      | Metadata value             | `tail.type`               |
| ----------------------------------------- | -------------------- | -------------------------- | ------------------------- |
| `SessionClose`                            | `session_close`      | `NnrpSessionCloseMetadata` | `none`                    |
| `FrameSubmit`                             | `frame_submit`       | `NnrpFrameSubmitMetadata`  | `body`                    |
| `FrameCancel`, `ResultDrop`               | `none`               | none                       | `none`                    |
| `ResultPush`                              | `result_push`        | `NnrpResultPushMetadata`   | `body`                    |
| `ResultHint`                              | `result_hint`        | `NnrpResultHintMetadata`   | `none`                    |
| `FlowUpdate`                              | `flow_update`        | `NnrpFlowUpdateMetadata`   | `none`                    |
| `Cancel`, `Abort`                         | `control_request`    | `ControlRequestMetadata`   | `diagnostic`              |
| `PriorityUpdate`, `Deadline`, `ExpireAt`  | `scheduling`         | `SchedulingMetadata`       | `none`                    |
| `Supersede`                               | `supersede`          | `SupersedeMetadata`        | `diagnostic`              |
| `BudgetUpdate`                            | `budget`             | `BudgetMetadata`           | `none`                    |
| `Progress`                                | `progress`           | `ProgressMetadata`         | `body`                    |
| `PartialResult`                           | `partial_result`     | `PartialResultMetadata`    | `body`                    |
| `Backpressure`, `CreditUpdate`            | `pressure`           | `PressureMetadata`         | `none`                    |
| `CapabilityNegotiation`, `DegradeProfile` | `capability`         | `CapabilityMetadata`       | `body`                    |
| `RouteHint`, `ExecutionHint`              | `route_hint`         | `RouteHintMetadata`        | `body`                    |
| `TraceContext`                            | `trace_context`      | `TraceContextMetadata`     | `body`                    |
| `ResultDropReason`                        | `result_drop_reason` | `ResultDropReasonMetadata` | `diagnostic`              |
| `ErrorRecoverable`                        | `recoverable_error`  | `RecoverableErrorMetadata` | `diagnostic`              |
| `RetryAfter`                              | `retry_after`        | `RetryAfterMetadata`       | `diagnostic`              |
| `ObjectDeclare`                           | `object_descriptor`  | `ObjectDescriptorMetadata` | `body`                    |
| `ObjectRef`                               | `object_reference`   | `ObjectReferenceMetadata`  | `body`                    |
| `ObjectRelease`                           | `object_release`     | `ObjectReleaseMetadata`    | `diagnostic`              |
| `ObjectPatch`, `ObjectDelta`              | `object_delta`       | `ObjectDeltaMetadata`      | `metadata_body_and_delta` |
| `CacheReference`                          | `cache_reference`    | `CacheReferenceMetadata`   | `body`                    |
| `CacheMiss`                               | `cache_miss`         | `CacheMissMetadata`        | `diagnostic`              |
| `CacheInvalidate`                         | `cache_invalidate`   | `CacheInvalidateMetadata`  | `none`                    |

Tail variants own their bytes: `body` contains `body`, `diagnostic` contains `diagnostic`, and
`metadata_body_and_delta` contains separate `metadataBody` and `delta` buffers. Malformed declared
lengths fail before delivery. Handshake replies, probe replies, migration acknowledgements, cache
command acknowledgements, ping/pong, connection close, and fatal connection errors are consumed by
their dedicated APIs rather than being reclassified as runtime events.

## Runtime Control Metadata

### `NnrpMessageType`

Preview 4 adds these message members to the JavaScript enum:

`Cancel`, `Abort`, `PriorityUpdate`, `Deadline`, `ExpireAt`, `Supersede`, `BudgetUpdate`,
`Progress`, `PartialResult`, `Backpressure`, `CreditUpdate`, `CapabilityNegotiation`,
`DegradeProfile`, `RouteHint`, `ExecutionHint`, `TraceContext`, `ResultDropReason`, `ObjectDeclare`,
`ObjectRef`, `ObjectRelease`, `ObjectPatch`, `ObjectDelta`, `CacheReference`, `CacheMiss`,
`CacheInvalidate`, `ErrorRecoverable`, `RetryAfter`.

### TypeScript Numeric Mapping

Wire fields declared as `u64` use `bigint` in the JavaScript API. Wire fields declared as `u32`,
`u16`, `u8`, or `i16` use `number` and are rejected when they are not integers or exceed the frozen
wire range. Enum-valued fields use the corresponding numeric TypeScript enum. Encoders snapshot the
optional `tail`; decoders return an owned `Uint8Array` rather than a view into caller-owned storage.
`ProgressMetadata.percentX100` accepts `0..10000` and the frozen `0xffff` unknown-value sentinel.

`RuntimeControlMetadata` is the union of every metadata interface in the control metadata field map
below. A metadata object is valid only for the message types listed in its row.

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
| `CacheReferenceMetadata`   | `CacheReference`             | `cacheNamespace`, `cacheKeyHi`, `cacheKeyLo`, `profileId`, `reuseScope`, `leaseId`, `producerTraceId`, `expirationHintMs`, `metadataBytes`, `flags`                             |
| `CacheMissMetadata`        | `CacheMiss`                  | `cacheNamespace`, `cacheKeyHi`, `cacheKeyLo`, `missReason`, `profileId`, `diagnosticBytes`                                                                                      |

## Runtime Enums

| Enum                  | Members                                                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RuntimeObjectKind`   | `Unspecified`, `Tensor`, `TokenBlock`, `ImageTile`, `FeatureMap`, `ToolResult`, `TraceSegment`, `OpaqueBytes`, `DocumentChunk`, `AudioChunk`, `VideoChunk`, `RoutePlan`, `CacheManifest` |
| `RuntimeRole`         | `Unspecified`, `Client`, `Server`, `Runtime`, `Subagent`, `Tool`, `Scheduler`, `ConformanceRunner`                                                                                       |
| `ErrorScope`          | `Connection`, `Session`, `Frame`                                                                                                                                                         |
| `MemoryLocationHint`  | `Unspecified`, `HostMemory`, `DeviceMemory`, `SharedMemory`, `RemoteMemory`, `MmapFile`, `ObjectStore`                                                                                   |
| `OwnershipHint`       | `Unspecified`, `ProducerOwned`, `ConsumerOwned`, `SessionOwned`, `Borrowed`, `TransferOnRef`, `ReleaseOnDrop`                                                                            |
| `ObjectReleaseReason` | `Completed`, `Cancelled`, `Expired`, `Replaced`, `Invalidated`, `OwnerClosed`, `LeaseExpired`, `ConformanceInjection`                                                                    |
| `CacheReuseScope`     | `Operation`, `Session`, `Connection`, `Global`, `Tenant`, `Profile`                                                                                                                      |
| `CacheMissReason`     | `Unknown`, `NotFound`, `Expired`, `Invalidated`, `SchemaMismatch`, `ProducerUnavailable`, `LeaseRequired`, `PermissionDenied`                                                            |
