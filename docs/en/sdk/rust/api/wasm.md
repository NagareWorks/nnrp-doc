# Rust — WASM Primitives (Preview3)

::: tip Implemented Boundary
`nnrp-rs` now provides the `nnrp-wasm` primitive crate. It exposes protocol version, transport probe scoring, and transport selection through a low-level `wasm-bindgen` JSON interface, then packages `.wasm`, `.d.ts`, and manifest outputs. The full JS/TS SDK, npm layout, Node native loader, and browser WebSocket/WebTransport adapters belong in the future `nnrp-js` repository.
:::

## Package Boundary

| Scenario | Recommended path |
|---|---|
| Node.js backend | Probe `nnrp_ffi.dll` / `.so` / `.dylib` native link libraries first; fall back to `nnrp-wasm` when native loading is unavailable |
| Browser | Use `nnrp-wasm` primitives plus WebSocket/WebTransport adapters from `nnrp-js` |
| C#/Python/Unity | Use the `nnrp-ffi` native package, not the browser WASM package |

Browsers cannot load native link libraries and cannot open raw TCP/UDP sockets. Browser transport still has to be implemented in JS/TS through WebSocket or WebTransport.

## Build

```bash
rustup target add wasm32-unknown-unknown
python scripts/package_wasm_primitives.py --out artifacts/wasm
```

Output layout:

```text
artifacts/wasm/nnrp-wasm-primitives/
  nnrp_wasm.wasm
  nnrp_wasm.d.ts
  manifest.json
```

CI builds and uploads the `nnrp-wasm-primitives` artifact. Release bundles also include `artifacts/wasm/**`.

## Current Exports

```typescript
export function nnrp_wasm_protocol_major(): number;
export function nnrp_wasm_wire_format(): number;

export function selectTransportWithProbeJson(
  providersJson: string,
  remoteTransportsJson: string,
  policy: TransportPolicy,
  samplesJson: string
): string;

export function scoreProviderProbeJson(
  providerJson: string,
  policy: TransportPolicy,
  samplesJson: string
): string;
```

`selectTransportWithProbeJson` and `scoreProviderProbeJson` use JSON strings as the ABI boundary so `nnrp-js` can reuse the same low-level primitive in Node and browser builds. Returned JSON includes the selected provider, probe score, candidate scores, and rejected candidate diagnostics.

## Policy Semantics

`auto`, `prefer_quic`, and `prefer_tcp` evaluate local providers, remote capability, and probe samples together; QUIC being reachable does not automatically mean QUIC is selected. `force_quic` / `force_tcp` fail fast when the requested provider is missing, unsupported remotely, or has no viable probe.

Scoring combines:

- RTT / latency
- Timeout and failure rate
- Effective throughput
- Local policy preference

## Non-goals

- `nnrp-wasm` does not provide high-level `NnrpWasmClient` / `NnrpWasmSession` APIs.
- `nnrp-rs` does not own npm packaging, bundler adapters, React/Vue examples, or browser transport adapters.
- Raw `nnrp_ffi.wasm` is not the browser SDK; the cross-language C ABI remains on the native/FFI path.

## Common Pitfalls

::: warning
1. **Browsers cannot load `.dll` / `.so` / `.dylib`.** Node can use native addons; browsers must use WASM plus web transports.
2. **WASM is not the transport implementation.** WebSocket/WebTransport connection handling, reconnects, auth, and fetch/worker lifecycle belong in `nnrp-js`.
3. **QUIC/TCP selection must not rely only on reachability.** Production selection should use probe score, failure rate, remote capability, and local policy together.
:::
