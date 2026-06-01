# JavaScript/TypeScript — Native Backend API

`@nnrp/native` targets Node.js and Deno backend services. It consumes `nnrp-rs` native FFI artifacts
and may expose both client and server APIs.

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

The resolver must read and validate `manifest.json` before loading a native library. Missing
required symbols, ABI mismatches, or platform mismatches fail with `NnrpNativeBindingUnavailableError`
and a structured diagnostic.

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

`openBackendRuntime` is the only public entrypoint that may load native libraries. Package-level
side effects must not load native artifacts.

## Client and Server

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

Backend transport selection combines local provider availability, remote capabilities, RTT, failure
rate, and effective throughput score. It must not silently downgrade to a transport that violates an
explicit policy such as `quic-only`.

## Sessions

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

The native backend package must not include browser-only transport implementations or DOM
dependencies. It may expose a server surface because backend hosts can listen, accept, and push
results.

## Conformance and Benchmark Entrypoints

The backend package should expose adapter and benchmark commands through repository tasks before
registry publication:

```bash
deno task conformance:backend
deno task benchmark:backend
```

Reports must include the active native artifact platform, ABI version, and transport selection.
