# Rust — WASM Browser Primitives

`nnrp-wasm` packages browser-safe protocol primitives generated from Rust. It does not replace the
JavaScript/TypeScript SDK and it does not load native transport libraries.

## Cargo

```toml
[dependencies]
nnrp-wasm = "1.0.0-preview.4.17"
```

## Artifact

| Item | Value |
|---|---|
| Release artifact | `nnrp-wasm-browser-1.0.0-preview.4.17.zip` |
| Contents | `.wasm`, generated JS glue, `.d.ts`, manifest |
| Use case | Browser protocol primitives and binary-frame helpers |
| Not included | Native `.dll` / `.so` / `.dylib` transport libraries |

## Exports

| Export | Purpose |
|---|---|
| `nnrp_wasm_protocol_major()` | Returns protocol major version. |
| `nnrp_wasm_wire_format()` | Returns wire format id. |
| `selectTransportWithProbeJson(providersJson, remoteTransportsJson, policy, requestedMaxFrameBytes, readinessJson, observationsJson)` | Applies the frozen provider/readiness/probe policy and returns `TransportSelection` JSON. `requestedMaxFrameBytes` is an absent value or a canonical decimal `u64` string. |
| `summarizeProviderProbeJson(providerJson, samplesJson)` | Returns structured `ProbeMetrics` JSON for one provider. |
| `encodeWebSocketBinaryFrameJson(...)` | Encodes a browser WebSocket binary-frame wrapper. |
| `decodeWebSocketBinaryFrameJson(...)` | Decodes one browser WebSocket binary-frame wrapper. |
| `decodeWebSocketBinaryFrameBatchJson(...)` | Decodes multiple browser binary frames. |
| `encodeRuntimeControlMetadataJson(...)` | Encodes runtime-control metadata from JSON. |
| `decodeRuntimeControlMetadataJson(...)` | Decodes runtime-control metadata to JSON. |
| `encodeRuntimeObjectMetadataJson(...)` | Encodes runtime object metadata from JSON. |
| `decodeRuntimeObjectMetadataJson(...)` | Decodes runtime object metadata to JSON. |

The WASM surface uses the provider metadata, candidate diagnostics, rejection registry, and deterministic ordering
frozen in [Transport Strategy and Probing](/en/protocol/v1/transport-strategy). It does not export a weighted score.
Readiness, probe observation, and raw sample JSON use `transport_id` plus `provider_id`; package display names are not
selection identities. `observationsJson` carries aggregate succeeded/failed outcomes, while `samplesJson` remains the raw
input to `summarizeProviderProbeJson`.

The JSON boundary is intentionally coarse enough for JS/TS SDKs to batch work and avoid tiny
field-by-field crossings.

Every wire field declared as `u64` is represented by a canonical unsigned decimal string at the
runtime-control and runtime-object JSON boundary. This applies to identifiers, sequences, budgets,
limits, cache key words, leases, trace identifiers, offsets, lengths, and timestamps. Values must
contain ASCII digits only, have no sign, and use `"0"` as the only zero representation. The bridge
rejects JSON numbers for these fields so JavaScript cannot silently lose precision. The high-level
JavaScript/TypeScript SDK maps these decimal strings to and from `bigint`; wire `u32`, `u16`, `u8`,
and `i16` fields remain JSON numbers.

## Browser Transport Boundary

Browsers cannot open raw TCP sockets or load native link libraries. In browser builds:

| Concern | Owner |
|---|---|
| Protocol metadata, binary-frame helpers, provider scoring | `nnrp-wasm` |
| WebSocket connection lifecycle, auth, reconnect, worker/fetch integration | JavaScript/TypeScript SDK |
| Native TCP/QUIC/IPC/WebSocket libraries | FFI transport artifacts, not browser packages |

## Common Pitfalls

::: warning
1. Do not ship native libraries inside browser client packages.
2. Do not treat WASM as a high-level `NnrpClient`; high-level session APIs belong to the JS/TS SDK.
3. Use batch decode helpers when processing multiple browser frames to avoid unnecessary JS/WASM
   boundary churn.
:::
