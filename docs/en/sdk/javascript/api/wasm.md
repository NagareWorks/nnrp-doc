# JavaScript/TypeScript WASM Browser API

`@nnrp/wasm` is for browser and edge clients. It validates `nnrp-rs` WASM primitive manifests,
resolves WASM asset URLs, and exposes browser client sessions.

## `openBrowserRuntime`

Creates a browser runtime.

| Parameter | Type                     | Required | Description                                                                                           |
| --------- | ------------------------ | -------: | ----------------------------------------------------------------------------------------------------- |
| `options` | `NnrpWasmRuntimeOptions` |       No | Module URL, precompiled module, artifact manifest, transport policy, and browser transport providers. |

| Returns                       |
| ----------------------------- |
| `Promise<NnrpBrowserRuntime>` |

```ts
import { openBrowserRuntime } from "@nnrp/wasm";

const runtime = await openBrowserRuntime({
  moduleUrl: "/assets/nnrp_wasm.wasm",
});
```

## `NnrpBrowserRuntime.connect`

Creates a browser client.

| Parameter | Type                        | Required | Description                                                     |
| --------- | --------------------------- | -------: | --------------------------------------------------------------- |
| `options` | `NnrpBrowserConnectOptions` |      Yes | Endpoint, optional transport policy, optional session defaults. |

| Returns             |
| ------------------- |
| `NnrpBrowserClient` |

## `NnrpBrowserRuntime.selectTransport`

Selects a browser transport against a peer manifest and local provider slots.

| Parameter | Type                                   | Required | Description                                 |
| --------- | -------------------------------------- | -------: | ------------------------------------------- |
| `options` | `NnrpBrowserTransportSelectionOptions` |      Yes | Peer manifest and optional score overrides. |

| Returns                         |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

## `NnrpBrowserClient.openSession`

Opens a browser client session.

| Parameter | Type                        | Required | Description                                         |
| --------- | --------------------------- | -------: | --------------------------------------------------- |
| `options` | `NnrpBrowserSessionOptions` |       No | Input profile, cadence, quality tier, and metadata. |

| Returns                    |
| -------------------------- |
| `NnrpBrowserClientSession` |

## `NnrpBrowserClientSession.submit`

Submits a request and waits for a result when a WASM/transport implementation is connected.

| Parameter | Type                                     | Required | Description     |
| --------- | ---------------------------------------- | -------: | --------------- |
| `request` | [`NnrpSubmitRequest`](./core#data-types) |      Yes | Submit request. |

| Returns               |
| --------------------- |
| `Promise<NnrpResult>` |

## `NnrpBrowserClientSession.cancel`

Cancels an operation.

| Parameter   | Type                | Required | Description          |
| ----------- | ------------------- | -------: | -------------------- |
| `operation` | `bigint \| number`  |      Yes | Operation id.        |
| `options`   | `NnrpCancelOptions` |       No | Reason and metadata. |

| Returns         |
| --------------- |
| `Promise<void>` |

## `NnrpBrowserClientSession.nextEvent`

Reads the next browser runtime event.

| Parameter | Type                   | Required | Description            |
| --------- | ---------------------- | -------: | ---------------------- |
| `options` | `NnrpEventPollOptions` |       No | Event polling options. |

| Returns                     |
| --------------------------- |
| `Promise<NnrpRuntimeEvent>` |

## WASM Artifact Helpers

| API                                                        | Description                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `createWasmRuntimeBinding(options?)`                       | Creates a browser manifest, module URL, optional module, optional artifact, and browser transport providers. |
| `resolveWasmArtifact(options)`                             | Validates an artifact manifest and resolves WASM/types URLs.                                                 |
| `validateWasmArtifactManifest(manifest, requiredExports?)` | Validates the `nnrp-wasm` primitive manifest and required exports.                                           |
| `createBrowserTransportProvider(kind, options?)`           | Creates a browser transport provider slot for `websocket` or `webtransport`.                                 |

## Option Types

### `NnrpWasmRuntimeOptions`

| Property             | Type                                      | Required | Description                                               |
| -------------------- | ----------------------------------------- | -------: | --------------------------------------------------------- |
| `moduleUrl`          | `string \| URL`                           |       No | Explicit WASM module URL.                                 |
| `module`             | `WebAssembly.Module`                      |       No | Precompiled module.                                       |
| `artifact`           | `NnrpWasmArtifactOptions`                 |       No | `nnrp-rs` WASM primitive manifest plus optional base URL. |
| `transportPolicy`    | `NnrpTransportPolicy`                     |       No | Browser transport selection policy.                       |
| `transportProviders` | `readonly NnrpBrowserTransportProvider[]` |       No | Local browser transport availability and score slots.     |

### `NnrpWasmArtifactManifest`

| Property             | Type                | Required | Description                                         |
| -------------------- | ------------------- | -------: | --------------------------------------------------- |
| `package`            | `"nnrp-wasm"`       |      Yes | Artifact package kind.                              |
| `wasm`               | `string`            |      Yes | WASM file path in the artifact package.             |
| `types`              | `string`            |      Yes | Type declaration file path in the artifact package. |
| `owner`              | `string`            |       No | Producing repository or owner.                      |
| `downstream_wrapper` | `string`            |       No | Downstream wrapper package.                         |
| `exports`            | `readonly string[]` |      Yes | Exported WASM primitive names.                      |

### `NnrpBrowserTransportProvider`

| Property     | Type                            | Required | Description                                        |
| ------------ | ------------------------------- | -------: | -------------------------------------------------- |
| `kind`       | `"websocket" \| "webtransport"` |      Yes | Browser transport kind.                            |
| `available`  | `boolean`                       |       No | Local availability override.                       |
| `score`      | `number`                        |       No | Local score override.                              |
| `diagnostic` | `NnrpDiagnostic`                |       No | Reason for local unavailability or degraded score. |
