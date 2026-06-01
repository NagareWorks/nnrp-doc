# JavaScript/TypeScript — WASM 浏览器客户端 API

`@nnrp/wasm` 面向浏览器与 edge client。它消费 `nnrp-rs` WASM 产物，只暴露 client API。

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

Loader 在暴露 runtime 前必须校验 manifest 和 protocol version。浏览器包不得加载 native link library，也不得导入 Node built-in。

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

Browser 模式不暴露 server session、`listen`、`accept` 或 native artifact resolver。

## 浏览器 Transport Adapter 插槽

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

WebSocket 与 WebTransport 是 transport adapter，不是协议语义本身。评分策略由 `@nnrp/core` 共享，但 browser mode 只能选择浏览器可用的 transport。

## Conformance 与 Benchmark 入口

WASM runtime 可以在 CI 中加载后，browser 包应提供 headless adapter 与 benchmark task：

```bash
deno task conformance:browser
deno task benchmark:browser
```

报告必须把 browser WASM mode 与 backend native mode 分开标识。
