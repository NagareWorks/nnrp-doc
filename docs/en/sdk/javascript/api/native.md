# JavaScript/TypeScript Native Backend API

`@nnrp/native` is for Node.js and Deno backend hosts. It validates `nnrp-rs` native artifact
manifests, checks required ABI symbols, probes runtime capabilities, and exposes client/server
runtime objects.

## `openNativeClient`

Opens a backend runtime and connects a client endpoint.

| Parameter | Type                      | Required | Description                                                                                          |
| --------- | ------------------------- | -------: | ---------------------------------------------------------------------------------------------------- |
| `options` | `NnrpNativeClientOptions` |      Yes | Endpoint, native artifact options, transport policy, session defaults, optional test/loader binding. |

| Returns               | Throws                                                        |
| --------------------- | ------------------------------------------------------------- |
| `Promise<NnrpClient>` | `NnrpCapabilityError` or `NnrpNativeBindingUnavailableError`. |

```ts
import { openNativeClient } from "@nnrp/native";

const client = await openNativeClient({
  endpoint: "127.0.0.1:4433",
  nativeLibrary: { artifactDir: "./native" },
});
```

## `openBackendRuntime`

Creates a backend runtime without immediately connecting a client.

| Parameter | Type                        | Required | Description                                                                                      |
| --------- | --------------------------- | -------: | ------------------------------------------------------------------------------------------------ |
| `options` | `NnrpBackendRuntimeOptions` |       No | Native artifact options, transport policy, environment/platform overrides, optional FFI binding. |

| Returns                       |
| ----------------------------- |
| `Promise<NnrpBackendRuntime>` |

## `NnrpBackendRuntime.connect`

Creates a client from an existing runtime.

| Parameter | Type                 | Required | Description                                                     |
| --------- | -------------------- | -------: | --------------------------------------------------------------- |
| `options` | `NnrpConnectOptions` |      Yes | Endpoint, optional transport policy, optional session defaults. |

| Returns      |
| ------------ |
| `NnrpClient` |

## `NnrpBackendRuntime.listen`

Creates a backend server listener.

| Parameter | Type                | Required | Description                                   |
| --------- | ------------------- | -------: | --------------------------------------------- |
| `options` | `NnrpListenOptions` |      Yes | Local endpoint and optional transport policy. |

| Returns      |
| ------------ |
| `NnrpServer` |

## `NnrpBackendRuntime.selectTransport`

Selects a transport against a peer manifest.

| Parameter | Type                            | Required | Description                                 |
| --------- | ------------------------------- | -------: | ------------------------------------------- |
| `options` | `NnrpTransportSelectionOptions` |      Yes | Peer manifest and optional score overrides. |

| Returns                         |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

## `NnrpClient.openSession`

Opens a client session.

| Parameter | Type                 | Required | Description                                         |
| --------- | -------------------- | -------: | --------------------------------------------------- |
| `options` | `NnrpSessionOptions` |       No | Input profile, cadence, quality tier, and metadata. |

| Returns             |
| ------------------- |
| `NnrpClientSession` |

## `NnrpClientSession.submit`

Submits a request and waits for a result through the coarse native submit/result binding.

| Parameter | Type                                     | Required | Description                                                |
| --------- | ---------------------------------------- | -------: | ---------------------------------------------------------- |
| `request` | [`NnrpSubmitRequest`](./core#data-types) |      Yes | Frame id, payload/tensors, profile, cache/schema metadata. |

| Returns               |
| --------------------- |
| `Promise<NnrpResult>` |

## `NnrpClientSession.submitNoWait`

Submits a request and returns the native operation id.

| Parameter | Type                                     | Required | Description     |
| --------- | ---------------------------------------- | -------: | --------------- |
| `request` | [`NnrpSubmitRequest`](./core#data-types) |      Yes | Submit request. |

| Returns           |
| ----------------- |
| `Promise<bigint>` |

## `NnrpClientSession.cancel`

Cancels an operation.

| Parameter   | Type                | Required | Description          |
| ----------- | ------------------- | -------: | -------------------- |
| `operation` | `bigint \| number`  |      Yes | Operation id.        |
| `options`   | `NnrpCancelOptions` |       No | Reason and metadata. |

| Returns         |
| --------------- |
| `Promise<void>` |

## `NnrpClientSession.nextEvent`

Reads the next runtime event through the coarse native batch event binding.

| Parameter | Type                   | Required | Description            |
| --------- | ---------------------- | -------: | ---------------------- |
| `options` | `NnrpEventPollOptions` |       No | Event polling options. |

| Returns                     |
| --------------------------- |
| `Promise<NnrpRuntimeEvent>` |

## Native Artifact Helpers

| API                                                  | Description                                                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `resolveNativeLibraryPath(options?)`                 | Resolves explicit path, environment path, manifest-backed artifact path, or platform default path.                |
| `resolveNativeArtifact(options)`                     | Reads and validates a packaged native artifact manifest and library path.                                         |
| `readNativeArtifactManifest(path)`                   | Reads `manifest.json`.                                                                                            |
| `validateNativeArtifactManifest(manifest, options?)` | Validates package, OS, architecture, dynamic library kind, and required exports.                                  |
| `validateNativeRuntimeCapabilities(capabilities)`    | Validates ABI version, protocol version, required feature bits, and TCP transport support.                        |
| `createNativeRuntimeBinding(options?)`               | Creates the manifest, library path, required symbol list, artifact metadata, and optional FFI binding descriptor. |

## Option Types

### `NnrpNativeLibraryOptions`

| Property          | Type                | Required | Description                                               |
| ----------------- | ------------------- | -------: | --------------------------------------------------------- |
| `path`            | `string`            |       No | Explicit native library path.                             |
| `artifactDir`     | `string`            |       No | Directory containing platform artifact folders.           |
| `manifestPath`    | `string`            |       No | Explicit artifact manifest path.                          |
| `packageName`     | `string`            |       No | Platform package folder override, such as `linux-x86_64`. |
| `requiredSymbols` | `readonly string[]` |       No | Additional required symbols beyond SDK defaults.          |

### `NnrpNativeFfiBinding`

| Property              | Type                                                   | Required | Description                                   |
| --------------------- | ------------------------------------------------------ | -------: | --------------------------------------------- |
| `mode`                | `"native-addon" \| "node-ffi" \| "nano-ffi" \| "test"` |       No | Binding implementation label.                 |
| `runtimeCapabilities` | function                                               |       No | Returns native runtime capability probe data. |
| `submitResultCompact` | function                                               |       No | Coarse submit/result hot path.                |
| `submitNoWait`        | function                                               |       No | Coarse no-wait submit path.                   |
| `cancel`              | function                                               |       No | Coarse cancel path.                           |
| `awaitEvents`         | function                                               |       No | Coarse batch event polling path.              |
| `close`               | function                                               |       No | Binding cleanup hook.                         |

### `NnrpNativeRuntimeCapabilities`

| Property                                                        | Type     | Description                      |
| --------------------------------------------------------------- | -------- | -------------------------------- |
| `abiMajor`, `abiMinor`, `abiPatch`                              | `number` | Native ABI version.              |
| `protocolMajor`, `protocolWireFormat`                           | `number` | Protocol compatibility probe.    |
| `sdkMajor`, `sdkMinor`, `sdkPatch`, `sdkChannel`, `sdkRevision` | `number` | Native SDK version metadata.     |
| `transportSlots`                                                | `number` | Native transport support bitset. |
| `featureFlags`                                                  | `bigint` | Runtime feature bitset.          |
