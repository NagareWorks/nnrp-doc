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
  transportPolicy: "tcp-only",
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

## Boundary Rules

| Package                                        | Owns                                                         | Must not own                                                        |
| ---------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `@nnrp/native-server`                          | Server runtime, listen lifecycle, backend runtime lifecycle. | TCP/QUIC artifacts, browser code, or client-only top-level helpers. |
| `@nnrp/native-client`                          | Client runtime and session lifecycle.                        | Server listener APIs.                                               |
| `@nnrp/transport-tcp` / `@nnrp/transport-quic` | Transport behavior and packaged artifacts.                   | Server or client role lifecycle.                                    |

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

| Field             | Type                                       | Required | Description                                    |
| ----------------- | ------------------------------------------ | -------: | ---------------------------------------------- |
| `endpoint`        | `string`                                   |      Yes | Local endpoint to listen on.                   |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#data-types) |       No | Selection policy for the listener.             |
| `transports`      | `readonly NnrpTransportProvider[]`         |       No | Transport providers allowed for this listener. |

### `NnrpConnectOptions`

| Field             | Type                                                | Required | Description                                      |
| ----------------- | --------------------------------------------------- | -------: | ------------------------------------------------ |
| `endpoint`        | `string`                                            |      Yes | Remote endpoint.                                 |
| `transportPolicy` | [`NnrpTransportPolicy`](./core#data-types)          |       No | Selection policy for the connection.             |
| `transports`      | `readonly NnrpTransportProvider[]`                  |       No | Transport providers allowed for this connection. |
| `sessionDefaults` | [`NnrpSessionOptions`](./client#nnrpsessionoptions) |       No | Defaults applied when sessions omit values.      |

### `NnrpTransportSelectionOptions`

| Field          | Type                                          | Required | Description                |
| -------------- | --------------------------------------------- | -------: | -------------------------- |
| `peerManifest` | [`NnrpCapabilityManifest`](./core#data-types) |      Yes | Peer capability manifest.  |
| `providers`    | `readonly NnrpTransportProvider[]`            |       No | Local providers to score.  |
| `policy`       | [`NnrpTransportPolicy`](./core#data-types)    |       No | Selection policy override. |
