# JavaScript/TypeScript — Core Types

`@nnrp/core` freezes shared data structures. It must not import `@nnrp/native`, `@nnrp/wasm`, DOM
APIs, Node built-ins, or native/WASM loader code.

## Constants

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

`buildMode` is mandatory. Backend native and browser WASM modes must emit different manifests when
their available transports or server capabilities differ.

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

Selection chooses the highest-scored candidate that is both peer-supported and locally available.
The `score` policy must not hard-code "choose QUIC whenever QUIC is reachable".

## Payloads and Submit Requests

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

An API that retains binary data must copy it or explicitly document ownership transfer. Public
objects must not expose long-lived views into temporary native or WASM memory.

## Diagnostics, Events, and Results

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

Runtime wrappers must preserve native/WASM status, error family, protocol error code, detail code,
and related operation identifiers.
