# JavaScript/TypeScript Client API

Client code starts from the same lifecycle shape in native and browser hosts:

1. Open a runtime.
2. Connect a client endpoint.
3. Open a session.
4. Submit, cancel, or poll events.

The package names differ by host, but the client session methods intentionally stay aligned.

| Host         | Role package           | Transport packages                             |
| ------------ | ---------------------- | ---------------------------------------------- |
| Node.js/Deno | `@nnrp/native-client`  | TCP, QUIC, IPC, and WebSocket carrier packages |
| Browser/edge | `@nnrp/browser-client` | `@nnrp/transport-websocket`                    |

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
  endpoint: "nnrps://runtime.example/session/default",
  transportPolicy: "auto",
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
  endpoint: "nnrps://runtime.example/session/default",
  providerEndpoint: "wss://runtime.example/nnrp",
  transportPolicy: "auto",
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

Sends a Preview4 `CANCEL` frame. `NnrpClientSession` and `NnrpBrowserClientSession` expose the same
method.

| Parameter    | Type                                                           | Required | Description                                                                |
| ------------ | -------------------------------------------------------------- | -------: | -------------------------------------------------------------------------- |
| `metadata`   | [`ControlRequestMetadata`](./runtime#runtime-control-metadata) |      Yes | Frozen operation id, sequence, reason, role, flags, and diagnostic length. |
| `diagnostic` | `Uint8Array`                                                   |       No | Bytes whose length equals `metadata.diagnosticBytes`.                      |

| Returns         |
| --------------- |
| `Promise<void>` |

## Preview4 Client Control Methods

The native and browser session classes expose the same control surface. Every method encodes the
named NNRP message and submits it through the active runtime in one coarse runtime call.

| Method                                      | Message                                    | Metadata                       | Optional tail      |
| ------------------------------------------- | ------------------------------------------ | ------------------------------ | ------------------ |
| `abort(metadata, diagnostic?)`              | `Abort`                                    | `ControlRequestMetadata`       | diagnostic bytes   |
| `updatePriority(metadata)`                  | `PriorityUpdate`                           | `SchedulingMetadata`           | none               |
| `updateDeadline(metadata)`                  | `Deadline`                                 | `SchedulingMetadata`           | none               |
| `expireAt(metadata)`                        | `ExpireAt`                                 | `SchedulingMetadata`           | none               |
| `supersede(metadata, diagnostic?)`          | `Supersede`                                | `SupersedeMetadata`            | diagnostic bytes   |
| `updateBudget(metadata)`                    | `BudgetUpdate`                             | `BudgetMetadata`               | none               |
| `negotiateCapabilities(metadata, body?)`    | `CapabilityNegotiation`                    | `CapabilityMetadata`           | capability entries |
| `degradeProfile(metadata, body?)`           | `DegradeProfile`                           | `CapabilityMetadata`           | capability entries |
| `sendRouteHint(metadata, body?)`            | `RouteHint`                                | `RouteHintMetadata`            | typed hint body    |
| `sendExecutionHint(metadata, body?)`        | `ExecutionHint`                            | `RouteHintMetadata`            | typed hint body    |
| `sendTraceContext(metadata, body?)`         | `TraceContext`                             | `TraceContextMetadata`         | trace attributes   |
| `sendControl(messageType, metadata, tail?)` | Any client-sendable Preview4 control frame | Matching runtime metadata type | declared tail      |

`sendControl` is the typed escape hatch for `ErrorRecoverable`, `RetryAfter`, and extension-safe
control routing. It rejects a metadata type that does not match `messageType`.

## Preview4 Client Object And Cache Methods

| Method                                   | Message           | Metadata                   | Optional tail      |
| ---------------------------------------- | ----------------- | -------------------------- | ------------------ |
| `declareObject(metadata, body?)`         | `ObjectDeclare`   | `ObjectDescriptorMetadata` | object metadata    |
| `referenceObject(metadata, body?)`       | `ObjectRef`       | `ObjectReferenceMetadata`  | reference metadata |
| `releaseObject(metadata, diagnostic?)`   | `ObjectRelease`   | `ObjectReleaseMetadata`    | diagnostic bytes   |
| `patchObject(metadata, delta)`           | `ObjectPatch`     | `ObjectDeltaMetadata`      | delta bytes        |
| `sendObjectDelta(metadata, delta)`       | `ObjectDelta`     | `ObjectDeltaMetadata`      | delta bytes        |
| `referenceCache(metadata, body?)`        | `CacheReference`  | `CacheReferenceMetadata`   | cache metadata     |
| `reportCacheMiss(metadata, diagnostic?)` | `CacheMiss`       | `CacheMissMetadata`        | diagnostic bytes   |
| `invalidateCache(metadata)`              | `CacheInvalidate` | `CacheInvalidateMetadata`  | none               |

Object and cache methods return `Promise<void>`. They do not perform an implicit cache lookup before
each submit.

## Preview4 Runtime Events

`nextEvent()` and `events()` extend `NnrpRuntimeEvent` with every Preview4 runtime-frame
discriminant: `cancel`, `abort`, `priority-update`, `deadline`, `expire-at`, `supersede`,
`budget-update`, `progress`, `partial-result`, `backpressure`, `credit-update`,
`capability-negotiation`, `degrade-profile`, `route-hint`, `execution-hint`, `trace-context`,
`result-drop-reason`, `recoverable-error`, `retry-after`, `object-declare`, `object-ref`,
`object-release`, `object-patch`, `object-delta`, `cache-reference`, `cache-miss`, and
`cache-invalidate`. The exact typed fields and semantic tail names are frozen in
[Runtime Control & Objects](./runtime#typed-runtime-frame-events).

Events preserve wire order within one operation. Events from different operations may interleave.
After cancellation, `result-drop-reason` remains observable, while late `result` and
`partial-result` payloads for the cancelled operation are suppressed from normal result iteration.

## Submit Cancellation

`submit(request, options?)` and `submitNoWait(request, options?)` accept `NnrpSubmitOptions`:

| Field           | Type                  | Required | Description                                                                                         |
| --------------- | --------------------- | -------: | --------------------------------------------------------------------------------------------------- |
| `signal`        | `NnrpAbortSignalLike` |       No | An already-aborted signal rejects before dispatch; an abort after dispatch sends `CANCEL`.          |
| `timeoutMillis` | `number`              |       No | Local wait bound. The SDK sends `DEADLINE` before dispatch and cancels work when the bound expires. |

These helpers use the same control sequence allocator as explicit control methods; they do not
invent an out-of-band cancellation channel.

## `ClientSession.nextEvent`

Reads the next runtime event.

| Parameter | Type                                            | Required | Description            |
| --------- | ----------------------------------------------- | -------: | ---------------------- |
| `options` | [`NnrpEventPollOptions`](#nnrpeventpolloptions) |       No | Event polling options. |

| Returns                     |
| --------------------------- |
| `Promise<NnrpRuntimeEvent>` |

## Runtime Differences

| Area               | Native client                                                            | Browser client                                                                                     |
| ------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Package            | `@nnrp/native-client`                                                    | `@nnrp/browser-client`                                                                             |
| Runtime open       | `openNativeClient(options)` returns a connected client.                  | `openBrowserRuntime(options)` returns a runtime, then `runtime.connect(options)` returns a client. |
| Transport packages | TCP, QUIC, IPC, and WebSocket packages carry native transport artifacts. | Browser clients use the WebSocket provider with browser-client WASM.                               |
| Server APIs        | Not exposed.                                                             | Not exposed.                                                                                       |

## Option Types

### `NnrpNativeClientOptions`

| Field              | Type                                                    | Required | Description                                                                             |
| ------------------ | ------------------------------------------------------- | -------: | --------------------------------------------------------------------------------------- |
| `endpoint`         | `string`                                                |      Yes | Remote NNRP endpoint.                                                                   |
| `providerEndpoint` | `string \| URL`                                         |       No | Explicit carrier-local endpoint for diagnostics, conformance, or controlled deployment. |
| `transportPolicy`  | [`NnrpTransportPolicy`](./core#data-types)              |       No | `auto`, `prefer-*`, or `force-*` selection policy.                                      |
| `transports`       | `readonly NnrpTransportProvider[]`                      |       No | Installed native transport providers. See [Transport Providers](./transport).           |
| `sessionDefaults`  | [`NnrpSessionOptions`](#nnrpsessionoptions)             |       No | Defaults applied when sessions omit values.                                             |
| `environment`      | `Record<string, string>`                                |       No | Environment override for artifact lookup or diagnostics.                                |
| `platform`         | `string`                                                |       No | Platform override for tests and controlled packaging checks.                            |
| `ffi`              | [`NnrpNativeFfiBinding`](./native#nnrpnativeffibinding) |       No | Explicit native binding for controlled deployments and tests.                           |

### `NnrpBrowserRuntimeOptions`

| Field                | Type                                       | Required | Description                                                                                                       |
| -------------------- | ------------------------------------------ | -------: | ----------------------------------------------------------------------------------------------------------------- |
| `moduleUrl`          | `string \| URL`                            |       No | Explicit WASM module URL.                                                                                         |
| `module`             | `WebAssembly.Module`                       |       No | Precompiled WASM module.                                                                                          |
| `artifact`           | `NnrpWasmArtifactOptions`                  |       No | Browser WASM primitive manifest plus optional base URL.                                                           |
| `transportPolicy`    | [`NnrpTransportPolicy`](./core#data-types) |       No | Browser transport selection policy.                                                                               |
| `transportProviders` | `readonly NnrpBrowserTransportProvider[]`  |       No | Browser transport providers. The current SDK accepts WebSocket providers. See [Transport Providers](./transport). |

### `NnrpBrowserConnectOptions`

| Field                | Type                                                      | Required | Description                                          |
| -------------------- | --------------------------------------------------------- | -------: | ---------------------------------------------------- |
| `endpoint`           | `string`                                                  |      Yes | Remote `nnrp://` or `nnrps://` application endpoint. |
| `providerEndpoint`   | `string \| URL`                                           |       No | Explicit `ws://` or `wss://` carrier-local endpoint. |
| `transportPolicy`    | [`NnrpTransportPolicy`](./core#data-types)                |       No | Selection policy.                                    |
| `transportProviders` | `readonly NnrpBrowserTransportProvider[]`                 |       No | Browser providers for this connection.               |
| `sessionDefaults`    | [`NnrpBrowserSessionOptions`](#nnrpbrowsersessionoptions) |       No | Defaults applied when sessions omit values.          |

### `NnrpSessionOptions`

| Field           | Type                      | Required | Description                                     |
| --------------- | ------------------------- | -------: | ----------------------------------------------- |
| `inputProfile`  | `string`                  |       No | Input profile name such as `tensor` or `token`. |
| `targetCadence` | `number`                  |       No | Requested cadence.                              |
| `qualityTier`   | `number`                  |       No | Application quality tier.                       |
| `metadata`      | `Record<string, unknown>` |       No | Application metadata attached to the session.   |

### `NnrpBrowserSessionOptions`

Same shape as [`NnrpSessionOptions`](#nnrpsessionoptions), scoped to browser clients.

### `NnrpEventPollOptions`

| Field       | Type     | Required | Description                                                       |
| ----------- | -------- | -------: | ----------------------------------------------------------------- |
| `timeoutMs` | `number` |       No | Maximum event wait in milliseconds.                               |
| `maxEvents` | `number` |       No | Maximum number of events to read when the runtime batches events. |
