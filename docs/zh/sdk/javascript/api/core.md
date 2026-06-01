# JavaScript/TypeScript — 核心类型

`@nnrp/core` 冻结共享数据结构。它不能导入 `@nnrp/native`、`@nnrp/wasm`、DOM API、Node built-in 或 native/WASM loader 代码。

## 常量

```ts
export const NNRP_PROTOCOL_NAME: "NNRP";
export const NNRP_PROTOCOL_VERSION: string;
```

## Capability Manifest

```ts
export type NnrpBuildMode = "backend-native" | "browser-wasm";

export interface NnrpCapabilityManifest {
  readonly protocol: "NNRP";
  readonly protocolVersion: string;
  readonly implementationName: string;
  readonly implementationVersion: string;
  readonly buildMode: NnrpBuildMode;
  readonly transports: readonly NnrpTransportKind[];
  readonly supports: readonly string[];
}

export function createCapabilityManifest(
  input: Omit<NnrpCapabilityManifest, "protocol" | "protocolVersion">,
): NnrpCapabilityManifest;
```

`buildMode` 是必填字段。Backend native 与 browser WASM 的可用 transport 或 server capability 不同时，必须输出不同 manifest。

## Transport Selection

```ts
export type NnrpTransportKind =
  | "tcp"
  | "quic"
  | "websocket"
  | "webtransport";

export type NnrpTransportPolicy =
  | "score"
  | "tcp-only"
  | "quic-only"
  | "websocket-only"
  | "webtransport-only";

export interface NnrpTransportCandidate {
  readonly kind: NnrpTransportKind;
  readonly peerSupported: boolean;
  readonly localAvailable: boolean;
  readonly score: number;
  readonly rttMs?: number;
  readonly failureRate?: number;
  readonly effectiveThroughputBps?: number;
  readonly rejectedReason?: string;
}

export interface NnrpTransportSelection {
  readonly selected: NnrpTransportCandidate | null;
  readonly candidates: readonly NnrpTransportCandidate[];
}

export function selectTransport(
  candidates: readonly NnrpTransportCandidate[],
  policy?: NnrpTransportPolicy,
): NnrpTransportSelection;
```

选择策略应选择 peer-supported 且 local-available 中评分最高的 candidate。`score` 策略不能写死成“QUIC 可达就选 QUIC”。

## Payload 与 Submit Request

```ts
export type NnrpInputProfile = "tensor" | "token" | string;
export type NnrpSubmitMode = "inline" | "reference";
export type NnrpResultClass = "complete" | "partial" | "degraded" | "rejected";

export interface NnrpCacheKey {
  readonly namespace: string;
  readonly key: string;
  readonly version?: string;
}

export interface NnrpTensorSection {
  readonly sectionId: number;
  readonly payload: Uint8Array;
  readonly descriptor?: Uint8Array;
}

export interface NnrpSubmitRequest {
  readonly frameId: number;
  readonly payload?: Uint8Array;
  readonly sections?: readonly NnrpTensorSection[];
  readonly cacheKey?: NnrpCacheKey;
  readonly inputProfile: NnrpInputProfile;
  readonly submitMode: NnrpSubmitMode;
  readonly inferenceBudgetMs?: number;
  readonly metadata?: Readonly<Record<string, string>>;
}
```

任何保留二进制数据的 API 必须复制数据，或明确声明所有权转移。公开对象不得暴露长期指向临时 native 或 WASM 内存的 view。

## 诊断、事件与结果

```ts
export type NnrpDiagnosticStatus =
  | "ok"
  | "retry-later"
  | "rejected"
  | "protocol-error"
  | "transport-error"
  | "native-error";

export interface NnrpDiagnostic {
  readonly status: NnrpDiagnosticStatus;
  readonly errorFamily?: string;
  readonly protocolErrorCode?: number;
  readonly detailCode?: number;
  readonly message?: string;
}

export interface NnrpResult {
  readonly sessionId: number;
  readonly operationId: bigint;
  readonly frameId: number;
  readonly resultClass: NnrpResultClass;
  readonly payload?: Uint8Array;
  readonly sections?: readonly NnrpTensorSection[];
  readonly diagnostic: NnrpDiagnostic;
}

export type NnrpRuntimeEventKind =
  | "session-opened"
  | "session-closed"
  | "operation-accepted"
  | "operation-result"
  | "flow-update"
  | "diagnostic";

export interface NnrpRuntimeEvent {
  readonly kind: NnrpRuntimeEventKind;
  readonly sessionId?: number;
  readonly operationId?: bigint;
  readonly frameId?: number;
  readonly result?: NnrpResult;
  readonly diagnostic?: NnrpDiagnostic;
}
```

Runtime wrapper 必须保留 native/WASM status、error family、protocol error code、detail code 和关联 operation id。
