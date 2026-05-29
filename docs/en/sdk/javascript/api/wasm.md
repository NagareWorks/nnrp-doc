# JS/TS — WASM Browser Client API

`@nnrp/wasm` targets browser and edge clients. It consumes `nnrp-rs` WASM primitive artifacts and
exposes client APIs only.

## WASM Loader

```ts
export interface NnrpWasmOptions {
  readonly wasmUrl?: string | URL;
  readonly wasmModule?: WebAssembly.Module;
  readonly manifestUrl?: string | URL;
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

The WASM loader must validate the manifest and protocol version. The browser package must never load
a native link library.

## Browser Client

```ts
export interface NnrpBrowserConnectOptions {
  readonly endpoint: string | URL;
  readonly transportPolicy?: "score" | "websocket-only" | "webtransport-only";
}

export interface NnrpBrowserClient {
  openSession(options?: NnrpSessionOptions): Promise<NnrpBrowserSession>;
  close(): Promise<void>;
}

export interface NnrpBrowserSession {
  submit(request: NnrpSubmitRequest): Promise<NnrpResult>;
  submitNoWait(request: NnrpSubmitRequest): Promise<bigint>;
  cancel(operationId: bigint): Promise<void>;
  nextEvent(): Promise<NnrpRuntimeEvent>;
  close(): Promise<void>;
}
```

## Transport Adapter Slot

```ts
export interface NnrpBrowserTransportProvider {
  readonly kind: "websocket" | "webtransport";
  probe(endpoint: string | URL): Promise<NnrpTransportCandidate>;
  connect(endpoint: string | URL): Promise<NnrpBrowserTransport>;
}
```

WebSocket and WebTransport are browser transport adapters, not protocol semantics. The browser
package must not expose `listen`, `accept`, server sessions, or native FFI loaders.
