# JavaScript/TypeScript — Native Runtime API

`@nnrp/native` targets Node.js and Deno applications that need the `nnrp-rs` native runtime. It is
the right package for CLI tools, coding agents, backend services, and adapter processes such as an
opencode integration. It loads native artifacts lazily and exposes both client-first and server
surfaces.

## Native Client Workflow

Use this path when the JavaScript application consumes an NNRP service, for example a coding agent,
operator agent, desktop helper, or CLI.

1. Call [`openNativeClient`](#opennativeclient).
2. Open a session with [`client.openSession`](#nnrpclient-opensession).
3. Submit work with [`session.submit`](#nnrpclientsession-submit) or
   [`session.submitNoWait`](#nnrpclientsession-submitnowait).
4. Receive runtime events with [`session.nextEvent`](#nnrpclientsession-nextevent) when using
   non-blocking submits.

## Native Server Workflow

Use this path when JavaScript hosts an NNRP service or adapter.

1. Call [`openBackendRuntime`](#openbackendruntime).
2. Start a listener with [`runtime.listen`](#nnrpbackendruntime-listen).
3. Accept sessions with [`server.accept`](#nnrpserver-accept).
4. Receive submits and send results through server session methods.

## `openNativeClient`

Loads the native artifact, connects to a remote NNRP endpoint, and returns a ready client. This is
the recommended entrypoint for Node/Deno applications that only need the client role.

| Parameter | Type | Required | Values / Range | Description |
|---|---|---:|---|---|
| `options` | [`NnrpNativeClientOptions`](#nnrpnativeclientoptions) | Yes | Native artifact and endpoint options | Runtime loading plus remote connect options. |

| Returns | Throws |
|---|---|
| `Promise<NnrpClient>` | [`NnrpNativeBindingUnavailableError`](#nnrpnativebindingunavailableerror), native, transport, handshake, or capability errors. |

```ts
import { openNativeClient } from "@nnrp/native";

const client = await openNativeClient({
  endpoint: "127.0.0.1:4433",
  nativeLibrary: { artifactDir: "./native" },
  transportPolicy: "score",
});

const session = await client.openSession({ inputProfile: "tensor" });
const result = await session.submit({
  frameId: 1,
  payload: new Uint8Array([1, 2, 3]),
  inputProfile: "tensor",
  submitMode: "inline",
});
```

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

Connects to a remote NNRP endpoint as a client. Use this when the application already has a runtime
because it also needs server APIs or explicit runtime lifecycle control.

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

### `NnrpNativeClientOptions`

| Property | Type | Required | Description |
|---|---|---:|---|
| `endpoint` | `string \| URL` | Yes | Remote NNRP endpoint. |
| `nativeLibrary` | [`NnrpNativeLibraryOptions`](#nnrpnativelibraryoptions) | No | Native artifact discovery options. |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#transport-selection) | No | Client transport policy. |
| `sessionDefaults` | [`NnrpSessionOptions`](#nnrpsessionoptions) | No | Defaults applied when sessions omit matching fields. |

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
1. Do not load native artifacts during module import; only `openNativeClient` and `openBackendRuntime` may load them.
2. Client-only Node/Deno apps should prefer `openNativeClient` instead of creating a runtime only to call `connect`.
3. Explicit policies such as `quic-only` must fail when unavailable; do not silently downgrade.
4. Native packages must not include browser-only transport code or DOM dependencies.
:::
