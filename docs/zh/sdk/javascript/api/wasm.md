# JS/TS — WASM 浏览器客户端 API

`@nnrp/wasm` 面向浏览器和 edge client。它消费 `nnrp-rs` WASM primitive 产物，只暴露 client API。

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

WASM loader 必须校验 manifest 与 protocol version。浏览器包不能加载 native link library。

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

WebSocket 与 WebTransport 是浏览器 transport adapter，不是协议语义本身。浏览器包不得暴露
`listen`、`accept`、server session 或 native FFI loader。
