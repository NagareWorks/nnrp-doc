# JavaScript/TypeScript — Native 后端 API

`@nnrp/native` 面向 Node.js 与 Deno 后端服务。它消费 `nnrp-rs` native FFI 产物，可以暴露 client 与 server API。

## Native Artifact Resolver

```ts
export interface NnrpNativeLibraryOptions {
  readonly path?: string;
  readonly artifactDir?: string;
  readonly requiredSymbols?: readonly string[];
}

export interface NnrpNativeArtifact {
  readonly platform: string;
  readonly arch: string;
  readonly libraryPath: string;
  readonly manifestPath: string;
  readonly symbols: readonly string[];
  readonly abiVersion: string;
}

export class NnrpNativeBindingUnavailableError extends Error {
  readonly diagnostic?: NnrpDiagnostic;
}

export function resolveNativeArtifact(
  options?: NnrpNativeLibraryOptions,
): Promise<NnrpNativeArtifact>;
```

Resolver 必须先读取并校验 `manifest.json`，再加载 native library。缺少 required symbol、ABI 不匹配或平台不匹配时，必须抛出 `NnrpNativeBindingUnavailableError` 并携带结构化诊断。

## Backend Runtime

```ts
export interface NnrpBackendRuntimeOptions {
  readonly nativeLibrary?: NnrpNativeLibraryOptions;
  readonly transportPolicy?: NnrpTransportPolicy;
}

export interface NnrpBackendRuntime {
  readonly artifact: NnrpNativeArtifact;
  readonly manifest: NnrpCapabilityManifest;
  connect(options: NnrpConnectOptions): Promise<NnrpClient>;
  listen(options: NnrpListenOptions): Promise<NnrpServer>;
  close(): Promise<void>;
}

export function openBackendRuntime(
  options?: NnrpBackendRuntimeOptions,
): Promise<NnrpBackendRuntime>;
```

`openBackendRuntime` 是唯一允许加载 native library 的公开入口。包级副作用不得加载 native artifact。

## Client 与 Server

```ts
export interface NnrpConnectOptions {
  readonly endpoint: string | URL;
  readonly transportPolicy?: NnrpTransportPolicy;
}

export interface NnrpListenOptions {
  readonly endpoint: string | URL;
  readonly transportPolicy?: NnrpTransportPolicy;
}

export interface NnrpSessionOptions {
  readonly inputProfile?: NnrpInputProfile;
  readonly targetCadence?: number;
  readonly qualityTier?: number;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface NnrpClient {
  openSession(options?: NnrpSessionOptions): Promise<NnrpClientSession>;
  close(): Promise<void>;
}

export interface NnrpServer {
  accept(): Promise<NnrpServerSession>;
  close(): Promise<void>;
}
```

Backend transport selection 综合本地 provider、远端 capability、RTT、失败率和有效吞吐评分。显式策略（例如 `quic-only`）不能被静默降级。

## Session

```ts
export interface NnrpClientSession {
  readonly sessionId: number;
  submit(request: NnrpSubmitRequest): Promise<NnrpResult>;
  submitNoWait(request: NnrpSubmitRequest): Promise<bigint>;
  cancel(operationId: bigint): Promise<void>;
  patch(options: Partial<NnrpSessionOptions>): Promise<void>;
  nextEvent(): Promise<NnrpRuntimeEvent>;
  close(): Promise<void>;
}

export interface NnrpFlowUpdate {
  readonly credit: number;
  readonly retryAfterMs?: number;
  readonly reason?: string;
}

export interface NnrpServerSession {
  readonly sessionId: number;
  receive(): Promise<NnrpRuntimeEvent>;
  sendResult(result: NnrpResult): Promise<void>;
  sendFlowUpdate(update: NnrpFlowUpdate): Promise<void>;
  close(): Promise<void>;
}
```

Native backend 包不得包含浏览器专用 transport 实现或 DOM 依赖。它可以暴露 server surface，因为后端宿主能够 listen、accept 和 push result。

## Conformance 与 Benchmark 入口

Backend 包发布前应通过仓库 task 暴露 adapter 与 benchmark 命令：

```bash
deno task conformance:backend
deno task benchmark:backend
```

报告必须包含当前 native artifact platform、ABI version 与 transport selection。
