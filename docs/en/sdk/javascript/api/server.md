# JavaScript/TypeScript Server API

Server APIs live in `@nnrp/native-server`. Browser packages do not expose server entrypoints.

## `openBackendRuntime`

Creates a native backend runtime without immediately starting a listener.

| Parameter | Type                                                      | Required | Description                                                                |
| --------- | --------------------------------------------------------- | -------: | -------------------------------------------------------------------------- |
| `options` | [`NnrpBackendRuntimeOptions`](#nnrpbackendruntimeoptions) |       No | Transport policy, installed transport providers, and optional FFI binding. |

| Returns                       |
| ----------------------------- |
| `Promise<NnrpBackendRuntime>` |

```ts
import { openBackendRuntime } from "@nnrp/native-server";
import { createTcpTransportProvider } from "@nnrp/transport-tcp";

const runtime = await openBackendRuntime({
  transportPolicy: "force-tcp",
  transports: [createTcpTransportProvider()],
});
```

## `NnrpBackendRuntime.listen`

Creates one logical backend server listener. The logical listener owns every eligible carrier
listener allowed by its transport policy and installed providers.

| Parameter | Type                                      | Required | Description                                                                  |
| --------- | ----------------------------------------- | -------: | ---------------------------------------------------------------------------- |
| `options` | [`NnrpListenOptions`](#nnrplistenoptions) |      Yes | Local endpoint, optional transport policy, and optional transport providers. |

| Returns      |
| ------------ |
| `NnrpServer` |

```ts
const server = runtime.listen({
  endpoint: "nnrp://0.0.0.0:4433",
  providerEndpoints: {
    ipc: "unix:///run/nnrp.sock",
    websocket: "wss://0.0.0.0:8443/nnrp",
  },
});
```

`force-*` opens exactly the forced eligible carrier listener. `auto` and `prefer-*` open every
eligible carrier listener; a preference only provides a stable order when accepted sessions become
available simultaneously. It does not disable other listeners, and the server does not invent peer
probe data. The connecting peer chooses the carrier it uses.

Opening the listener set is atomic. If any configured eligible listener cannot open, the runtime
closes listeners already opened for this call and rejects the first `accept()`. A carrier that
cannot derive a bind locator from `endpoint` requires an entry in `providerEndpoints`; it is never
omitted silently.

## `NnrpBackendRuntime.selectTransport`

Selects a transport against a peer manifest.

| Parameter | Type                                                              | Required | Description                                                          |
| --------- | ----------------------------------------------------------------- | -------: | -------------------------------------------------------------------- |
| `options` | [`NnrpTransportSelectionOptions`](#nnrptransportselectionoptions) |      Yes | Peer manifest, workload limit, providers, policy, and probe metrics. |

| Returns                         |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

## Runtime, Listener, And Session Lifecycle

| Method                                 | Parameters                                                        | Returns                      | Description                                                     |
| -------------------------------------- | ----------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------- |
| `NnrpBackendRuntime.close()`           | None                                                              | `Promise<void>`              | Closes accepted sessions, listeners, and the explicit FFI seam. |
| `NnrpServer.accept()`                  | None                                                              | `Promise<NnrpServerSession>` | Accepts the next session from the owned carrier-listener set.   |
| `NnrpServer.close()`                   | None                                                              | `Promise<void>`              | Closes every owned carrier listener and accepted session.       |
| `NnrpServerSession.receive(options?)`  | [`options?: NnrpEventPollOptions`](./client#nnrpeventpolloptions) | `Promise<NnrpRuntimeEvent>`  | Reads the next ordered submit, control, object, or cache event. |
| `NnrpServerSession.sendResult(result)` | [`result: NnrpResult`](./core#data-types)                         | `Promise<void>`              | Sends the one terminal result for the current operation.        |
| `NnrpServerSession.close()`            | None                                                              | `Promise<void>`              | Closes the accepted role session exactly once.                  |

## Preview4 Server Session Methods

`NnrpServerSession.receive(options?)` returns the same typed `NnrpRuntimeEvent` union used by client
sessions, including incoming control, runtime-object, and cache frames. The server sends incremental
state with these methods:

| Method                                        | Message                                    | Metadata                                                 | Optional tail         |
| --------------------------------------------- | ------------------------------------------ | -------------------------------------------------------- | --------------------- |
| `sendProgress(metadata, body?)`               | `Progress`                                 | [`ProgressMetadata`](./runtime#runtime-control-metadata) | progress body         |
| `sendPartialResult(metadata, body?)`          | `PartialResult`                            | `PartialResultMetadata`                                  | inline partial result |
| `sendBackpressure(metadata)`                  | `Backpressure`                             | `PressureMetadata`                                       | none                  |
| `sendCreditUpdate(metadata)`                  | `CreditUpdate`                             | `PressureMetadata`                                       | none                  |
| `sendResultDropReason(metadata, diagnostic?)` | `ResultDropReason`                         | `ResultDropReasonMetadata`                               | diagnostic bytes      |
| `sendTraceContext(metadata, body?)`           | `TraceContext`                             | `TraceContextMetadata`                                   | trace attributes      |
| `sendRecoverableError(metadata, diagnostic?)` | `ErrorRecoverable`                         | `RecoverableErrorMetadata`                               | diagnostic bytes      |
| `sendRetryAfter(metadata, diagnostic?)`       | `RetryAfter`                               | `RetryAfterMetadata`                                     | diagnostic bytes      |
| `sendControl(messageType, metadata, tail?)`   | Any server-sendable Preview4 control frame | Matching runtime metadata type                           | declared tail         |

All methods return `Promise<void>`. Metadata/body length mismatches fail before the frame reaches
the carrier provider.

## Preview4 Server Object And Cache Methods

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
by the delta bytes. The final `sendResult(result)` remains separate from partial-result and
object-delta frames.

## Boundary Rules

| Package                                                                                              | Owns                                                         | Must not own                                                         |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| `@nnrp/native-server`                                                                                | Server runtime, listen lifecycle, backend runtime lifecycle. | Transport artifacts, browser code, client sessions, or connect APIs. |
| `@nnrp/native-client`                                                                                | Client runtime and session lifecycle.                        | Server listener APIs.                                                |
| `@nnrp/transport-tcp` / `@nnrp/transport-quic` / `@nnrp/transport-ipc` / `@nnrp/transport-websocket` | Transport behavior and packaged native artifacts.            | Server or client role lifecycle.                                     |

## Option Types

### `NnrpBackendRuntimeOptions`

| Field             | Type                                                    | Required | Description                                                                   |
| ----------------- | ------------------------------------------------------- | -------: | ----------------------------------------------------------------------------- |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#data-types)              |       No | Default selection policy.                                                     |
| `transports`      | `readonly NnrpNativeTransportProvider[]`                |       No | Installed native transport providers. See [Transport Providers](./transport). |
| `ffi`             | [`NnrpNativeFfiBinding`](./native#nnrpnativeffibinding) |       No | Explicit native binding for controlled integration and tests.                 |

### `NnrpListenOptions`

| Field               | Type                                                          | Required | Description                                               |
| ------------------- | ------------------------------------------------------------- | -------: | --------------------------------------------------------- |
| `endpoint`          | `string \| URL`                                               |      Yes | Local NNRP endpoint shared by the logical listener set.   |
| `providerEndpoints` | `Readonly<Partial<Record<NnrpTransportKind, string \| URL>>>` |       No | Carrier-local bind locators keyed by transport kind.      |
| `security`          | `NnrpTransportServerSecurity`                                 |       No | QUIC or `wss://` certificate and private key.             |
| `transportPolicy`   | [`NnrpTransportPolicy`](./core#data-types)                    |       No | Listener-set eligibility and stable preference policy.    |
| `transports`        | `readonly NnrpNativeTransportProvider[]`                      |       No | Transport providers allowed in this logical listener set. |

### `NnrpTransportSelectionOptions`

| Field                      | Type                                                  | Required | Description                                                   |
| -------------------------- | ----------------------------------------------------- | -------: | ------------------------------------------------------------- |
| `peerManifest`             | [`NnrpCapabilityManifest`](./core#data-types)         |      Yes | Peer capability manifest.                                     |
| `providers`                | `readonly NnrpTransportProvider[]`                    |       No | Local providers to consider.                                  |
| `policy`                   | [`NnrpTransportPolicy`](./core#data-types)            |       No | Selection policy override.                                    |
| `requestedMaxFrameBytes`   | `bigint`                                              |       No | Workload limit checked against provider limits.               |
| `probeMetricsByProviderId` | `Readonly<Record<string, NnrpTransportProbeMetrics>>` |       No | Structured test/deployment observations keyed by provider id. |
