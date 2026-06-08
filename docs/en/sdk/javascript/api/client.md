# JavaScript/TypeScript Client API

Client code starts from the same lifecycle shape in native and browser hosts:

1. Open a runtime.
2. Connect a client endpoint.
3. Open a session.
4. Submit, cancel, or poll events.

The package names differ by host, but the client session methods intentionally stay aligned.

| Host         | Role package           | Transport packages                            |
| ------------ | ---------------------- | --------------------------------------------- |
| Node.js/Deno | `@nnrp/native-client`  | `@nnrp/transport-tcp`, `@nnrp/transport-quic` |
| Browser/edge | `@nnrp/browser-client` | `@nnrp/transport-websocket`                   |

## `openNativeClient`

Opens a native client in Node.js or Deno.

| Parameter | Type                                                  | Required | Description                                                                                                                            |
| --------- | ----------------------------------------------------- | -------: | -------------------------------------------------------------------------------------------------------------------------------------- |
| `options` | [`NnrpNativeClientOptions`](#nnrpnativeclientoptions) |      Yes | Endpoint, transport policy, installed transport providers, session defaults, environment/platform overrides, and optional FFI binding. |

| Returns               | Throws                                                        |
| --------------------- | ------------------------------------------------------------- |
| `Promise<NnrpClient>` | `NnrpCapabilityError` or `NnrpNativeBindingUnavailableError`. |

```ts
import { openNativeClient } from "@nnrp/native-client";
import { createTcpTransportProvider } from "@nnrp/transport-tcp";
import { createQuicTransportProvider } from "@nnrp/transport-quic";

const client = await openNativeClient({
  endpoint: "127.0.0.1:4433",
  transportPolicy: "score",
  transports: [
    createQuicTransportProvider(),
    createTcpTransportProvider(),
  ],
});
```

## `openBrowserRuntime`

Opens a browser runtime. Browser clients connect from this runtime rather than directly from a
native endpoint because the browser has a separate WASM/module lifecycle.

| Parameter | Type                                                      | Required | Description                                                                                           |
| --------- | --------------------------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------- |
| `options` | [`NnrpBrowserRuntimeOptions`](#nnrpbrowserruntimeoptions) |       No | Module URL, precompiled module, artifact manifest, transport policy, and browser transport providers. |

| Returns                       |
| ----------------------------- |
| `Promise<NnrpBrowserRuntime>` |

```ts
import { openBrowserRuntime } from "@nnrp/browser-client";
import { createWebSocketTransportProvider } from "@nnrp/transport-websocket";

const runtime = await openBrowserRuntime({
  transportProviders: [createWebSocketTransportProvider()],
});
```

## `NnrpBrowserRuntime.connect`

Creates a browser client from an opened browser runtime.

| Parameter | Type                                                      | Required | Description                                                                                       |
| --------- | --------------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| `options` | [`NnrpBrowserConnectOptions`](#nnrpbrowserconnectoptions) |      Yes | Endpoint, optional transport policy, optional transport providers, and optional session defaults. |

| Returns             |
| ------------------- |
| `NnrpBrowserClient` |

```ts
const client = runtime.connect({
  endpoint: "wss://example.test/nnrp",
  transportPolicy: "score",
});
```

## `NnrpClient.openSession`

Opens a client session. Native and browser clients expose the same session concept.

| Parameter | Type                                                                                                     | Required | Description                                         |
| --------- | -------------------------------------------------------------------------------------------------------- | -------: | --------------------------------------------------- |
| `options` | [`NnrpSessionOptions`](#nnrpsessionoptions) or [`NnrpBrowserSessionOptions`](#nnrpbrowsersessionoptions) |       No | Input profile, cadence, quality tier, and metadata. |

| Returns                                           |
| ------------------------------------------------- |
| `NnrpClientSession` or `NnrpBrowserClientSession` |

```ts
const session = client.openSession({ inputProfile: "tensor" });
```

## `ClientSession.submit`

Submits a request and waits for a result. Native clients use the native submit/result hot path;
browser clients use the browser runtime path, but the request shape is shared.

| Parameter | Type                                     | Required | Description                                                                 |
| --------- | ---------------------------------------- | -------: | --------------------------------------------------------------------------- |
| `request` | [`NnrpSubmitRequest`](./core#data-types) |      Yes | Frame id, payload/tensors, profile, cache/schema metadata, and submit mode. |

| Returns               |
| --------------------- |
| `Promise<NnrpResult>` |

```ts
const result = await session.submit({
  frameId: 1,
  payload: new Uint8Array([1, 2, 3]),
  inputProfile: "tensor",
  submitMode: "inline",
});
```

## `ClientSession.submitNoWait`

Submits a request and returns the operation id. This method is available on native client sessions.

| Parameter | Type                                     | Required | Description     |
| --------- | ---------------------------------------- | -------: | --------------- |
| `request` | [`NnrpSubmitRequest`](./core#data-types) |      Yes | Submit request. |

| Returns           |
| ----------------- |
| `Promise<bigint>` |

## `ClientSession.cancel`

Cancels an operation.

| Parameter   | Type                                      | Required | Description          |
| ----------- | ----------------------------------------- | -------: | -------------------- |
| `operation` | `bigint \| number`                        |      Yes | Operation id.        |
| `options`   | [`NnrpCancelOptions`](#nnrpcanceloptions) |       No | Reason and metadata. |

| Returns         |
| --------------- |
| `Promise<void>` |

## `ClientSession.nextEvent`

Reads the next runtime event.

| Parameter | Type                                            | Required | Description            |
| --------- | ----------------------------------------------- | -------: | ---------------------- |
| `options` | [`NnrpEventPollOptions`](#nnrpeventpolloptions) |       No | Event polling options. |

| Returns                     |
| --------------------------- |
| `Promise<NnrpRuntimeEvent>` |

## Runtime Differences

| Area               | Native client                                           | Browser client                                                                                     |
| ------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Package            | `@nnrp/native-client`                                   | `@nnrp/browser-client`                                                                             |
| Runtime open       | `openNativeClient(options)` returns a connected client. | `openBrowserRuntime(options)` returns a runtime, then `runtime.connect(options)` returns a client. |
| Transport packages | TCP and QUIC packages carry native transport artifacts. | WebSocket is the current browser-native path.                                                      |
| Server APIs        | Not exposed.                                            | Not exposed.                                                                                       |

## Option Types

### `NnrpNativeClientOptions`

| Field             | Type                                                    | Required | Description                                                                   |
| ----------------- | ------------------------------------------------------- | -------: | ----------------------------------------------------------------------------- |
| `endpoint`        | `string`                                                |      Yes | Remote NNRP endpoint.                                                         |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#data-types)              |       No | Selection policy such as `score`, `tcp-only`, or `quic-only`.                 |
| `transports`      | `readonly NnrpTransportProvider[]`                      |       No | Installed native transport providers. See [Transport Providers](./transport). |
| `sessionDefaults` | [`NnrpSessionOptions`](#nnrpsessionoptions)             |       No | Defaults applied when sessions omit values.                                   |
| `environment`     | `Record<string, string>`                                |       No | Environment override for artifact lookup or diagnostics.                      |
| `platform`        | `string`                                                |       No | Platform override for tests and controlled packaging checks.                  |
| `ffi`             | [`NnrpNativeFfiBinding`](./native#nnrpnativeffibinding) |       No | Explicit native binding for controlled deployments and tests.                 |

### `NnrpBrowserRuntimeOptions`

| Field                | Type                                       | Required | Description                                                                                                       |
| -------------------- | ------------------------------------------ | -------: | ----------------------------------------------------------------------------------------------------------------- |
| `moduleUrl`          | `string \| URL`                            |       No | Explicit WASM module URL.                                                                                         |
| `module`             | `WebAssembly.Module`                       |       No | Precompiled WASM module.                                                                                          |
| `artifact`           | `NnrpWasmArtifactOptions`                  |       No | Browser WASM primitive manifest plus optional base URL.                                                           |
| `transportPolicy`    | [`NnrpTransportPolicy`](./core#data-types) |       No | Browser transport selection policy.                                                                               |
| `transportProviders` | `readonly NnrpBrowserTransportProvider[]`  |       No | Browser transport providers. The current SDK accepts WebSocket providers. See [Transport Providers](./transport). |

### `NnrpBrowserConnectOptions`

| Field                | Type                                                      | Required | Description                                 |
| -------------------- | --------------------------------------------------------- | -------: | ------------------------------------------- |
| `endpoint`           | `string`                                                  |      Yes | Remote WebSocket endpoint.                  |
| `transportPolicy`    | [`NnrpTransportPolicy`](./core#data-types)                |       No | Selection policy.                           |
| `transportProviders` | `readonly NnrpBrowserTransportProvider[]`                 |       No | Browser providers for this connection.      |
| `sessionDefaults`    | [`NnrpBrowserSessionOptions`](#nnrpbrowsersessionoptions) |       No | Defaults applied when sessions omit values. |

### `NnrpSessionOptions`

| Field           | Type                      | Required | Description                                     |
| --------------- | ------------------------- | -------: | ----------------------------------------------- |
| `inputProfile`  | `string`                  |       No | Input profile name such as `tensor` or `token`. |
| `targetCadence` | `number`                  |       No | Requested cadence.                              |
| `qualityTier`   | `number`                  |       No | Application quality tier.                       |
| `metadata`      | `Record<string, unknown>` |       No | Application metadata attached to the session.   |

### `NnrpBrowserSessionOptions`

Same shape as [`NnrpSessionOptions`](#nnrpsessionoptions), scoped to browser clients.

### `NnrpCancelOptions`

| Field      | Type                      | Required | Description                         |
| ---------- | ------------------------- | -------: | ----------------------------------- |
| `reason`   | `string`                  |       No | Human-readable cancellation reason. |
| `metadata` | `Record<string, unknown>` |       No | Application metadata.               |

### `NnrpEventPollOptions`

| Field       | Type     | Required | Description                                                       |
| ----------- | -------- | -------: | ----------------------------------------------------------------- |
| `timeoutMs` | `number` |       No | Maximum event wait in milliseconds.                               |
| `maxEvents` | `number` |       No | Maximum number of events to read when the runtime batches events. |
