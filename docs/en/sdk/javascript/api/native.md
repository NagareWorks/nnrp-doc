# JS/TS — Native Backend API

`@nnrp/native` targets Node.js/Deno backend services. It consumes `nnrp-rs` native FFI artifacts and
may expose client and server APIs.

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

The loader must read and validate the artifact manifest before loading a native library. Missing
required symbols must fail with a structured diagnostic instead of silently exposing a partial
runtime.

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

Backend transport selection must combine local provider support, remote capabilities, probe samples,
RTT, failure rate, and effective throughput score.

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

The `@nnrp/native` artifact must not include browser client-only transport implementations or DOM
dependencies.
