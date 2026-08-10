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
  providerRoutes: {
    ipc: { endpoint: "unix:///run/nnrp.sock" },
    websocket: {
      endpoint: "wss://0.0.0.0:8443/nnrp",
      security: { mode: "server", certificateDer, privateKeyPkcs8Der },
    },
  },
});
```

`force-*` opens exactly the forced eligible carrier listener. `auto` and `prefer-*` open every
eligible carrier listener; a preference only provides a stable order when accepted sessions become
available simultaneously. It does not disable other listeners, and the server does not invent peer
probe data. The connecting peer chooses the carrier it uses.

Opening the listener set is atomic. If any configured eligible listener cannot open, the runtime
closes listeners already opened for this call and rejects the first `accept()`. A carrier that
cannot derive a bind locator from `endpoint` requires an entry in `providerRoutes`; it is never
omitted silently.

`sessionDefaults` freezes transport-neutral negotiation, cache, credit, schema, recovery, and
application admission settings for every accepted session. The application policy is evaluated
exactly once for each wire-valid `SESSION_OPEN` and may complete asynchronously:

```ts
const server = runtime.listen({
  endpoint: "nnrp://0.0.0.0:4433",
  sessionDefaults: {
    applicationPolicy: {
      async evaluate(open) {
        if (open.maxInFlightOperations > 32) {
          return {
            accepted: false,
            sessionErrorCode: 17,
            diagnostic: "requested concurrency is too high",
          };
        }
        return { accepted: true, sessionErrorCode: 0 };
      },
    },
  },
});
```

The policy receives [`NnrpSessionOpenMetadata`](./core#data-types) and returns a
`Promise<NnrpServerSessionPolicyDecision>`. Rejection is scoped to that peer handshake; it does not
close the logical listener set.

## `NnrpBackendRuntime.selectTransport`

Selects a transport against a peer manifest.

| Parameter | Type                                                              | Required | Description                                                                          |
| --------- | ----------------------------------------------------------------- | -------: | ------------------------------------------------------------------------------------ |
| `options` | [`NnrpTransportSelectionOptions`](#nnrptransportselectionoptions) |      Yes | Peer manifest, workload limit, providers, policy, readiness, and probe observations. |

| Returns                         |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

## Runtime, Listener, And Session Lifecycle

| Method                                 | Parameters                                                        | Returns                      | Description                                                     |
| -------------------------------------- | ----------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------- |
| `NnrpBackendRuntime.close()`           | None                                                              | `Promise<void>`              | Closes accepted sessions, listeners, and the explicit FFI seam. |
| `NnrpServer.accept(options?)`          | [`options?: NnrpServerAcceptOptions`](#nnrpserveracceptoptions)   | `Promise<NnrpServerSession>` | Accepts the next session from the owned carrier-listener set.   |
| `NnrpServer.close()`                   | None                                                              | `Promise<void>`              | Closes every owned carrier listener and accepted session.       |
| `NnrpServerSession.nextEvent(options?)` | [`options?: NnrpEventPollOptions`](./client#nnrpeventpolloptions) | `Promise<NnrpServerEvent>`   | Reads the next ordered submit, runtime, or lifecycle event.     |
| `NnrpServerSession.receiveSubmit(options?)` | [`options?: NnrpEventPollOptions`](./client#nnrpeventpolloptions) | `Promise<NnrpServerOperation>` | Selects the next submit while retaining skipped events.       |
| `NnrpServerSession.close()`            | None                                                              | `Promise<void>`              | Closes the accepted role session exactly once.                  |

`NnrpServerSession.activeTransport` is the `NnrpTransportKind` of the listener that accepted the
carrier. It matches the negotiated active transport and is not derived from listener preference
order.

`NnrpServer.boundProviderEndpoints` is a readonly partial record keyed by `NnrpTransportKind`,
containing the actual endpoint of every opened listener. A terminal provider-listener failure fails
the logical server and closes the remaining listener set; a rejected peer handshake affects only
that accepted carrier.

## Server Events And Operation Replies

`NnrpServerSession.nextEvent(options?)` returns a closed `NnrpServerEvent` tagged union. Its `submit`
variant owns `NnrpServerOperation`, its `runtime` variant owns a non-submit `NnrpRuntimeEvent`, and
its `lifecycle` variant owns a headerless `NnrpOperationLifecycleEvent`. `receiveSubmit(options?)`
is selective but retains every skipped event for the next event-pump read.

The returned operation owns every operation-scoped reply:

| Method | Message | Metadata | Optional tail |
| --- | --- | --- | --- |
| `sendResult(metadata, body?)` | `ResultPush` | `NnrpResultPushMetadata` | result body |
| `sendResultDrop(metadata, diagnostic?)` | `ResultDropReason` | `ResultDropReasonMetadata` | diagnostic bytes |
| `sendProgress(metadata, body?)` | `Progress` | [`ProgressMetadata`](./runtime#runtime-control-metadata) | progress body |
| `sendPartialResult(metadata, body?)` | `PartialResult` | `PartialResultMetadata` | inline partial result |

All four methods return `Promise<void>`. The operation validates its session and `operationId`, and
only one terminal method may succeed. `NnrpServerSession` does not expose parallel operation-reply
methods.

## Preview4 Server Session Methods

The session owns non-operation server output:

| Method                                        | Message                                    | Metadata                                                 | Optional tail         |
| --------------------------------------------- | ------------------------------------------ | -------------------------------------------------------- | --------------------- |
| `sendBackpressure(metadata)`                  | `Backpressure`                             | `PressureMetadata`                                       | none                  |
| `sendCreditUpdate(metadata)`                  | `CreditUpdate`                             | `PressureMetadata`                                       | none                  |
| `sendTraceContext(metadata, body?)`           | `TraceContext`                             | `TraceContextMetadata`                                   | trace attributes      |
| `sendRecoverableError(metadata, diagnostic?)` | `ErrorRecoverable`                         | `RecoverableErrorMetadata`                               | diagnostic bytes      |
| `sendRetryAfter(metadata, diagnostic?)`       | `RetryAfter`                               | `RetryAfterMetadata`                                     | diagnostic bytes      |
| `sendControl(messageType, metadata, tail?)`   | Any non-operation server-sendable Preview4 control frame | Matching runtime metadata type              | declared tail         |

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
by the delta bytes. Operation replies remain separate from object-delta frames.

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

| Field             | Type                                                    | Required | Description                                               |
| ----------------- | ------------------------------------------------------- | -------: | --------------------------------------------------------- |
| `endpoint`        | `string \| URL`                                         |      Yes | Local NNRP endpoint shared by the logical listener set.   |
| `providerRoutes`  | `NnrpServerProviderRoutes`                              |       No | Per-carrier bind locator and server security.             |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#data-types)              |       No | Listener-set eligibility and stable preference policy.    |
| `transports`      | `readonly NnrpNativeTransportProvider[]`                |       No | Transport providers allowed in this logical listener set. |
| `sessionDefaults` | [`NnrpServerSessionOptions`](#nnrpserversessionoptions) |       No | Negotiation and admission defaults for accepted sessions. |

### `NnrpServerSessionOptions`

| Field                    | Type                                                  | Default                    | Description                                              |
| ------------------------ | ----------------------------------------------------- | -------------------------- | -------------------------------------------------------- |
| `supportedProfiles`      | `readonly number[]`                                   | `[STANDARD_PROFILE_TOKEN]` | Profiles accepted during `SESSION_OPEN`.                 |
| `supportedCacheObjects`  | `readonly NnrpCacheObjectKind[]`                      | `[]`                       | Cache object kinds advertised by the server.             |
| `maxCacheObjects`        | `bigint`                                              | `0n`                       | Maximum retained cache objects; zero disables the limit. |
| `maxCacheObjectBytes`    | `number`                                              | `0`                        | Maximum bytes per cache object; zero disables the limit. |
| `schemaRegistry`         | [`NnrpSchemaRegistry`](./core#data-types)             | standard registry          | Schemas accepted by the server session.                  |
| `resumeTokenBytes`       | `number`                                              | `24`                       | Opaque recovery-token capacity.                          |
| `maxInFlightOperations`  | `number`                                              | `4`                        | Maximum concurrent operations negotiated per session.    |
| `grantedOperationCredit` | `number`                                              | `2`                        | Initial operation credit granted to the peer.            |
| `leaseTtlMs`             | `number`                                              | `30_000`                   | Default operation lease lifetime.                        |
| `resumeWindowMs`         | `number`                                              | `120_000`                  | Time during which a disconnected session may resume.     |
| `applicationPolicy`      | [`NnrpServerSessionPolicy`](#nnrpserversessionpolicy) | accept valid sessions      | Asynchronous application admission policy.               |

### `NnrpServerSessionPolicy`

```ts
interface NnrpServerSessionPolicy {
  evaluate(open: NnrpSessionOpenMetadata): Promise<NnrpServerSessionPolicyDecision>;
}
```

`NnrpServerSessionPolicyDecision` contains `accepted: boolean`, `sessionErrorCode: number`, and an
optional `diagnostic: string`. Accepted decisions use error code `0`; rejected decisions use a
non-zero application-defined session error code.

### `NnrpServerAcceptOptions`

| Field       | Type     | Default | Description                                                     |
| ----------- | -------- | ------- | --------------------------------------------------------------- |
| `timeoutMs` | `number` | `0`     | Bounded accept wait; zero uses the runtime's non-blocking mode. |

Native session handles and generations are internal and are never accepted through this option.

### `NnrpTransportSelectionOptions`

| Field                    | Type                                          | Required | Description                                                 |
| ------------------------ | --------------------------------------------- | -------: | ----------------------------------------------------------- |
| `peerManifest`           | [`NnrpCapabilityManifest`](./core#data-types) |      Yes | Peer capability manifest.                                   |
| `providers`              | `readonly NnrpTransportProvider[]`            |       No | Local providers to consider.                                |
| `policy`                 | [`NnrpTransportPolicy`](./core#data-types)    |       No | Selection policy override.                                  |
| `requestedMaxFrameBytes` | `bigint`                                      |       No | Workload limit checked against provider limits.             |
| `candidateReadiness`     | `readonly NnrpTransportCandidateReadiness[]`  |      Yes | Route/security evidence for every provider candidate.       |
| `probeObservations`      | `readonly NnrpTransportProbeObservation[]`    |       No | Succeeded/failed probe evidence keyed by provider identity. |
