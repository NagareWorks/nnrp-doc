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

Builds, filters, and orders provider candidates with the frozen transport comparator, then selects
rank `0`. When no provider is selectable it throws `NnrpTransportSelectionError`, whose `candidates`
retain the complete ordered diagnostic list.

| Parameter   | Type                                         | Required | Description                                             |
| ----------- | -------------------------------------------- | -------: | ------------------------------------------------------- |
| `providers` | `readonly NnrpTransportProviderDescriptor[]` |      Yes | Installed provider descriptors.                         |
| `options`   | `NnrpTransportSelectionOptions`              |      Yes | Peer support, policy, limits, readiness, and probe data. |

| Returns                  |
| ------------------------ |
| `NnrpTransportSelection` |

## `createTransportCandidates`

Builds transport candidates from provider descriptors and frozen selection evidence without choosing one.

| Parameter   | Type                                         | Required | Description                                             |
| ----------- | -------------------------------------------- | -------: | ------------------------------------------------------- |
| `providers` | `readonly NnrpTransportProviderDescriptor[]` |      Yes | Installed provider descriptors.                         |
| `options`   | `NnrpTransportSelectionOptions`              |      Yes | Peer support, policy, limits, readiness, and probe data. |

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

## Cache and Schema Helpers

| Function                          | Parameters                                                                             | Returns                       | Description                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| `createCacheKey`                  | `kind: NnrpCacheObjectKind`, `key: bigint \| number \| string`, `namespaceId?: number` | `NnrpCacheKey`                | Creates the canonical 128-bit cache identity used by submit and cache operations. |
| `createSchemaDescriptor`          | `descriptor: NnrpSchemaDescriptor`                                                     | `NnrpSchemaDescriptor`        | Validates and snapshots a schema descriptor.                                      |
| `normalizeCachePutRequest`        | `request: NnrpCachePutRequest`                                                         | `NnrpCachePutRequest`         | Validates cache identity, lease, payload, and metadata fields.                    |
| `normalizeCacheInvalidateRequest` | `request: NnrpCacheInvalidateRequest`                                                  | `NnrpCacheInvalidateRequest`  | Validates an explicit cache invalidation request.                                 |
| `isStandardInputProfile`          | `profile: string`                                                                      | `profile is NnrpInputProfile` | Tests membership in `NNRP_STANDARD_INPUT_PROFILES`.                               |

## Recovery and Session Helpers

| Function                           | Parameters                                                                          | Returns                       | Description                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| `createRecoveryToken`              | `token: string \| NnrpBinaryPayload`, `metadata?: Readonly<Record<string, string>>` | `NnrpRecoveryToken`           | Creates an owned recovery token and metadata snapshot.                |
| `normalizeSessionMigrationRequest` | `request: NnrpSessionMigrationRequest`                                              | `NnrpSessionMigrationRequest` | Validates the destination and recovery token for session migration.   |
| `throwIfResultDrop`                | `event: NnrpRuntimeEvent`                                                           | `void`                        | Throws `NnrpResultDropError` when the event records a dropped result. |
| `validateSessionMetadata`          | `options?: NnrpSessionMetadataOptions`                                              | `void`                        | Validates profile, cadence, quality, and metadata fields.             |
| `normalizeSessionPatchRequest`     | `request: NnrpSessionPatchRequest`                                                  | `NnrpSessionPatchRequest`     | Validates and snapshots a session metadata or flow-control patch.     |

## `NnrpSessionRecoveryTicket`

`NnrpSessionRecoveryTicket` is the opaque runtime-issued value used by `resumeSession`. Applications
may persist it, but cannot construct or mutate its resume token.

| Member                                         | Parameters            | Returns                     | Description                                                  |
| ---------------------------------------------- | --------------------- | --------------------------- | ------------------------------------------------------------ |
| `toBytes()`                                    | None                  | `Uint8Array`                | Encodes the canonical little-endian NRTK version 1 envelope. |
| `NnrpSessionRecoveryTicket.fromBytes(encoded)` | `encoded: Uint8Array` | `NnrpSessionRecoveryTicket` | Validates and decodes one exact NRTK envelope.               |

The readonly semantic fields are `sessionId`, a defensive-copy `resumeToken`, optional
`resumeFromOperationId`, and `resumeWindowMillis`. Decoding rejects wrong magic or version, reserved
flags, zero session id, an empty token, truncation, and trailing bytes.

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

| Type                               | Description                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NnrpBuildMode`                    | `"backend-native" \| "browser-wasm"`.                                                                                                                                     |
| `NnrpTransportKind`                | `"tcp" \| "quic" \| "ipc" \| "websocket"`.                                                                                                                                |
| `NnrpTransportPolicy`              | `"auto"`, `"prefer-quic"`, `"prefer-tcp"`, `"prefer-ipc"`, `"prefer-websocket"`, and the four corresponding `force-*` values.                                             |
| `NnrpCapability`                   | Capability claim such as `client.session`, `server.session`, `native.loader`, `wasm.loader`, `cache`, `schema`, or `recovery`.                                            |
| `NnrpCapabilityManifest`           | Protocol name/version, build mode, transports, and capabilities.                                                                                                          |
| `NnrpTransportProviderCost`        | Frozen provider `modelId` and `units`.                                                                                                                                    |
| `NnrpTransportProviderLimits`      | Frozen provider `maxFrameBytes`.                                                                                                                                          |
| `NnrpTransportProviderLimitation`  | Union of the seven registered limitation strings.                                                                                                                         |
| `NnrpTransportProviderMetadata`    | Provider id, cost, preference rank, limits, and registered limitations.                                                                                                   |
| `NnrpTransportProviderObservation` | Provider kind, metadata, local availability, and optional diagnostic.                                                                                                     |
| `NnrpTransportCandidateReadiness`  | Provider identity, route/security readiness, and optional diagnostic.                                                                                                     |
| `NnrpTransportProbeState`          | `"not-run" \| "succeeded" \| "failed" \| "missing"`.                                                                                                                      |
| `NnrpTransportProbeMetrics`        | Sample/success counts, median throughput, and median RTT.                                                                                                                 |
| `NnrpTransportProbeObservation`    | Provider identity, succeeded/failed state, optional metrics, and optional diagnostic.                                                                                     |
| `NnrpTransportRejectionReason`     | Union of the eight registered rejection strings.                                                                                                                          |
| `NnrpTransportCandidate`           | Provider metadata, availability, peer/limit eligibility, probe state/metrics, selection rank, rejection reason, and diagnostic.                                           |
| `NnrpTransportSelectionSummary`    | Selected transport plus rejected candidates.                                                                                                                              |
| `NnrpTransportSelectionError`      | Typed error with `code`, string diagnostic, optional `policy` / `transportId`, and ordered `candidates`; forced failures identify their transport. |

`NnrpTransportCandidate` uses camelCase forms of the canonical fields frozen in
[Transport Strategy and Probing](/en/protocol/v1/transport-strategy): `transportId`, `provider`,
`localAvailable`, `peerSupported`, `withinLimits`, `probeState`, optional `probe`, optional
`selectionRank`, optional `rejectionReason`, and optional `diagnostic`. The public type has no
opaque `score` field.

```ts
type NnrpTransportProviderLimitation =
  | "requires-udp"
  | "requires-tcp"
  | "local-host-only"
  | "native-host-only"
  | "browser-host-only"
  | "unix-domain-socket"
  | "windows-named-pipe";
type NnrpTransportProbeState = "not-run" | "succeeded" | "failed" | "missing";
type NnrpTransportRejectionReason =
  | "policy-disallowed"
  | "local-unavailable"
  | "peer-unsupported"
  | "limit-exceeded"
  | "route-unresolved"
  | "security-unsatisfied"
  | "probe-missing"
  | "probe-failed";

interface NnrpTransportProviderCost {
  readonly modelId: number;
  readonly units: bigint;
}
interface NnrpTransportProviderLimits {
  readonly maxFrameBytes: bigint;
}
interface NnrpTransportProviderMetadata {
  readonly id: string;
  readonly cost: NnrpTransportProviderCost;
  readonly preferenceRank: number;
  readonly limits: NnrpTransportProviderLimits;
  readonly limitations: readonly NnrpTransportProviderLimitation[];
}
type NnrpTransportProviderKind = "pure-rust" | "native-dynamic" | "wasm";
interface NnrpTransportProviderDescriptor {
  readonly name: string;
  readonly version: string;
  readonly transportId: NnrpTransportKind;
  readonly kind: NnrpTransportProviderKind;
  readonly available: boolean;
  readonly libraryPath?: string;
  readonly metadata: NnrpTransportProviderMetadata;
  readonly diagnostic?: string;
}
interface NnrpTransportProviderObservation {
  readonly kind: NnrpTransportKind;
  readonly metadata: NnrpTransportProviderMetadata;
  readonly localAvailable: boolean;
  readonly diagnostic?: NnrpDiagnostic;
}
interface NnrpTransportCandidateReadiness {
  readonly transportId: NnrpTransportKind;
  readonly providerId: string;
  readonly routeResolved: boolean;
  readonly securitySatisfied: boolean;
  readonly diagnostic?: string;
}
interface NnrpTransportProbeMetrics {
  readonly sampleCount: number;
  readonly successCount: number;
  readonly medianThroughputBytesPerSecond: bigint;
  readonly medianRttMicroseconds: bigint;
}
interface NnrpTransportProbeObservation {
  readonly transportId: NnrpTransportKind;
  readonly providerId: string;
  readonly state: "succeeded" | "failed";
  readonly metrics?: NnrpTransportProbeMetrics;
  readonly diagnostic?: string;
}
interface NnrpTransportCandidate {
  readonly transportId: NnrpTransportKind;
  readonly provider: NnrpTransportProviderMetadata;
  readonly localAvailable: boolean;
  readonly peerSupported: boolean;
  readonly withinLimits: boolean;
  readonly probeState: NnrpTransportProbeState;
  readonly probe?: NnrpTransportProbeMetrics;
  readonly selectionRank?: number;
  readonly rejectionReason?: NnrpTransportRejectionReason;
  readonly diagnostic?: string;
}
interface NnrpTransportSelectionOptions {
  readonly peerSupportedTransports: readonly NnrpTransportKind[];
  readonly policy: NnrpTransportPolicy;
  readonly requestedMaxFrameBytes?: bigint;
  readonly candidateReadiness: readonly NnrpTransportCandidateReadiness[];
  readonly probeObservations: readonly NnrpTransportProbeObservation[];
}
interface NnrpTransportSelection {
  readonly selectedProvider: NnrpTransportProviderDescriptor;
  readonly candidates: readonly NnrpTransportCandidate[];
  readonly policy: NnrpTransportPolicy;
  readonly diagnostic?: string;
}
```

`NnrpTransportProviderDescriptor.name` is the provider-owned package or display name. Selection, readiness, route
lookup, and reporting use `transportId` as the canonical carrier identity and never infer it from `name`.

`peerSupportedTransports` has set semantics, so duplicates and array order do not affect selection.
`requestedMaxFrameBytes: 0n` is valid and remains distinct from an omitted property.

Provider observations must contain unique transport kinds and unique provider ids. Readiness is
required for every provider. Readiness and probe observations are matched by `(transportId, providerId)`;
duplicate or unmatched evidence is a contract error. Missing probe observations remain
distinguishable from observations whose state is `"failed"`.

### Submit, Result, and Events

| Type                   | Description                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `NnrpInputProfile`     | One of the standard profiles: `tensor`, `token`, `structured_event`, or `tool_delta`.                                              |
| `NnrpSubmitMode`       | `"inline" \| "object-reference"`.                                                                                                  |
| `NnrpSubmitRequest`    | Non-zero `operationId: bigint`, independent `frameId`, payload/tensors, profile, submit mode, cache key, descriptor, and metadata. |
| `NnrpResult`           | Non-zero operation id, canonical terminal state, and closed runtime-or-lifecycle evidence.                                         |
| `NnrpRuntimeEvent`     | Complete wire header, typed metadata union, and semantic tail.                                                                     |
| `NnrpClientEvent`      | Closed client union containing one runtime or lifecycle event.                                                                     |
| `NnrpEventPollOptions` | Optional `timeoutMillis`.                                                                                                          |

```ts
interface NnrpResult {
  readonly operationId: bigint;
  readonly terminalState: NnrpResultTerminalState;
  readonly event: NnrpTerminalEvent;
}

type NnrpTerminalEvent =
  | { readonly type: "runtime"; readonly event: NnrpRuntimeEvent }
  | { readonly type: "lifecycle"; readonly event: NnrpOperationLifecycleEvent };

type NnrpClientEvent =
  | { readonly type: "runtime"; readonly event: NnrpRuntimeEvent }
  | { readonly type: "lifecycle"; readonly event: NnrpOperationLifecycleEvent };

interface NnrpOperationLifecycleEvent {
  readonly operationId: bigint;
  readonly state: NnrpOperationState;
}
```

`NnrpResultTerminalState` is `"success" | "cancelled" | "dropped" | "error"`. `NnrpOperationState`
is
`"accepted" | "running" | "partial" | "waiting-tool" |
"superseded" | "cancelled" | "failed" | "completed"`.
Successful results preserve `RESULT_PUSH`; non-success results preserve the exact wire or local
lifecycle event. An `NnrpOperationLifecycleEvent` is local role state and never carries a fabricated
`NnrpRuntimeFrameHeader`. `NnrpTerminalEvent` always contains exactly one variant; nullable parallel
runtime and lifecycle fields are not part of the API.

Additional public types used by these contracts:

| Type                                                          | Description                                                           |
| ------------------------------------------------------------- | --------------------------------------------------------------------- |
| `NnrpOperationId`                                             | Non-zero operation identity represented as `bigint`.                  |
| `NnrpOperationState`                                          | Canonical eight-state operation lifecycle listed above.               |
| `NnrpSubmitCapacityPolicy`                                    | `"reject" \| "await"` behavior when local submit credit is exhausted. |
| `NnrpBinaryPayload`                                           | `Uint8Array \| ArrayBufferView`.                                      |
| `NnrpTensorSection`, `NnrpNormalizedTensorSection`            | Tensor byte section before and after request normalization.           |
| `NnrpPayloadDescriptor`                                       | Optional schema id, content type, and encoding for a payload.         |
| `NnrpSchemaFlag`, `NnrpSchemaDescriptor`                      | Registered schema flags and the validated schema contract.            |
| `NnrpCacheKey`, `NnrpCacheMetadata`                           | Canonical cache identity and caller metadata.                         |
| `NnrpCacheOperationStatus`                                    | `accepted`, `stored`, `invalidated`, `miss`, or `rejected`.           |
| `NnrpCachePutRequest`, `NnrpCachePutResult`                   | Explicit cache put request and result.                                |
| `NnrpCacheInvalidateRequest`, `NnrpCacheInvalidateResult`     | Explicit invalidation request and result.                             |
| `NnrpRecoveryToken`, `NnrpSessionMigrationEvent`              | Recovery token and typed migration lifecycle events.                  |
| `NnrpSessionMetadataOptions`, `NnrpSessionFlowControlOptions` | Reusable session metadata and credit-window options.                  |
| `NnrpFlowUpdateMetadata`, `NnrpResultHintMetadata`            | Structured flow update and result-hint payloads.                      |
| `NnrpAbortSignalLike`                                         | Runtime-neutral abort signal accepted by asynchronous SDK methods.    |

### Errors

| Class                 | Description                                         |
| --------------------- | --------------------------------------------------- |
| `NnrpError`           | Base error with structured `diagnostic`.            |
| `NnrpCapabilityError` | Capability, manifest, or unsupported runtime error. |
| `NnrpTransportError`  | Transport error.                                    |
| `NnrpTimeoutError`    | Timeout error.                                      |
| `NnrpProtocolError`   | Request shape or protocol validation error.         |
| `NnrpResultDropError` | Typed terminal evidence for a dropped result.       |
| `NnrpRecoveryError`   | Recovery or migration capability failure.           |

`NnrpDiagnosticSource` identifies the producing layer as `core`, `native`, `wasm`, `transport`,
`protocol`, or `runtime`.
