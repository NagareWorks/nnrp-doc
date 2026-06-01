# JavaScript/TypeScript — Native Backend API

`@nnrp/native` targets Node.js and Deno backend services. It loads `nnrp-rs` native artifacts, opens
backend runtimes, and exposes both client and server surfaces. This page freezes the public contract
without presenting interface blocks as the primary documentation.

## Backend Workflow

1. Call [`openBackendRuntime`](#openbackendruntime).
2. Use [`runtime.connect`](#nnrpbackendruntime-connect) for client mode or
   [`runtime.listen`](#nnrpbackendruntime-listen) for server mode.
3. Open sessions with [`client.openSession`](#nnrpclient-opensession) or
   [`server.accept`](#nnrpserver-accept).
4. Submit, receive, send results, and close through session methods.

## `openBackendRuntime`

Loads and validates the native artifact. Package-level imports must not load native libraries.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `options` | [`NnrpBackendRuntimeOptions`](#nnrpbackendruntimeoptions) | No | Defaults to auto discovery | Native artifact and transport policy options. |

| Returns | Throws |
|---|---|
| `Promise<NnrpBackendRuntime>` | [`NnrpNativeBindingUnavailableError`](#nnrpnativebindingunavailableerror), manifest validation errors. |

```ts
const runtime = await openBackendRuntime({
  nativeLibrary: { artifactDir: "./native" },
  transportPolicy: "score",
});
```

## `NnrpBackendRuntime.connect`

Connects to a remote NNRP backend as a client.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `options` | [`NnrpConnectOptions`](#nnrpconnectoptions) | Yes | Endpoint and optional policy | Remote endpoint options. |

| Returns | Throws |
|---|---|
| `Promise<NnrpClient>` | Native, transport, handshake, or capability errors. |

```ts
const client = await runtime.connect({
  endpoint: "127.0.0.1:4433",
  transportPolicy: "score",
});
```

## `NnrpBackendRuntime.listen`

Starts a server listener.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `options` | [`NnrpListenOptions`](#nnrplistenoptions) | Yes | Endpoint and optional policy | Local listen options. |

| Returns | Throws |
|---|---|
| `Promise<NnrpServer>` | Native, bind, or transport errors. |

```ts
const server = await runtime.listen({ endpoint: "0.0.0.0:4433" });
```

## `NnrpClient.openSession`

Opens a client session.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `options` | [`NnrpSessionOptions`](#nnrpsessionoptions) | No | Defaults to runtime profile | Session profile and metadata. |

| Returns | Throws |
|---|---|
| `Promise<NnrpClientSession>` | Session-open rejection or transport errors. |

```ts
const session = await client.openSession({ inputProfile: "tensor" });
```

## `NnrpClientSession.submit`

Submits one request and waits for the matching result.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `request` | [`NnrpSubmitRequest`](./core#nnrpsubmitrequest) | Yes | `frameId` must be unique while in flight | Structured submit request. |

| Returns | Throws |
|---|---|
| `Promise<NnrpResult>` | Native, transport, timeout, drop, or correlation errors. |

```ts
const result = await session.submit({
  frameId: 1,
  payload: new Uint8Array([1, 2, 3]),
  inputProfile: "tensor",
  submitMode: "inline",
});
```

## `NnrpClientSession.submitNoWait`

Submits one request and returns the native operation id.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `request` | [`NnrpSubmitRequest`](./core#nnrpsubmitrequest) | Yes | `frameId` must be unique while in flight | Structured submit request. |

| Returns | Throws |
|---|---|
| `Promise<bigint>` | Native, transport, or local validation errors. |

```ts
const operationId = await session.submitNoWait(request);
```

## `NnrpClientSession.nextEvent`

Receives the next runtime event.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Reads the next event from the runtime. |

| Returns | Throws |
|---|---|
| `Promise<NnrpRuntimeEvent>` | Native or transport errors. |

```ts
const event = await session.nextEvent();
```

## `NnrpServer.accept`

Accepts a server session.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Uses the listener created by `runtime.listen`. |

| Returns | Throws |
|---|---|
| `Promise<NnrpServerSession>` | Accept, session-open, or transport errors. |

```ts
const serverSession = await server.accept();
```

## `NnrpServerSession.receive`

Receives the next server-side runtime event.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| None | - | - | - | Reads the next event. |

| Returns | Throws |
|---|---|
| `Promise<NnrpRuntimeEvent>` | Native, transport, or parse errors. |

```ts
const event = await serverSession.receive();
```

## `NnrpServerSession.sendResult`

Sends a result to the client.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `result` | [`NnrpResult`](./core#nnrpresult) | Yes | Must match a submitted frame/operation | Result payload and diagnostic metadata. |

| Returns | Throws |
|---|---|
| `Promise<void>` | Native, serialization, lifecycle, or transport errors. |

```ts
await serverSession.sendResult(result);
```

## Core Types

### `NnrpBackendRuntimeOptions`

| Property | Type | Required | Description |
|---|---|---:|---|
| `nativeLibrary` | [`NnrpNativeLibraryOptions`](#nnrpnativelibraryoptions) | No | Native artifact discovery options. |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#transport-selection) | No | Runtime transport policy. |

### `NnrpNativeLibraryOptions`

| Property | Type | Required | Description |
|---|---|---:|---|
| `path` | `string` | No | Explicit native library path. |
| `artifactDir` | `string` | No | Directory containing native artifacts. |
| `requiredSymbols` | `readonly string[]` | No | ABI symbols that must exist before runtime creation. |

### `NnrpNativeArtifact`

| Property | Type | Description |
|---|---|---|
| `platform` | `string` | Artifact platform tag. |
| `arch` | `string` | Artifact architecture tag. |
| `libraryPath` | `string` | Native library path. |
| `manifestPath` | `string` | Artifact manifest path. |
| `symbols` | `readonly string[]` | Exported ABI symbols. |
| `abiVersion` | `string` | Native ABI version. |

### `NnrpConnectOptions` and `NnrpListenOptions`

| Property | Type | Required | Description |
|---|---|---:|---|
| `endpoint` | `string \| URL` | Yes | Remote connect endpoint or local listen endpoint. |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#transport-selection) | No | Overrides runtime transport policy. |

### `NnrpSessionOptions`

| Property | Type | Required | Description |
|---|---|---:|---|
| `inputProfile` | [`NnrpInputProfile`](./core#payloads-and-submit-requests) | No | Default session input profile. |
| `targetCadence` | `number` | No | Target cadence or FPS. |
| `qualityTier` | `number` | No | Application quality tier. |
| `metadata` | `Readonly<Record<string, string>>` | No | Application metadata. |

### `NnrpNativeBindingUnavailableError`

Thrown when native loading cannot provide the required ABI.

| Property | Type | Description |
|---|---|---|
| `diagnostic` | `NnrpDiagnostic \| undefined` | Structured native/runtime diagnostic. |

## Conformance and Benchmark Entrypoints

```bash
deno task conformance:backend
deno task benchmark:backend
```

Reports must include active native artifact platform, ABI version, binding path, and transport
selection.

## Common Pitfalls

::: warning
1. Do not load native artifacts during module import; only `openBackendRuntime` may load them.
2. Backend native packages must not include browser-only transport code or DOM dependencies.
3. Explicit policies such as `quic-only` must fail when unavailable; do not silently downgrade.
:::
