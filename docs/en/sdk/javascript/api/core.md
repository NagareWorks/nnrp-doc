# JavaScript/TypeScript Core API

`@nnrp/core` contains runtime-neutral types and helpers shared by the JavaScript role and transport
packages.

## Constants

| Name                           | Type           | Value                                                |
| ------------------------------ | -------------- | ---------------------------------------------------- |
| `NNRP_PROTOCOL_NAME`           | `"NNRP"`       | Protocol name.                                       |
| `NNRP_PROTOCOL_VERSION`        | `"1.0.0"`      | Protocol version.                                    |
| `NNRP_STANDARD_INPUT_PROFILES` | readonly tuple | `tensor`, `token`, `structured_event`, `tool_delta`. |

## `createCapabilityManifest`

Creates a build-mode-specific capability manifest.

| Parameter | Type                            | Required | Description                                    |
| --------- | ------------------------------- | -------: | ---------------------------------------------- |
| `options` | `NnrpCapabilityManifestOptions` |      Yes | Build mode, transports, and capability claims. |

| Returns                  |
| ------------------------ |
| `NnrpCapabilityManifest` |

```ts
import { createCapabilityManifest } from "@nnrp/core";

const manifest = createCapabilityManifest({
  buildMode: "backend-native",
  transports: ["tcp", "quic"],
  capabilities: ["client.session"],
});
```

## `createBackendNativeManifest`

Creates the default backend native capability manifest.

| Parameter      | Type                        | Required | Description              |
| -------------- | --------------------------- | -------: | ------------------------ |
| `capabilities` | `readonly NnrpCapability[]` |       No | Extra capability claims. |

| Returns                  |
| ------------------------ |
| `NnrpCapabilityManifest` |

## `createBrowserWasmManifest`

Creates the default browser WASM capability manifest.

| Parameter      | Type                        | Required | Description              |
| -------------- | --------------------------- | -------: | ------------------------ |
| `capabilities` | `readonly NnrpCapability[]` |       No | Extra capability claims. |

| Returns                  |
| ------------------------ |
| `NnrpCapabilityManifest` |

## `selectTransport`

Selects the highest-scored eligible transport candidate under a policy.

| Parameter    | Type                                | Required | Description                                                               |
| ------------ | ----------------------------------- | -------: | ------------------------------------------------------------------------- |
| `candidates` | `readonly NnrpTransportCandidate[]` |      Yes | Candidate transports.                                                     |
| `policy`     | `NnrpTransportPolicy`               |       No | `auto`, one of the `prefer-*` policies, or one of the `force-*` policies. |

| Returns                  |
| ------------------------ |
| `NnrpTransportSelection` |

## `createTransportCandidates`

Builds transport candidates from local and peer manifests.

| Parameter | Type                            | Required | Description                                         |
| --------- | ------------------------------- | -------: | --------------------------------------------------- |
| `options` | `NnrpTransportCandidateOptions` |      Yes | Local manifest, peer manifest, and optional scores. |

| Returns                             |
| ----------------------------------- |
| `readonly NnrpTransportCandidate[]` |

## `createTransportSelectionSummary`

Creates a compact selection summary for diagnostics, conformance, and benchmarks.

| Parameter   | Type                     | Required | Description            |
| ----------- | ------------------------ | -------: | ---------------------- |
| `selection` | `NnrpTransportSelection` |      Yes | Full selection object. |

| Returns                         |
| ------------------------------- |
| `NnrpTransportSelectionSummary` |

## `parseApplicationEndpoint`

Parses and validates the public application endpoint. The function accepts only `nnrp://` and
`nnrps://` and returns a `URL`, preserving the authority, path, query, and security intent.

| Parameter  | Type            | Required | Description                       |
| ---------- | --------------- | -------: | --------------------------------- |
| `endpoint` | `string \| URL` |      Yes | Public NNRP application endpoint. |

| Returns | Throws                                                                 |
| ------- | ---------------------------------------------------------------------- |
| `URL`   | `NnrpProtocolError` for empty, malformed, or provider-local endpoints. |

## `resolveProviderEndpoint`

Resolves the carrier-local endpoint after provider selection. TCP and QUIC derive `host:port` from
the application authority and use port `4433` when it is omitted. IPC and WebSocket require an
explicit matching provider endpoint.

| Parameter          | Type                | Required | Description                              |
| ------------------ | ------------------- | -------: | ---------------------------------------- |
| `endpoint`         | `string \| URL`     |      Yes | Public `nnrp://` or `nnrps://` endpoint. |
| `transport`        | `NnrpTransportKind` |      Yes | Selected carrier.                        |
| `providerEndpoint` | `string \| URL`     |       No | Explicit carrier-local endpoint.         |

| Returns  | Throws                                                                              |
| -------- | ----------------------------------------------------------------------------------- |
| `string` | `NnrpTransportError` when the selected carrier cannot resolve the supplied locator. |

## `normalizeSubmitRequest`

Validates and normalizes submit payloads.

| Parameter | Type                            | Required | Description                              |
| --------- | ------------------------------- | -------: | ---------------------------------------- |
| `request` | `NnrpSubmitRequest`             |      Yes | Submit request.                          |
| `options` | `NormalizeSubmitRequestOptions` |       No | Payload copy and strict profile options. |

| Returns                       | Throws                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `NnrpNormalizedSubmitRequest` | `NnrpProtocolError` for invalid frame, payload, cache, schema, or profile fields. |

## `normalizeOperationRef`

Normalizes an operation id.

| Parameter   | Type               | Required | Description   |
| ----------- | ------------------ | -------: | ------------- |
| `operation` | `bigint \| number` |      Yes | Operation id. |

| Returns  | Throws                                          |
| -------- | ----------------------------------------------- |
| `bigint` | `NnrpProtocolError` for negative or unsafe ids. |

## `validateEventPollOptions`

Validates event polling options.

| Parameter | Type                   | Required | Description      |
| --------- | ---------------------- | -------: | ---------------- |
| `options` | `NnrpEventPollOptions` |       No | Timeout options. |

| Returns | Throws                                          |
| ------- | ----------------------------------------------- |
| `void`  | `NnrpProtocolError` for invalid timeout values. |

## Data Types

### Capability and Transport

| Type                            | Description                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `NnrpBuildMode`                 | `"backend-native" \| "browser-wasm"`.                                                                                          |
| `NnrpTransportKind`             | `"tcp" \| "quic" \| "ipc" \| "websocket"`.                                                                                     |
| `NnrpTransportPolicy`           | `"auto"`, `"prefer-quic"`, `"prefer-tcp"`, `"prefer-ipc"`, `"prefer-websocket"`, and the four corresponding `force-*` values.  |
| `NnrpCapability`                | Capability claim such as `client.session`, `server.session`, `native.loader`, `wasm.loader`, `cache`, `schema`, or `recovery`. |
| `NnrpCapabilityManifest`        | Protocol name/version, build mode, transports, and capabilities.                                                               |
| `NnrpTransportCandidate`        | Candidate transport, availability, score, rejection reason, and diagnostic.                                                    |
| `NnrpTransportSelectionSummary` | Selected transport plus rejected candidates.                                                                                   |

### Submit, Result, and Events

| Type                   | Description                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `NnrpInputProfile`     | One of the standard profiles: `tensor`, `token`, `structured_event`, or `tool_delta`.       |
| `NnrpSubmitMode`       | `"inline" \| "object-reference"`.                                                           |
| `NnrpSubmitRequest`    | Frame id, payload/tensors, input profile, submit mode, cache key, descriptor, and metadata. |
| `NnrpResult`           | Frame id, optional payload, optional diagnostic, and metadata.                              |
| `NnrpRuntimeEvent`     | Result, flow update, result hint, drop, close, or diagnostic event.                         |
| `NnrpEventPollOptions` | Optional `timeoutMillis`.                                                                   |

### Errors

| Class                 | Description                                         |
| --------------------- | --------------------------------------------------- |
| `NnrpError`           | Base error with structured `diagnostic`.            |
| `NnrpCapabilityError` | Capability, manifest, or unsupported runtime error. |
| `NnrpTransportError`  | Transport error.                                    |
| `NnrpTimeoutError`    | Timeout error.                                      |
| `NnrpProtocolError`   | Request shape or protocol validation error.         |
