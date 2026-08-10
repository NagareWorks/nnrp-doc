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

| Parameter | Type                                                  | Required | Description                                                                                            |
| --------- | ----------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------ |
| `options` | [`NnrpNativeClientOptions`](#nnrpnativeclientoptions) |      Yes | Endpoint, transport policy, installed transport providers, session defaults, and optional FFI binding. |

| Returns               | Throws                                                        |
| --------------------- | ------------------------------------------------------------- |
| `Promise<NnrpClient>` | `NnrpCapabilityError` or `NnrpNativeBindingUnavailableError`. |

```ts
import { openNativeClient } from "@nnrp/native-client";
import { createTcpTransportProvider } from "@nnrp/transport-tcp";
import { createQuicTransportProvider } from "@nnrp/transport-quic";

const client = await openNativeClient({
  endpoint: "nnrps://runtime.example/session/default",
  providerRoutes: {
    quic: {
      security: { mode: "client", serverName: "runtime.example", trustedCertificateDer },
    },
    tcp: {
      security: { mode: "client", serverName: "runtime.example", trustedCertificateDer },
    },
  },
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
  providerRoutes: {
    websocket: { endpoint: "wss://runtime.example/nnrp" },
  },
  transportPolicy: "auto",
});
```

## `NnrpClient.openSession`

Opens a client session. Native and browser clients expose the same session concept.

| Parameter | Type                                                                                                     | Required | Description                                                          |
| --------- | -------------------------------------------------------------------------------------------------------- | -------: | -------------------------------------------------------------------- |
| `options` | [`NnrpSessionOptions`](#nnrpsessionoptions) or [`NnrpBrowserSessionOptions`](#nnrpbrowsersessionoptions) |       No | Transport-neutral `SESSION_OPEN` intent and local recovery capacity. |

| Returns                                                             |
| ------------------------------------------------------------------- |
| `Promise<NnrpClientSession>` or `Promise<NnrpBrowserClientSession>` |

```ts
const session = await client.openSession({ profileId: 1 });
```

`openSession` completes only after the runtime has finished the automatic connection handshake and
received `SESSION_OPEN_ACK`. It does not return a lazy session wrapper.

## `NnrpClient.resumeSession`

Resumes one runtime-issued session on the existing logical client connection. Native and browser
clients expose the same asynchronous operation.

| Parameter | Type                                                                                                     | Required | Description                                      |
| --------- | -------------------------------------------------------------------------------------------------------- | -------: | ------------------------------------------------ |
| `ticket`  | [`NnrpSessionRecoveryTicket`](./core#nnrpsessionrecoveryticket)                                          |      Yes | Opaque canonical NRTK ticket issued by runtime.  |
| `options` | [`NnrpSessionOptions`](#nnrpsessionoptions) or [`NnrpBrowserSessionOptions`](#nnrpbrowsersessionoptions) |       No | Optional overrides for the resumed session open. |

| Returns                                                             |
| ------------------------------------------------------------------- |
| `Promise<NnrpClientSession>` or `Promise<NnrpBrowserClientSession>` |

Invalid, expired, truncated, or unknown tickets reject. They never fall back to a fresh session.

## Client Lifecycle Methods

These methods have the same shape on `NnrpClient` and `NnrpBrowserClient`.

| Method                                  | Parameters                                                                     | Returns                     | Description                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------ |
| `nextSessionEvent(sessionId, options?)` | `sessionId: number`, [`options?: NnrpEventPollOptions`](#nnrpeventpolloptions) | `Promise<NnrpClientEvent>` | Reads the next event for one negotiated session.              |
| `close()`                               | None                                                                           | `Promise<void>`             | Closes owned sessions, the role connection, and the runtime. |

## `ClientSession.submit`

Submits a request and waits for a result. Native clients use the native submit/result hot path;
browser clients use the browser runtime path, but the request shape is shared.

| Parameter | Type                                     | Required | Description                                                                                                    |
| --------- | ---------------------------------------- | -------: | -------------------------------------------------------------------------------------------------------------- |
| `request` | [`NnrpSubmitRequest`](./core#data-types) |      Yes | Non-zero operation id, independent frame id, payload/tensors, profile, cache/schema metadata, and submit mode. |

| Returns               |
| --------------------- |
| `Promise<NnrpResult>` |

```ts
const result = await session.submit({
  operationId: 1n,
  frameId: 1,
  payload: new Uint8Array([1, 2, 3]),
  inputProfile: "tensor",
  submitMode: "inline",
});
```

## `ClientSession.submitNoWait`

Submits a request and returns the operation id. Native and browser client sessions both expose this
method.

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

| Method                                            | Message           | Metadata                   | Optional tail             |
| ------------------------------------------------- | ----------------- | -------------------------- | ------------------------- |
| `declareObject(metadata, body?)`                  | `ObjectDeclare`   | `ObjectDescriptorMetadata` | object metadata           |
| `referenceObject(metadata, body?)`                | `ObjectRef`       | `ObjectReferenceMetadata`  | reference metadata        |
| `releaseObject(metadata, diagnostic?)`            | `ObjectRelease`   | `ObjectReleaseMetadata`    | diagnostic bytes          |
| `patchObject(metadata, delta, metadataBody?)`     | `ObjectPatch`     | `ObjectDeltaMetadata`      | metadata body, then delta |
| `sendObjectDelta(metadata, delta, metadataBody?)` | `ObjectDelta`     | `ObjectDeltaMetadata`      | metadata body, then delta |
| `referenceCache(metadata, body?)`                 | `CacheReference`  | `CacheReferenceMetadata`   | cache metadata            |
| `reportCacheMiss(metadata, diagnostic?)`          | `CacheMiss`       | `CacheMissMetadata`        | diagnostic bytes          |
| `invalidateCache(metadata)`                       | `CacheInvalidate` | `CacheInvalidateMetadata`  | none                      |

For object patch and delta methods, `metadataBody.byteLength` must equal `metadata.metadataBytes`
and `delta.byteLength` must equal `metadata.deltaBytes`. The wire tail is the metadata body followed
by the delta bytes. Object and cache methods return `Promise<void>`. They do not perform an implicit
cache lookup before each submit.

## Preview4 Runtime Events

The runtime variant returned by `nextEvent()` and `events()` supports every Preview4 runtime-frame
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

| Field           | Type                                       | Required | Description                                                                                         |
| --------------- | ------------------------------------------ | -------: | --------------------------------------------------------------------------------------------------- |
| `signal`        | [`NnrpAbortSignalLike`](./core#data-types) |       No | An already-aborted signal rejects before dispatch; an abort after dispatch sends `CANCEL`.          |
| `timeoutMillis` | `number`                                   |       No | Local wait bound. The SDK sends `DEADLINE` before dispatch and cancels work when the bound expires. |

These helpers use the same control sequence allocator as explicit control methods; they do not
invent an out-of-band cancellation channel.

Cancellation of an already-dispatched `submit()` deterministically rejects that submit wait with
[`NnrpTimeoutError`](./core#errors), whose `diagnostic.code` is `NNRP_SUBMIT_CANCELLED`, after
initiating `CANCEL`. Expiry rejects it with the same error class and the `NNRP_SUBMIT_TIMEOUT`
diagnostic code after initiating `CANCEL`; the pre-dispatch `DEADLINE` remains part of the wire flow.
In both cases, the local terminal lifecycle event remains available from `nextEvent()` and must not
race the same `submit()` into a resolved `NnrpResult`. A terminal lifecycle initiated independently
by the peer may still resolve `submit()` as non-success `NnrpResult` evidence.

## `ClientSession.nextEvent`

Reads the next client event. `NnrpClientEvent` is a closed tagged union with a `runtime`
`NnrpRuntimeEvent` variant and a `lifecycle` `NnrpOperationLifecycleEvent` variant.

| Parameter | Type                                            | Required | Description            |
| --------- | ----------------------------------------------- | -------: | ---------------------- |
| `options` | [`NnrpEventPollOptions`](#nnrpeventpolloptions) |       No | Event polling options. |

| Returns                    |
| -------------------------- |
| `Promise<NnrpClientEvent>` |

## Client Session Lifecycle And Results

| Method                 | Parameters                                                        | Returns                                  | Description                                                                   |
| ---------------------- | ----------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| `inFlightFrames()`     | None                                                              | `readonly number[]`                      | Returns frame ids that have not reached terminal state.                       |
| `completeEvent(event)` | [`event: NnrpRuntimeEvent`](./runtime#typed-runtime-frame-events) | `void`                                   | Applies terminal bookkeeping for an externally consumed event.                |
| `nextResult(options?)` | [`options?: NnrpEventPollOptions`](#nnrpeventpolloptions)         | `Promise<NnrpResult>`                    | Skips non-result events and returns the next terminal result.                 |
| `migrate(request)`     | [`request: NnrpSessionMigrationRequest`](./core#data-types)       | `Promise<void>`                          | Requests session migration; unsupported runtimes return a typed diagnostic.   |
| `patch(request)`       | [`request: NnrpSessionPatchRequest`](./core#data-types)           | `Promise<NnrpSessionPatchResult>`        | Applies mutable session metadata, profile, cadence, quality, or credits.      |
| `events(options?)`     | [`options?: NnrpEventPollOptions`](#nnrpeventpolloptions)         | `AsyncIterable<NnrpClientEvent>`         | Iterates events until the session closes or polling fails.                    |
| `recoveryTicket()`     | None                                                              | `NnrpSessionRecoveryTicket \| undefined` | Returns the latest runtime-issued ticket snapshot when resume was negotiated. |
| `close()`              | None                                                              | `Promise<void>`                          | Closes the role session and releases its in-flight state.                     |

## Runtime Differences

| Area               | Native client                                                            | Browser client                                                                                     |
| ------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Package            | `@nnrp/native-client`                                                    | `@nnrp/browser-client`                                                                             |
| Runtime open       | `openNativeClient(options)` returns a connected client.                  | `openBrowserRuntime(options)` returns a runtime, then `runtime.connect(options)` returns a client. |
| Transport packages | TCP, QUIC, IPC, and WebSocket packages carry native transport artifacts. | Browser clients use the WebSocket provider with browser-client WASM.                               |
| Server APIs        | Not exposed.                                                             | Not exposed.                                                                                       |

## Option Types

### `NnrpNativeClientOptions`

| Field             | Type                                                    | Required | Description                                                                   |
| ----------------- | ------------------------------------------------------- | -------: | ----------------------------------------------------------------------------- |
| `endpoint`        | `string \| URL`                                         |      Yes | Remote NNRP endpoint.                                                         |
| `providerRoutes`  | `NnrpClientProviderRoutes`                              |       No | Per-carrier locator and peer-verification configuration.                      |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#data-types)              |       No | `auto`, `prefer-*`, or `force-*` selection policy.                            |
| `transports`      | `readonly NnrpNativeTransportProvider[]`                |       No | Installed native transport providers. See [Transport Providers](./transport). |
| `sessionDefaults` | [`NnrpSessionOptions`](#nnrpsessionoptions)             |       No | Defaults applied when sessions omit values.                                   |
| `ffi`             | [`NnrpNativeFfiBinding`](./native#nnrpnativeffibinding) |       No | Explicit native binding for controlled integration and tests.                 |

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
| `providerRoutes`     | `NnrpClientProviderRoutes`                                |       No | WebSocket route; browser trust remains host-owned.   |
| `transportPolicy`    | [`NnrpTransportPolicy`](./core#data-types)                |       No | Selection policy.                                    |
| `transportProviders` | `readonly NnrpBrowserTransportProvider[]`                 |       No | Browser providers for this connection.               |
| `sessionDefaults`    | [`NnrpBrowserSessionOptions`](#nnrpbrowsersessionoptions) |       No | Defaults applied when sessions omit values.          |

### `NnrpSessionPriorityClass`

| Member        | Wire value | Meaning                                                         |
| ------------- | ---------: | --------------------------------------------------------------- |
| `Interactive` |          0 | Latency-sensitive work that should be scheduled first.          |
| `Balanced`    |          1 | Default scheduling class for ordinary interactive workloads.    |
| `Background`  |          2 | Throughput-oriented work that may yield to interactive traffic. |

### `NnrpSessionOptions`

| Field                   | Type                                                    | Default                    | Description                                                                      |
| ----------------------- | ------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| `requestedSessionId`    | `number`                                                | `0`                        | Preferred wire session id; zero lets the server assign it.                       |
| `profileId`             | `number`                                                | standard token profile     | Requested profile registry id.                                                   |
| `schemaId`              | `number`                                                | token-delta schema id      | Requested schema registry id.                                                    |
| `schemaVersion`         | `number`                                                | token-delta schema version | Requested schema version.                                                        |
| `priorityClass`         | [`NnrpSessionPriorityClass`](#nnrpsessionpriorityclass) | `Balanced`                 | Requested scheduling class.                                                      |
| `defaultDeadlineMillis` | `number`                                                | `500`                      | Default operation deadline.                                                      |
| `maxInFlightOperations` | `number`                                                | `4`                        | Requested session concurrency ceiling.                                           |
| `leaseTtlHintMillis`    | `number`                                                | `30000`                    | Requested cache lease lifetime.                                                  |
| `allowResume`           | `boolean`                                               | `false`                    | Enables resumable-session negotiation.                                           |
| `resumeTokenBytes`      | `number`                                                | `0`                        | Maximum opaque recovery-token bytes accepted locally; zero uses runtime default. |
| `cacheHints`            | `readonly NnrpCacheObjectKind[]`                        | `[]`                       | Connection capability hints folded into automatic `CLIENT_HELLO`.                |

All numeric fields are range-checked against their frozen wire widths. Handles, generations,
authentication lengths, extension lengths, and client tags are derived or internal and are not
public options. Cadence, quality tier, application metadata, submit-capacity policy, and local
credit updates belong to profile, patch, or flow-control APIs rather than `SESSION_OPEN`.

### `NnrpBrowserSessionOptions`

Same shape and defaults as [`NnrpSessionOptions`](#nnrpsessionoptions), scoped to browser clients.
The browser host owns the WebSocket carrier while Rust WASM owns handshake, multiplexed session,
resume, and recovery-ticket semantics.

### `NnrpEventPollOptions`

| Field           | Type                                       | Required | Description                         |
| --------------- | ------------------------------------------ | -------: | ----------------------------------- |
| `timeoutMillis` | `number`                                   |       No | Maximum event wait in milliseconds. |
| `signal`        | [`NnrpAbortSignalLike`](./core#data-types) |       No | Cancels the pending event wait.     |
