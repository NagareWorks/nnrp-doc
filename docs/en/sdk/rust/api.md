# Rust API Overview

This page is the map. The detailed method tables live on the client, server, core, FFI, and WASM
pages so users can start from the workflow they are implementing instead of reading a flat list of
all Rust symbols.

## Release

| Item | Value |
|---|---|
| NNRP protocol line | NNRP/1 Preview4 |
| Rust package version | `1.0.0-preview.4.17` |
| Minimum Rust version | `1.82` |
| GitHub release asset tag | `v1.0.0-preview.4.17` |

## API Areas

| Area | Package | What it owns | Page |
|---|---|---|---|
| Core protocol model | `nnrp-core` | Wire codecs, metadata, profiles, runtime-control, object/cache, validation | [Core Types](./api/core) |
| Client runtime | `nnrp-runtime` | Connect, open session, submit, receive events, control requests, close | [Client API](./api/client) |
| Server runtime | `nnrp-runtime` | Bind, accept, receive submit/control, send result/progress/object/cache events | [Server API](./api/server) |
| Transport providers | `nnrp-transport-provider`, `nnrp-transport-*` | Registry, probe policy, and concrete TCP/QUIC/IPC/WebSocket transports | [Transport Provider Boundary](#transport-provider-boundary) |
| Native ABI | `nnrp-ffi` | C ABI, handle/event model, native artifact manifests | [FFI / Native](./api/ffi) |
| Browser primitives | `nnrp-wasm` | WASM protocol helpers, browser binary-frame helpers, `.d.ts` output | [WASM](./api/wasm) |

## Cargo

```toml
[dependencies]
nnrp-core = "1.0.0-preview.4.17"
nnrp-runtime = "1.0.0-preview.4.17"
nnrp-transport-provider = "1.0.0-preview.4.17"
nnrp-transport-tcp = "1.0.0-preview.4.17"
nnrp-transport-quic = "1.0.0-preview.4.17"
nnrp-transport-ipc = "1.0.0-preview.4.17"
nnrp-transport-websocket = "1.0.0-preview.4.17"

# Optional downstream surfaces
nnrp-ffi = "1.0.0-preview.4.17"
nnrp-wasm = "1.0.0-preview.4.17"
nnrp-conformance = "1.0.0-preview.4.17"
```

## Transport Provider Boundary

The runtime sees transports through framed transport traits. In the Rust SDK, "transport" follows the NNRP
definition: a frame-carrier boundary below the NNRP wire protocol, not an OSI-layer claim. Concrete carrier behavior
belongs to provider packages.

| Package | Owns | Native / WASM artifact boundary |
|---|---|---|
| `nnrp-transport-tcp` | TCP connect/bind and TCP probe identity | Native FFI transport artifacts are published as TCP-scoped release zips |
| `nnrp-transport-quic` | Quinn/Rustls QUIC connect/bind and QUIC probe identity | Native FFI transport artifacts are published as QUIC-scoped release zips |
| `nnrp-transport-ipc` | Local IPC endpoints: Unix domain sockets and Windows named pipes | Native FFI transport artifacts are published as IPC-scoped release zips |
| `nnrp-transport-websocket` | Native Rust WebSocket binary-frame carrier | Native FFI transport artifacts are published as WebSocket-scoped release zips |
| `nnrp-wasm` | Browser WASM primitives and browser binary-frame helpers | Browser artifact is `nnrp-wasm-browser-1.0.0-preview.4.17.zip` |

Role packages such as client/server runtimes do not hide carrier implementations. Install the transport package that
owns the behavior you need, then let provider policy select among registered providers when multiple carriers are
available.

### Host role boundary

Rust uses the same host cardinality as the other SDKs. `NnrpClient::connect` accepts one application endpoint,
`ClientProviderRoutes`, and the explicitly compiled provider set; it evaluates many routes but adopts one carrier.
`NnrpServer::listen` accepts `ServerProviderRoutes` and owns one atomic set of every eligible listener; each accepted
session still adopts one carrier. Low-level provider `connect`/`listen`, `from_transport`, `from_listener`, and native
FFI handles remain singular and must not be used as the production host API.

The exact route and security types are listed on the [Client API](./api/client) and [Server API](./api/server) pages.
The shared rules are frozen in [Transport Strategy and Probing](/en/protocol/v1/transport-strategy).

### Provider and selection types

The Rust SDK is a first-class implementation of the frozen provider-selection contract. It exposes these exact public
types from `nnrp-transport-provider`:

| Type | Frozen fields |
|---|---|
| `ProviderCost` | `model_id: u16`, `units: u64` |
| `ProviderLimits` | `max_frame_bytes: u64` |
| `ProviderLimitation` | `RequiresUdp`, `RequiresTcp`, `LocalHostOnly`, `NativeHostOnly`, `BrowserHostOnly`, `UnixDomainSocket`, `WindowsNamedPipe` |
| `TransportProviderMetadata` | `id`, `cost`, `preference_rank`, `limits`, `limitations` |
| `TransportProviderDescriptor` | `name`, `version`, `transport_id`, `kind`, `available`, optional `library_path`, `metadata`, optional `diagnostic` |
| `TransportCandidateReadiness` | `transport_id`, `provider_id`, `route_resolved`, `security_satisfied`, optional `diagnostic` |
| `ProbeMetrics` | `sample_count`, `success_count`, `median_throughput_bytes_per_sec`, `median_rtt_us` |
| `ProbeSample` | `transport_id`, `provider_id`, `elapsed_us`, optional `rtt_us`, `bytes_sent`, `bytes_received`, `timed_out`, `failed` |
| `TransportProbeObservation` | `transport_id`, `provider_id`, `state`, optional `metrics`, optional `diagnostic`; state is `Succeeded` or `Failed` |
| `ProbeState` | `NotRun`, `Succeeded`, `Failed`, `Missing` |
| `TransportCandidateDiagnostic` | `transport_id`, `provider`, `local_available`, `peer_supported`, `within_limits`, `probe_state`, optional `probe`, optional `selection_rank`, optional `rejection_reason`, optional `diagnostic` |
| `TransportRejectionReason` | `PolicyDisallowed`, `LocalUnavailable`, `PeerUnsupported`, `LimitExceeded`, `RouteUnresolved`, `SecurityUnsatisfied`, `ProbeMissing`, `ProbeFailed` |
| `TransportSelection` | Selected descriptor plus the ordered `candidates` list; rank `0` is selected |
| `TransportSelectionError` | `InvalidEvidence { diagnostic }`, `ForcedTransportUnavailable { transport_id, candidates }`, or `NoViableTransport { candidates }` |
| `TransportProviderRegistryError` | Duplicate transport ID or duplicate provider ID; the previously registered provider remains unchanged |

`TransportProviderDescriptor.name` is the provider-owned package or display name. Registry lookup, readiness,
selection, route lookup, and reporting use `transport_id` and never infer carrier identity from `name`.

The selection entry points are frozen as:

```rust
pub fn select_transport(
    providers: &[TransportProviderDescriptor],
    options: &TransportSelectionOptions,
) -> Result<TransportSelection, TransportSelectionError>;

pub fn select_transport_with_probe(
    providers: &[TransportProviderDescriptor],
    options: &TransportSelectionOptions,
) -> Result<TransportSelection, TransportSelectionError>;

pub fn summarize_provider_probe(
    provider: &TransportProviderDescriptor,
    samples: &[ProbeSample],
) -> Option<ProbeMetrics>;
```

`TransportProviderRegistry::register` rejects duplicate transport IDs and provider IDs. `TransportProviderRegistry::select`
and `select_with_probe` each accept the same `&TransportSelectionOptions` as the corresponding free function and succeed
only under the same frozen evidence rules.
Multiple eligible providers without matching observations are reported as
`ProbeMissing`; they are never ordered by an implementation-private shortcut.
`peer_supported_transports` has set semantics, and `requested_max_frame_bytes = Some(0)` is a valid request rather
than an absent limit.

Readiness, observations, and raw samples are matched by `(transport_id, provider_id)`. `ProbeSample` remains the
raw-input model for `summarize_provider_probe`; selection consumes validated aggregate observations so a provider probe
failure is distinct from an observation that was never supplied. `TransportSelectionError.candidates` uses the
same ordered diagnostic model as successful selection, so an error never discards provider evidence.

Both selection functions use the comparator frozen in
[Transport Strategy and Probing](/en/protocol/v1/transport-strategy). The public API exposes structured metrics and
ordered diagnostics; `ProbeScore`, `ProbeCandidateScore`, `ProbeSelection`, and any opaque weighted score are not part
of the Preview4 API.

## Runtime Control And Object/Cache Frames

Preview4 adds compact control-plane events used by scheduling, cancellation, progress, partial
results, backpressure, capability negotiation, route hints, cache references, and trace context. The
wire definitions are documented under [Runtime Control Profiles](/en/profiles/runtime-control/).
Rust exposes them through client events, server send/receive helpers, and core metadata types.

## Artifact Naming

| Artifact family | Example |
|---|---|
| Native transport FFI | `nnrp-ffi-transport-tcp-native-linux-x86_64-1.0.0-preview.4.17.zip` |
| Native QUIC FFI | `nnrp-ffi-transport-quic-native-windows-x86_64-1.0.0-preview.4.17.zip` |
| Browser WASM | `nnrp-wasm-browser-1.0.0-preview.4.17.zip` |
| Checksums | `SHA256SUMS` |

Downstream SDKs should validate the artifact manifest before loading native libraries or WASM files.
