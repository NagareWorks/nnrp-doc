# JavaScript/TypeScript 核心 API

`@nnrp/core` 包含 JavaScript role package 与 transport package 共享的运行时无关类型和 helper。

## 常量

| 名称                           | 类型           | 值                                                    |
| ------------------------------ | -------------- | ----------------------------------------------------- |
| `NNRP_PROTOCOL_NAME`           | `"NNRP"`       | 协议名。                                              |
| `NNRP_PROTOCOL_VERSION`        | `"1.0.0"`      | 协议版本。                                            |
| `NNRP_STANDARD_INPUT_PROFILES` | readonly tuple | `tensor`、`token`、`structured_event`、`tool_delta`。 |

## `createCapabilityManifest`

创建按 build mode 区分的 capability manifest。

| 参数      | 类型                            | 必填 | 说明                                        |
| --------- | ------------------------------- | ---: | ------------------------------------------- |
| `options` | `NnrpCapabilityManifestOptions` |   是 | Build mode、transport 和 capability claim。 |

| 返回                     |
| ------------------------ |
| `NnrpCapabilityManifest` |

## `createBackendNativeManifest`

创建默认 backend native capability manifest。

| 参数           | 类型                        | 必填 | 说明                    |
| -------------- | --------------------------- | ---: | ----------------------- |
| `capabilities` | `readonly NnrpCapability[]` |   否 | 额外 capability claim。 |

| 返回                     |
| ------------------------ |
| `NnrpCapabilityManifest` |

## `createBrowserWasmManifest`

创建默认 browser WASM capability manifest。

| 参数           | 类型                        | 必填 | 说明                    |
| -------------- | --------------------------- | ---: | ----------------------- |
| `capabilities` | `readonly NnrpCapability[]` |   否 | 额外 capability claim。 |

| 返回                     |
| ------------------------ |
| `NnrpCapabilityManifest` |

## `selectTransport`

从冻结 transport comparator 排出的 candidates 中选择 rank `0`。没有 candidate 可选时抛出
`NnrpTransportSelectionError`，其 `selection` 保留完整有序 candidate 列表。

| 参数         | 类型                                | 必填 | 说明                                                |
| ------------ | ----------------------------------- | ---: | --------------------------------------------------- |
| `candidates` | `readonly NnrpTransportCandidate[]` |   是 | 候选 transport。                                    |
| `policy`     | `NnrpTransportPolicy`               |   否 | `auto`、一种 `prefer-*` 策略或一种 `force-*` 策略。 |

| 返回                     |
| ------------------------ |
| `NnrpTransportSelection` |

## `createTransportCandidates`

根据本地和 peer manifest 创建 transport candidates。

| 参数      | 类型                            | 必填 | 说明                                                                                    |
| --------- | ------------------------------- | ---: | --------------------------------------------------------------------------------------- |
| `options` | `NnrpTransportCandidateOptions` |   是 | 本地/peer manifest、provider 元数据、请求 frame limit、readiness 与 probe observation。 |

| 返回                                |
| ----------------------------------- |
| `readonly NnrpTransportCandidate[]` |

## `createTransportSelectionSummary`

创建供诊断、conformance 和 benchmark 使用的精简 selection summary。

| 参数        | 类型                     | 必填 | 说明                  |
| ----------- | ------------------------ | ---: | --------------------- |
| `selection` | `NnrpTransportSelection` |   是 | 完整 selection 对象。 |

| 返回                            |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

## `parseApplicationEndpoint`

解析并校验公开的应用 endpoint。该函数只接受 `nnrp://` 和 `nnrps://`，返回保留 authority、path、query
与安全意图的 `URL`。

| 参数       | 类型            | 必填 | 说明                      |
| ---------- | --------------- | ---: | ------------------------- |
| `endpoint` | `string \| URL` |   是 | 公开 NNRP 应用 endpoint。 |

| 返回  | 可能抛出                                                                         |
| ----- | -------------------------------------------------------------------------------- |
| `URL` | endpoint 为空、格式错误或使用 Provider-local scheme 时抛出 `NnrpProtocolError`。 |

## `resolveProviderEndpoint`

在 Provider 选择完成后解析 carrier-local endpoint。TCP 与 QUIC 从应用 endpoint 的 authority 派生
`host:port`，未声明端口时使用 `4433`；IPC 与 WebSocket 必须提供匹配的显式 Provider endpoint。

| 参数               | 类型                | 必填 | 说明                                    |
| ------------------ | ------------------- | ---: | --------------------------------------- |
| `endpoint`         | `string \| URL`     |   是 | 公开 `nnrp://` 或 `nnrps://` endpoint。 |
| `transport`        | `NnrpTransportKind` |   是 | 已选择的 carrier。                      |
| `providerEndpoint` | `string \| URL`     |   否 | 显式 carrier-local endpoint。           |

| 返回     | 可能抛出                                                        |
| -------- | --------------------------------------------------------------- |
| `string` | 所选 carrier 无法解析传入 locator 时抛出 `NnrpTransportError`。 |

## `normalizeSubmitRequest`

校验并规范化 submit payload。

| 参数      | 类型                            | 必填 | 说明                                  |
| --------- | ------------------------------- | ---: | ------------------------------------- |
| `request` | `NnrpSubmitRequest`             |   是 | Submit request。                      |
| `options` | `NormalizeSubmitRequestOptions` |   否 | Payload copy 和 strict profile 选项。 |

| 返回                          | 可能抛出              |
| ----------------------------- | --------------------- |
| `NnrpNormalizedSubmitRequest` | `NnrpProtocolError`。 |

## Cache 与 Schema Helper

| 函数                              | 参数                                                                                   | 返回值                        | 说明                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `createCacheKey`                  | `kind: NnrpCacheObjectKind`、`key: bigint \| number \| string`、`namespaceId?: number` | `NnrpCacheKey`                | 创建 submit 与 cache 操作使用的规范 128-bit cache identity。 |
| `createSchemaDescriptor`          | `descriptor: NnrpSchemaDescriptor`                                                     | `NnrpSchemaDescriptor`        | 校验并快照 schema descriptor。                               |
| `normalizeCachePutRequest`        | `request: NnrpCachePutRequest`                                                         | `NnrpCachePutRequest`         | 校验 cache identity、lease、payload 与 metadata。            |
| `normalizeCacheInvalidateRequest` | `request: NnrpCacheInvalidateRequest`                                                  | `NnrpCacheInvalidateRequest`  | 校验显式 cache invalidation 请求。                           |
| `isStandardInputProfile`          | `profile: string`                                                                      | `profile is NnrpInputProfile` | 判断 profile 是否属于 `NNRP_STANDARD_INPUT_PROFILES`。       |

## Recovery 与 Session Helper

| 函数                               | 参数                                                                                | 返回值                        | 说明                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------ |
| `createRecoveryToken`              | `token: string \| NnrpBinaryPayload`、`metadata?: Readonly<Record<string, string>>` | `NnrpRecoveryToken`           | 创建拥有独立所有权的 recovery token 与 metadata 快照。 |
| `normalizeSessionMigrationRequest` | `request: NnrpSessionMigrationRequest`                                              | `NnrpSessionMigrationRequest` | 校验 session migration 的目标和 recovery token。       |
| `throwIfResultDrop`                | `event: NnrpRuntimeEvent`                                                           | `void`                        | event 表示结果被丢弃时抛出 `NnrpResultDropError`。     |
| `validateSessionMetadata`          | `options?: NnrpSessionMetadataOptions`                                              | `void`                        | 校验 profile、cadence、quality 与 metadata。           |
| `normalizeSessionPatchRequest`     | `request: NnrpSessionPatchRequest`                                                  | `NnrpSessionPatchRequest`     | 校验并快照 session metadata 或 flow-control patch。    |

## `NnrpSessionRecoveryTicket`

`NnrpSessionRecoveryTicket` 是 `resumeSession` 使用的 runtime opaque 签发值。应用可以持久化它，
但不能构造或修改内部 resume token。

| 成员                                           | 参数                  | 返回值                      | 说明                                             |
| ---------------------------------------------- | --------------------- | --------------------------- | ------------------------------------------------ |
| `toBytes()`                                    | 无                    | `Uint8Array`                | 编码规范 little-endian NRTK version 1 envelope。 |
| `NnrpSessionRecoveryTicket.fromBytes(encoded)` | `encoded: Uint8Array` | `NnrpSessionRecoveryTicket` | 校验并解码一个精确 NRTK envelope。               |

Readonly semantic 字段为 `sessionId`、防御性复制的 `resumeToken`、可选的 `resumeFromOperationId` 与
`resumeWindowMillis`。错误 magic/version、reserved flag、零 session id、空 token、截断和 trailing
bytes 都必须拒绝。

## `validateEventPollOptions`

校验事件轮询选项。

| 参数      | 类型                   | 必填 | 说明           |
| --------- | ---------------------- | ---: | -------------- |
| `options` | `NnrpEventPollOptions` |   否 | Timeout 选项。 |

| 返回   | 可能抛出                                 |
| ------ | ---------------------------------------- |
| `void` | timeout 非法时抛出 `NnrpProtocolError`。 |

## 数据类型

### Capability 与 Transport

| 类型                               | 说明                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `NnrpBuildMode`                    | `"backend-native" \| "browser-wasm"`。                                                                                                        |
| `NnrpTransportKind`                | `"tcp" \| "quic" \| "ipc" \| "websocket"`。                                                                                                   |
| `NnrpTransportPolicy`              | `"auto"`、`"prefer-quic"`、`"prefer-tcp"`、`"prefer-ipc"`、`"prefer-websocket"` 以及四种对应的 `force-*` 值。                                 |
| `NnrpCapability`                   | `client.session`、`server.session`、`native.loader`、`wasm.loader`、`cache`、`schema`、`recovery` 等能力声明。                                |
| `NnrpCapabilityManifest`           | 协议名/版本、build mode、transports 和 capabilities。                                                                                         |
| `NnrpTransportProviderCost`        | 冻结的 provider `modelId` 与 `units`。                                                                                                        |
| `NnrpTransportProviderLimits`      | 冻结的 provider `maxFrameBytes`。                                                                                                             |
| `NnrpTransportProviderLimitation`  | 七个已注册 limitation 字符串的 union。                                                                                                        |
| `NnrpTransportProviderMetadata`    | Provider id、cost、preference rank、limits 与已注册 limitations。                                                                             |
| `NnrpTransportProviderObservation` | Provider kind、元数据、本地可用性与可选诊断。                                                                                                 |
| `NnrpTransportCandidateReadiness`  | Provider identity、route/security readiness 与可选 diagnostic。                                                                               |
| `NnrpTransportProbeState`          | `"not-run" \| "succeeded" \| "failed" \| "missing"`。                                                                                         |
| `NnrpTransportProbeMetrics`        | 样本/成功数、吞吐中位数与 RTT 中位数。                                                                                                        |
| `NnrpTransportProbeObservation`    | Provider identity、成功/失败 state、可选 metrics 与可选 diagnostic。                                                                          |
| `NnrpTransportRejectionReason`     | 八个已注册 rejection 字符串的 union。                                                                                                         |
| `NnrpTransportCandidate`           | Provider 元数据、可用性、peer/limit eligibility、probe 状态/指标、selection rank、拒绝原因与诊断。                                            |
| `NnrpTransportSelectionSummary`    | 被选中的 transport 和 rejected candidates。                                                                                                   |
| `NnrpTransportSelectionError`      | 携带 `code`、diagnostic 与可选 `selection` 的类型化错误；`INVALID_EVIDENCE` 在 selection 前发生，有效 selection 失败保留全部有序 candidates。 |

`NnrpTransportCandidate` 使用[传输策略与探测](/zh/protocol/v1/transport-strategy)规范字段的
camelCase 形式：
`kind`、`provider`、`localAvailable`、`peerSupported`、`withinLimits`、`probeState`、可选
`probe`、可选 `selectionRank`、可选 `rejectionReason` 和可选 `diagnostic`。公共类型不含不透明
`score` 字段。

```ts
type NnrpTransportProviderLimitation =
  | "requires-udp"
  | "requires-tcp"
  | "local-host-only"
  | "native-host-only"
  | "browser-host-only"
  | "unix-domain-socket"
  | "windows-named-pipe";
type NnrpTransportProbeState = "not-run" | "succeeded" | "failed" | "missing";
type NnrpTransportRejectionReason =
  | "policy-disallowed"
  | "local-unavailable"
  | "peer-unsupported"
  | "limit-exceeded"
  | "route-unresolved"
  | "security-unsatisfied"
  | "probe-missing"
  | "probe-failed";

interface NnrpTransportProviderCost {
  readonly modelId: number;
  readonly units: bigint;
}
interface NnrpTransportProviderLimits {
  readonly maxFrameBytes: bigint;
}
interface NnrpTransportProviderMetadata {
  readonly id: string;
  readonly cost: NnrpTransportProviderCost;
  readonly preferenceRank: number;
  readonly limits: NnrpTransportProviderLimits;
  readonly limitations: readonly NnrpTransportProviderLimitation[];
}
interface NnrpTransportProviderObservation {
  readonly kind: NnrpTransportKind;
  readonly metadata: NnrpTransportProviderMetadata;
  readonly localAvailable: boolean;
  readonly diagnostic?: NnrpDiagnostic;
}
interface NnrpTransportCandidateReadiness {
  readonly kind: NnrpTransportKind;
  readonly providerId: string;
  readonly routeResolved: boolean;
  readonly securitySatisfied: boolean;
  readonly diagnostic?: NnrpDiagnostic;
}
interface NnrpTransportProbeMetrics {
  readonly sampleCount: number;
  readonly successCount: number;
  readonly medianThroughputBytesPerSecond: bigint;
  readonly medianRttMicroseconds: bigint;
}
interface NnrpTransportProbeObservation {
  readonly kind: NnrpTransportKind;
  readonly providerId: string;
  readonly state: "succeeded" | "failed";
  readonly metrics?: NnrpTransportProbeMetrics;
  readonly diagnostic?: NnrpDiagnostic;
}
interface NnrpTransportCandidate {
  readonly kind: NnrpTransportKind;
  readonly provider: NnrpTransportProviderMetadata;
  readonly localAvailable: boolean;
  readonly peerSupported: boolean;
  readonly withinLimits: boolean;
  readonly probeState: NnrpTransportProbeState;
  readonly probe?: NnrpTransportProbeMetrics;
  readonly selectionRank?: number;
  readonly rejectionReason?: NnrpTransportRejectionReason;
  readonly diagnostic?: NnrpDiagnostic;
}
interface NnrpTransportCandidateOptions {
  readonly local: NnrpCapabilityManifest;
  readonly peer: NnrpCapabilityManifest;
  readonly providers: readonly NnrpTransportProviderObservation[];
  readonly requestedMaxFrameBytes?: bigint;
  readonly candidateReadiness: readonly NnrpTransportCandidateReadiness[];
  readonly probeObservations?: readonly NnrpTransportProbeObservation[];
}
```

Provider observations 的 transport kind 与 provider id 都必须唯一。每个 provider 都必须有
readiness。Readiness 与 probe observation 按 `(kind, providerId)` 匹配；重复或无法匹配的 evidence
属于契约错误。缺少 probe observation 与 state 为 `"failed"` 的 observation 必须保持可区分。

### Submit、Result 与 Event

| 类型                   | 说明                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `NnrpInputProfile`     | 标准 profile：`tensor`、`token`、`structured_event`、`tool_delta`。                                                      |
| `NnrpSubmitMode`       | `"inline" \| "object-reference"`。                                                                                       |
| `NnrpSubmitRequest`    | 非零 `operationId: bigint`、独立的 `frameId`、payload/tensors、profile、submit mode、cache key、descriptor 与 metadata。 |
| `NnrpResult`           | 非零 operation id、规范 terminal state 与闭合的 runtime-or-lifecycle 终态证据。                                          |
| `NnrpRuntimeEvent`     | 完整 wire header、typed metadata union 与 semantic tail。                                                                |
| `NnrpClientEvent`      | 只包含一个 runtime 或 lifecycle event 的闭合客户端联合类型。                                                             |
| `NnrpEventPollOptions` | 可选 `timeoutMillis`。                                                                                                   |

```ts
interface NnrpResult {
  readonly operationId: bigint;
  readonly terminalState: NnrpResultTerminalState;
  readonly event: NnrpTerminalEvent;
}

type NnrpTerminalEvent =
  | { readonly type: "runtime"; readonly event: NnrpRuntimeEvent }
  | { readonly type: "lifecycle"; readonly event: NnrpOperationLifecycleEvent };

type NnrpClientEvent =
  | { readonly type: "runtime"; readonly event: NnrpRuntimeEvent }
  | { readonly type: "lifecycle"; readonly event: NnrpOperationLifecycleEvent };

interface NnrpOperationLifecycleEvent {
  readonly operationId: bigint;
  readonly state: NnrpOperationState;
}
```

`NnrpResultTerminalState` 固定为 `"success" | "cancelled" | "dropped" | "error"`。
`NnrpOperationState` 固定为
`"accepted" | "running" | "partial" | "waiting-tool" |
"superseded" | "cancelled" | "failed" | "completed"`。成功结果保留
`RESULT_PUSH`，非成功结果 保留建立终态的精确 wire 或本地 lifecycle
event。`NnrpOperationLifecycleEvent` 是本地 role 状态，绝不携带伪造的
`NnrpRuntimeFrameHeader`。`NnrpTerminalEvent` 必须恰好包含一个变体；API 不提供 nullable 的并行
runtime/lifecycle 字段。

这些 contract 还公开以下类型：

| 类型                                                          | 说明                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| `NnrpOperationId`                                             | 使用 `bigint` 表示的非零 operation identity。                |
| `NnrpOperationState`                                          | 上文列出的规范八状态 operation lifecycle。                   |
| `NnrpSubmitCapacityPolicy`                                    | 本地 submit credit 耗尽时使用的 `"reject" \| "await"` 策略。 |
| `NnrpBinaryPayload`                                           | `Uint8Array \| ArrayBufferView`。                            |
| `NnrpTensorSection`、`NnrpNormalizedTensorSection`            | 请求规范化前后的 tensor byte section。                       |
| `NnrpPayloadDescriptor`                                       | Payload 的可选 schema id、content type 与 encoding。         |
| `NnrpSchemaFlag`、`NnrpSchemaDescriptor`                      | 已注册 schema flag 与通过校验的 schema contract。            |
| `NnrpCacheKey`、`NnrpCacheMetadata`                           | 规范 cache identity 与调用方 metadata。                      |
| `NnrpCacheOperationStatus`                                    | `accepted`、`stored`、`invalidated`、`miss` 或 `rejected`。  |
| `NnrpCachePutRequest`、`NnrpCachePutResult`                   | 显式 cache put 请求与结果。                                  |
| `NnrpCacheInvalidateRequest`、`NnrpCacheInvalidateResult`     | 显式 invalidation 请求与结果。                               |
| `NnrpRecoveryToken`、`NnrpSessionMigrationEvent`              | Recovery token 与 typed migration lifecycle event。          |
| `NnrpSessionMetadataOptions`、`NnrpSessionFlowControlOptions` | 可复用的 session metadata 与 credit-window 选项。            |
| `NnrpFlowUpdateMetadata`、`NnrpResultHintMetadata`            | 结构化 flow update 与 result-hint payload。                  |
| `NnrpAbortSignalLike`                                         | 异步 SDK 方法接受的运行时无关 abort signal。                 |

### 错误

| Class                 | 说明                                               |
| --------------------- | -------------------------------------------------- |
| `NnrpError`           | 带结构化 `diagnostic` 的基础错误。                 |
| `NnrpCapabilityError` | Capability、manifest 或 unsupported runtime 错误。 |
| `NnrpTransportError`  | Transport 错误。                                   |
| `NnrpTimeoutError`    | Timeout 错误。                                     |
| `NnrpProtocolError`   | 请求形态或协议校验错误。                           |
| `NnrpResultDropError` | 结果被丢弃时的 typed 终态证据。                    |
| `NnrpRecoveryError`   | Recovery 或 migration capability 错误。            |

`NnrpDiagnosticSource` 标识诊断来自 `core`、`native`、`wasm`、`transport`、`protocol` 或 `runtime`。
