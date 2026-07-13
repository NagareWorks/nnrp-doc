# JavaScript/TypeScript Server API

Server APIs live in `@nnrp/native-server`. Browser packages do not expose server entrypoints.

## `openBackendRuntime`

Creates a native backend runtime without immediately starting a listener.

| Parameter | Type                                                      | Required | Description                                                                                                |
| --------- | --------------------------------------------------------- | -------: | ---------------------------------------------------------------------------------------------------------- |
| `options` | [`NnrpBackendRuntimeOptions`](#nnrpbackendruntimeoptions) |       No | Transport policy, installed transport providers, environment/platform overrides, and optional FFI binding. |

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

Creates a backend server listener.

| Parameter | Type                                      | Required | Description                                                                  |
| --------- | ----------------------------------------- | -------: | ---------------------------------------------------------------------------- |
| `options` | [`NnrpListenOptions`](#nnrplistenoptions) |      Yes | Local endpoint, optional transport policy, and optional transport providers. |

| Returns      |
| ------------ |
| `NnrpServer` |

```ts
const server = runtime.listen({ endpoint: "0.0.0.0:4433" });
```

## `NnrpBackendRuntime.connect`

Creates a native client from an existing backend runtime. Use this when a backend process owns both
server and client lifecycle.

| Parameter | Type                                        | Required | Description                                                                                       |
| --------- | ------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| `options` | [`NnrpConnectOptions`](#nnrpconnectoptions) |      Yes | Endpoint, optional transport policy, optional transport providers, and optional session defaults. |

| Returns      |
| ------------ |
| `NnrpClient` |

## `NnrpBackendRuntime.selectTransport`

Selects a transport against a peer manifest.

| Parameter | Type                                                              | Required | Description                                 |
| --------- | ----------------------------------------------------------------- | -------: | ------------------------------------------- |
| `options` | [`NnrpTransportSelectionOptions`](#nnrptransportselectionoptions) |      Yes | Peer manifest and optional score overrides. |

| Returns                         |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

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

The final `sendResult(result)` remains separate from partial-result and object-delta frames.

## Boundary Rules

| Package                                                                                              | Owns                                                         | Must not own                                                        |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `@nnrp/native-server`                                                                                | Server runtime, listen lifecycle, backend runtime lifecycle. | TCP/QUIC artifacts, browser code, or client-only top-level helpers. |
| `@nnrp/native-client`                                                                                | Client runtime and session lifecycle.                        | Server listener APIs.                                               |
| `@nnrp/transport-tcp` / `@nnrp/transport-quic` / `@nnrp/transport-ipc` / `@nnrp/transport-websocket` | Transport behavior and packaged native artifacts.            | Server or client role lifecycle.                                    |

## Option Types

### `NnrpBackendRuntimeOptions`

| Field             | Type                                                    | Required | Description                                                                   |
| ----------------- | ------------------------------------------------------- | -------: | ----------------------------------------------------------------------------- |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#data-types)              |       No | Default selection policy.                                                     |
| `transports`      | `readonly NnrpTransportProvider[]`                      |       No | Installed native transport providers. See [Transport Providers](./transport). |
| `environment`     | `Record<string, string>`                                |       No | Environment override for artifact lookup or diagnostics.                      |
| `platform`        | `string`                                                |       No | Platform override for tests and controlled packaging checks.                  |
| `ffi`             | [`NnrpNativeFfiBinding`](./native#nnrpnativeffibinding) |       No | Explicit native binding for controlled deployments and tests.                 |

### `NnrpListenOptions`

| Field              | Type                                       | Required | Description                                    |
| ------------------ | ------------------------------------------ | -------: | ---------------------------------------------- |
| `endpoint`         | `string`                                   |      Yes | Local endpoint to listen on.                   |
| `providerEndpoint` | `string \| URL`                            |       No | Explicit carrier-local bind endpoint.          |
| `transportPolicy`  | [`NnrpTransportPolicy`](./core#data-types) |       No | Selection policy for the listener.             |
| `transports`       | `readonly NnrpTransportProvider[]`         |       No | Transport providers allowed for this listener. |

### `NnrpConnectOptions`

| Field              | Type                                                | Required | Description                                      |
| ------------------ | --------------------------------------------------- | -------: | ------------------------------------------------ |
| `endpoint`         | `string`                                            |      Yes | Remote endpoint.                                 |
| `providerEndpoint` | `string \| URL`                                     |       No | Explicit carrier-local connect endpoint.         |
| `transportPolicy`  | [`NnrpTransportPolicy`](./core#data-types)          |       No | Selection policy for the connection.             |
| `transports`       | `readonly NnrpTransportProvider[]`                  |       No | Transport providers allowed for this connection. |
| `sessionDefaults`  | [`NnrpSessionOptions`](./client#nnrpsessionoptions) |       No | Defaults applied when sessions omit values.      |

### `NnrpTransportSelectionOptions`

| Field          | Type                                          | Required | Description                |
| -------------- | --------------------------------------------- | -------: | -------------------------- |
| `peerManifest` | [`NnrpCapabilityManifest`](./core#data-types) |      Yes | Peer capability manifest.  |
| `providers`    | `readonly NnrpTransportProvider[]`            |       No | Local providers to score.  |
| `policy`       | [`NnrpTransportPolicy`](./core#data-types)    |       No | Selection policy override. |
