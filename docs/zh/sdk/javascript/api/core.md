# JS/TS — 核心类型

`@nnrp/core` 冻结 JS/TS SDK 的共享数据结构。它不能导入 `@nnrp/native`、`@nnrp/wasm`、DOM API 或 Node
built-in。

## 常量

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

`buildMode` 是 JS/TS SDK 必填字段。后端 native 和浏览器 WASM 不能声明同一组 capability，conformance
adapter 必须按实际 build mode 输出 manifest。

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

选择策略必须按评分选择最高可用路径，不能写死 “QUIC 可用就一定选择 QUIC”。

## 诊断与结果

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

所有保留二进制 payload 的 API 必须明确复制或所有权规则；不得把底层 FFI/WASM 临时 buffer
直接暴露为长期有效引用。
