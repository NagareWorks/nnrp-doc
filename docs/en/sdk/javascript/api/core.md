# JS/TS — Core Types

`@nnrp/core` freezes shared JS/TS SDK data structures. It must not import `@nnrp/native`,
`@nnrp/wasm`, DOM APIs, or Node built-ins.

## Constants

```ts
export const NNRP_PROTOCOL_NAME = "NNRP";
export const NNRP_PREVIEW_VERSION = "1.0.0-preview.3";
```

## Capability Manifest

```ts
export interface NnrpCapabilityManifest {
  readonly protocol: "NNRP";
  readonly protocolVersion: string;
  readonly implementationName: string;
  readonly implementationVersion: string;
  readonly buildMode: "backend-native" | "browser-wasm";
  readonly supports: readonly string[];
}
```

`buildMode` is mandatory for the JS/TS SDK. Backend native and browser WASM modes cannot claim the
same capability set; the conformance adapter must emit the manifest for the active build mode.

## Transport Selection

```ts
export type NnrpTransportKind =
  | "tcp"
  | "quic"
  | "websocket"
  | "webtransport";

export interface NnrpTransportCandidate {
  readonly kind: NnrpTransportKind;
  readonly peerSupported: boolean;
  readonly localAvailable: boolean;
  readonly score: number;
  readonly rejectedReason?: string;
}

export interface NnrpTransportSelection {
  readonly selected: NnrpTransportCandidate | null;
  readonly candidates: readonly NnrpTransportCandidate[];
}
```

Selection must choose the highest-scored available path. It must not hard-code "choose QUIC whenever
QUIC is reachable".

## Diagnostics and Results

```ts
export interface NnrpDiagnostic {
  readonly status: "ok" | "retry-later" | "rejected" | "protocol-error" | "transport-error";
  readonly errorFamily?: string;
  readonly protocolErrorCode?: number;
  readonly detailCode?: number;
  readonly message?: string;
}

export interface NnrpResult {
  readonly sessionId: number;
  readonly operationId: bigint;
  readonly frameId: number;
  readonly payload: Uint8Array;
  readonly diagnostic: NnrpDiagnostic;
}
```

Any API that retains binary payloads must define copy or ownership rules explicitly; long-lived
references to temporary FFI/WASM buffers are not allowed.
