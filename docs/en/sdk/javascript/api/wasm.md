# JavaScript/TypeScript — WASM Browser Client API

`@nnrp/wasm` targets browser and edge clients. It loads WASM artifacts, exposes client sessions, and
uses browser transport adapters such as WebSocket or WebTransport. It must not expose server APIs or
load native link libraries.

## Browser Workflow

1. Call [`openBrowserRuntime`](#openbrowserruntime).
2. Connect with [`runtime.connect`](#nnrpbrowserruntime-connect).
3. Open a session with [`client.openSession`](#nnrpbrowserclient-opensession).
4. Submit with [`session.submit`](#nnrpbrowsersession-submit) or
   [`submitNoWait`](#nnrpbrowsersession-submitnowait).
5. Read events with [`nextEvent`](#nnrpbrowsersession-nextevent).
6. Close the session, client, and runtime.

## `openBrowserRuntime`

Loads the WASM module and validates its manifest.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `options` | [`NnrpWasmOptions`](#nnrpwasmoptions) | No | URL, module, manifest, and fetch options | WASM loader options. |

| Returns | Throws |
|---|---|
| `Promise<NnrpBrowserRuntime>` | Manifest, fetch, compile, or version validation errors. |

```ts
const runtime = await openBrowserRuntime({
  wasmUrl: new URL("/assets/nnrp_wasm_bg.wasm", location.href),
  manifestUrl: new URL("/assets/nnrp_wasm_manifest.json", location.href),
});
```

## `NnrpBrowserRuntime.connect`

Connects to a browser-compatible transport endpoint.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `options` | [`NnrpBrowserConnectOptions`](#nnrpbrowserconnectoptions) | Yes | Endpoint and browser transport policy | Browser client connection options. |

| Returns | Throws |
|---|---|
| `Promise<NnrpBrowserClient>` | Browser transport, policy, or handshake errors. |

```ts
const client = await runtime.connect({
  endpoint: new URL("wss://example.test/nnrp"),
  transportPolicy: "score",
});
```

## `NnrpBrowserClient.openSession`

Opens a browser client session.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `options` | [`NnrpSessionOptions`](./native#nnrpsessionoptions) | No | Defaults to runtime profile | Session options. |

| Returns | Throws |
|---|---|
| `Promise<NnrpBrowserSession>` | Session-open rejection or transport errors. |

```ts
const session = await client.openSession({ inputProfile: "tensor" });
```

## `NnrpBrowserSession.submit`

Submits one request and waits for the matching result.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `request` | [`NnrpSubmitRequest`](./core#nnrpsubmitrequest) | Yes | `frameId` must be unique while in flight | Structured submit request. |

| Returns | Throws |
|---|---|
| `Promise<NnrpResult>` | WASM, transport, timeout, drop, or correlation errors. |

```ts
const result = await session.submit({
  frameId: 1,
  payload: new Uint8Array([1, 2, 3]),
  inputProfile: "tensor",
  submitMode: "inline",
});
```

## `NnrpBrowserSession.submitNoWait`

Submits one request and returns the operation id.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `request` | [`NnrpSubmitRequest`](./core#nnrpsubmitrequest) | Yes | `frameId` must be unique while in flight | Structured submit request. |

| Returns | Throws |
|---|---|
| `Promise<bigint>` | WASM, transport, or validation errors. |

```ts
const operationId = await session.submitNoWait(request);
```

## `NnrpBrowserSession.nextEvent`

Receives the next browser runtime event.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Reads the next runtime event. |

| Returns | Throws |
|---|---|
| `Promise<NnrpRuntimeEvent>` | WASM or transport errors. |

```ts
const event = await session.nextEvent();
```

## `NnrpBrowserSession.close`

Closes the browser session.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | No parameters. |

| Returns | Throws |
|---|---|
| `Promise<void>` | Transport close errors. |

```ts
await session.close();
```

## Browser Transport Provider

Browser transports are adapter slots, not protocol semantics.

### `NnrpBrowserTransportProvider.probe`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `endpoint` | `string \| URL` | Yes | WebSocket or WebTransport endpoint | Endpoint to probe. |

| Returns | Throws |
|---|---|
| `Promise<NnrpTransportCandidate>` | Browser network errors. |

### `NnrpBrowserTransportProvider.connect`

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `endpoint` | `string \| URL` | Yes | WebSocket or WebTransport endpoint | Endpoint to connect. |

| Returns | Throws |
|---|---|
| `Promise<NnrpBrowserTransport>` | Browser network errors. |

## Core Types

### `NnrpWasmOptions`

| Property | Type | Required | Description |
|---|---|---:|---|
| `wasmUrl` | `string \| URL` | No | URL for the WASM artifact. |
| `wasmModule` | `WebAssembly.Module` | No | Precompiled WASM module. |
| `manifestUrl` | `string \| URL` | No | URL for the WASM manifest. |
| `fetch` | `typeof globalThis.fetch` | No | Fetch implementation override. |

### `NnrpBrowserConnectOptions`

| Property | Type | Required | Description |
|---|---|---:|---|
| `endpoint` | `string \| URL` | Yes | Remote browser transport endpoint. |
| `transportPolicy` | `"score" \| "websocket-only" \| "webtransport-only"` | No | Browser transport policy. |

### `NnrpBrowserTransport`

| Method | Parameter | Returns | Description |
|---|---|---|---|
| `send` | `Uint8Array` | `Promise<void>` | Sends one framed payload. |
| `receive` | None | `Promise<Uint8Array>` | Receives one framed payload. |
| `close` | None | `Promise<void>` | Closes the adapter. |

## Conformance and Benchmark Entrypoints

```bash
deno task conformance:browser
deno task benchmark:browser
```

Reports must identify browser WASM mode separately from backend native mode.

## Common Pitfalls

::: warning
1. Browser mode must not expose `listen`, `accept`, server sessions, or native artifact resolvers.
2. Browser packages must not import Node built-ins.
3. WebSocket and WebTransport are adapters; transport scoring still comes from `@nnrp/core`.
:::
