# JavaScript/TypeScript — WASM Browser Client API

`@nnrp/wasm` targets browser and edge clients. It consumes `nnrp-rs` WASM artifacts and exposes
client APIs only.

## WASM Loader

```ts
export interface NnrpWasmOptions {
  readonly wasmUrl?: string | URL;
  readonly wasmModule?: WebAssembly.Module;
  readonly manifestUrl?: string | URL;
  readonly fetch?: typeof globalThis.fetch;
}

export interface NnrpBrowserRuntime {
  readonly manifest: NnrpCapabilityManifest;
  connect(options: NnrpBrowserConnectOptions): Promise<NnrpBrowserClient>;
  close(): Promise<void>;
}

export function openBrowserRuntime(
  options?: NnrpWasmOptions,
): Promise<NnrpBrowserRuntime>;
```

The loader validates the manifest and protocol version before exposing a runtime. Browser packages
must never load native link libraries or import Node built-ins.

## Browser Client

```ts
export interface NnrpBrowserConnectOptions {
  readonly endpoint: string | URL;
  readonly transportPolicy?: Extract<
    NnrpTransportPolicy,
    "score" | "websocket-only" | "webtransport-only"
  >;
}

export interface NnrpBrowserClient {
  openSession(options?: NnrpSessionOptions): Promise<NnrpBrowserSession>;
  close(): Promise<void>;
}

export interface NnrpBrowserSession {
  readonly sessionId: number;
  submit(request: NnrpSubmitRequest): Promise<NnrpResult>;
  submitNoWait(request: NnrpSubmitRequest): Promise<bigint>;
  cancel(operationId: bigint): Promise<void>;
  patch(options: Partial<NnrpSessionOptions>): Promise<void>;
  nextEvent(): Promise<NnrpRuntimeEvent>;
  close(): Promise<void>;
}
```

Browser mode does not expose server sessions, `listen`, `accept`, or native artifact resolvers.

## Browser Transport Adapter Slot

```ts
export interface NnrpBrowserTransport {
  send(payload: Uint8Array): Promise<void>;
  receive(): Promise<Uint8Array>;
  close(): Promise<void>;
}

export interface NnrpBrowserTransportProvider {
  readonly kind: "websocket" | "webtransport";
  probe(endpoint: string | URL): Promise<NnrpTransportCandidate>;
  connect(endpoint: string | URL): Promise<NnrpBrowserTransport>;
}
```

WebSocket and WebTransport are transport adapters, not protocol semantics. The scoring policy is
shared with `@nnrp/core`, but browser mode can only select browser-available transports.

## Conformance and Benchmark Entrypoints

The browser package should expose headless adapter and benchmark tasks once the WASM runtime can be
loaded in CI:

```bash
deno task conformance:browser
deno task benchmark:browser
```

Reports must identify browser WASM mode separately from backend native mode.
