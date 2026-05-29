# JS/TS — Native 后端 API

`@nnrp/native` 面向 Node.js/Deno 后端服务。它消费 `nnrp-rs` native FFI 产物，并可以暴露 client 与
server API。

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
}
```

加载 native library 前必须读取并校验 manifest。缺少 required symbol
时必须以结构化诊断失败，不能静默回退到不完整 runtime。

## Backend Runtime

```ts
export interface NnrpBackendRuntimeOptions {
  readonly nativeLibrary?: NnrpNativeLibraryOptions;
  readonly transportPolicy?: "score" | "tcp-only" | "quic-only";
}

export interface NnrpBackendRuntime {
  readonly artifact: NnrpNativeArtifact;
  connect(options: NnrpConnectOptions): Promise<NnrpClient>;
  listen(options: NnrpListenOptions): Promise<NnrpServer>;
  close(): Promise<void>;
}

export function openBackendRuntime(
  options?: NnrpBackendRuntimeOptions,
): Promise<NnrpBackendRuntime>;
```

## Client / Server

```ts
export interface NnrpConnectOptions {
  readonly endpoint: string;
  readonly transportPolicy?: "score" | "tcp-only" | "quic-only";
}

export interface NnrpListenOptions {
  readonly endpoint: string;
  readonly transportPolicy?: "score" | "tcp-only" | "quic-only";
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

后端 transport 选择必须综合本地 provider、远端 capability、probe 样本、RTT、失败率与吞吐评分。

## Session

```ts
export interface NnrpClientSession {
  submit(request: NnrpSubmitRequest): Promise<NnrpResult>;
  submitNoWait(request: NnrpSubmitRequest): Promise<bigint>;
  cancel(operationId: bigint): Promise<void>;
  nextEvent(): Promise<NnrpRuntimeEvent>;
  close(): Promise<void>;
}

export interface NnrpServerSession {
  receive(): Promise<NnrpRuntimeEvent>;
  sendResult(result: NnrpResult): Promise<void>;
  sendFlowUpdate(update: NnrpFlowUpdate): Promise<void>;
  close(): Promise<void>;
}
```

`@nnrp/native` 产物不得包含浏览器 client-only transport 实现或 DOM 依赖。
