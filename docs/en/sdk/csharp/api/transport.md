# C# Transport API

In NNRP SDK terminology, a transport provider is the carrier boundary below the NNRP framing and
runtime semantics. It may use a transport-layer protocol, an application-layer carrier such as
WebSocket, or local IPC. The term does not redefine the OSI transport layer.

## `NnrpEndpoint`

`NnrpEndpoint.Parse(string)` accepts only application-facing `nnrp://` and `nnrps://` endpoints.
The immutable value preserves `Authority`, `PathAndQuery`, and `IsSecure`. It rejects credentials,
fragments, missing authority, and carrier schemes.

Role APIs accept `NnrpEndpoint`; selecting IPC or WebSocket never forces application configuration to
replace the NNRP scheme.

## `NnrpProviderEndpoint`

`NnrpProviderEndpoint.Parse(string)` represents an explicit carrier-local override. Provider
packages validate the locator they own:

| Provider | Accepted locator |
|---|---|
| TCP | Host and port |
| QUIC | Host and port |
| IPC on Unix | `unix://` |
| IPC on Windows | `npipe://` |
| WebSocket | `ws://` or `wss://` |

Provider endpoints are for diagnostics, conformance, and controlled deployment. Application code
still keeps `NnrpEndpoint` as the logical endpoint, while carrier resolution follows these exact
rules:

1. TCP and QUIC derive host and port from the application authority when no override is present.
2. IPC requires an explicit matching `unix://` or `npipe://` locator.
3. WebSocket requires an explicit matching `ws://` or `wss://` locator.
4. A locator for a different provider, or a platform-incompatible IPC locator, is rejected before
   connect, listen, or probe creates a native handle.

An unresolved client route remains visible as a `RouteUnresolved` candidate; Auto/Prefer may
continue with other viable routes, while Force never falls back. An unresolved server route is a
configuration error under Auto/Prefer because the logical listener set must include every allowed
installed provider.

Unknown route keys are invalid. A route for a known but uninstalled transport produces a
`LocalUnavailable` candidate. If several checks fail, rejection reasons follow the protocol registry order;
`RouteUnresolved` therefore takes precedence over `SecurityUnsatisfied`.

## Transport Security

| Type | Frozen values |
|---|---|
| `NnrpTransportClientSecurity` | `ServerName`, owned `TrustedCertificateDer` |
| `NnrpTransportServerSecurity` | owned `CertificateDer`, owned `PrivateKeyPkcs8Der` |

Client security is accepted only by connect/probe paths. Server security is accepted only by listen
paths. QUIC, TLS-enabled TCP, and `wss://` require the corresponding security value. Plain TCP,
IPC, and `ws://` do not satisfy an `nnrps://` application endpoint.

## Provider Routes

| Type | Frozen properties |
|---|---|
| `NnrpClientProviderRoute` | `ProviderEndpoint`, `Security` |
| `NnrpServerProviderRoute` | `ProviderEndpoint`, `Security` |

`NnrpClientOptions.ProviderRoutes` and `NnrpServerOptions.ProviderRoutes` are readonly dictionaries
keyed by `TransportId`. A route owns the locator and security for exactly one carrier. Role-wide
`ProviderEndpoint` and `Security` options are not part of the Preview4 host API.

## Provider Contract

```csharp
public interface INnrpNativeTransportProvider
{
    NnrpTransportProviderDescriptor Descriptor { get; }

    ValueTask<NnrpTransportConnection> ConnectAsync(
        NnrpTransportConnectOptions options,
        CancellationToken cancellationToken = default);

    ValueTask<NnrpTransportListener> ListenAsync(
        NnrpTransportListenOptions options,
        CancellationToken cancellationToken = default);

    ValueTask<NnrpTransportProbeMetrics> ProbeAsync(
        NnrpTransportProbeOptions options,
        CancellationToken cancellationToken = default);
}
```

`NnrpTransportConnection` and `NnrpTransportListener` are opaque, disposable ownership values. They
can transfer carrier ownership to the role runtime but never expose an FFI handle, pointer, or native
buffer to applications.

| Options type | Frozen properties |
|---|---|
| `NnrpTransportConnectOptions` | `Endpoint`, `ProviderEndpoint`, `Security`, `MaxPacketBytes`, `TimeoutMilliseconds` |
| `NnrpTransportListenOptions` | `Endpoint`, `ProviderEndpoint`, `Security`, `MaxPacketBytes`, `TimeoutMilliseconds` |
| `NnrpTransportProbeOptions` | connect options plus `SampleCount`, `PayloadBytes`, `IncludeWarmup` |

## Provider Metadata

| C# type | Frozen properties or values |
|---|---|
| `NnrpTransportProviderKind` | `PureRust`, `NativeDynamic`, `Wasm` |
| `NnrpTransportProviderCost` | `ModelId: ushort`, `Units: ulong` |
| `NnrpTransportProviderLimits` | `MaxFrameBytes: ulong` |
| `NnrpTransportProviderLimitation` | `RequiresUdp`, `RequiresTcp`, `LocalHostOnly`, `NativeHostOnly`, `BrowserHostOnly`, `UnixDomainSocket`, `WindowsNamedPipe` |
| `NnrpTransportProviderMetadata` | `Id: string`, `Cost: NnrpTransportProviderCost`, `PreferenceRank: ushort`, `Limits: NnrpTransportProviderLimits`, `Limitations: IReadOnlyList<NnrpTransportProviderLimitation>` |
| `NnrpTransportProviderDescriptor` | `Name: string`, `Version: string`, `TransportId: TransportId`, `Kind: NnrpTransportProviderKind`, `Available: bool`, `LibraryPath: string?`, `Metadata: NnrpTransportProviderMetadata`, `Diagnostic: string?` |
| `NnrpTransportCandidateReadiness` | `TransportId: TransportId`, `ProviderId: string`, `RouteResolved: bool`, `SecuritySatisfied: bool`, `Diagnostic: string?` |
| `NnrpTransportProbeState` | `NotRun`, `Succeeded`, `Failed`, `Missing` |
| `NnrpTransportProbeMetrics` | `SampleCount: uint`, `SuccessCount: uint`, `MedianThroughputBytesPerSecond: ulong`, `MedianRttMicroseconds: ulong` |
| `NnrpTransportProbeObservation` | `TransportId: TransportId`, `ProviderId: string`, `State: NnrpTransportProbeState`, `Metrics: NnrpTransportProbeMetrics?`, `Diagnostic: string?`; state is `Succeeded` or `Failed` |
| `NnrpTransportRejectionReason` | `PolicyDisallowed`, `LocalUnavailable`, `PeerUnsupported`, `LimitExceeded`, `RouteUnresolved`, `SecurityUnsatisfied`, `ProbeMissing`, `ProbeFailed` |
| `NnrpTransportCandidate` | `TransportId: TransportId`, `Provider: NnrpTransportProviderMetadata`, `LocalAvailable: bool`, `PeerSupported: bool`, `WithinLimits: bool`, `ProbeState: NnrpTransportProbeState`, `Probe: NnrpTransportProbeMetrics?`, `SelectionRank: uint?`, `RejectionReason: NnrpTransportRejectionReason?`, `Diagnostic: string?` |
| `NnrpTransportSelection` | `SelectedProvider: NnrpTransportProviderDescriptor`, ordered `Candidates: IReadOnlyList<NnrpTransportCandidate>`, `Policy: TransportPolicy`, `Diagnostic: string?` |
| `NnrpTransportSelectionException` | `Code: NnrpTransportSelectionErrorCode`, `Policy: TransportPolicy?`, `Candidates: IReadOnlyList<NnrpTransportCandidate>`, `Diagnostic: string?`; `InvalidEvidence` occurs before selection |

`NnrpTransportSelectionOptions` freezes the inputs to registry selection:

| Property | Type | Required | Description |
|---|---|---:|---|
| `PeerSupportedTransports` | `IReadOnlyCollection<TransportId>` | Yes | Carrier intersection advertised by the peer. |
| `Policy` | `TransportPolicy` | No | Defaults to `Auto`. |
| `RequestedMaxFrameBytes` | `ulong?` | No | Workload limit checked against `Provider.Limits.MaxFrameBytes`. |
| `CandidateReadiness` | `IReadOnlyCollection<NnrpTransportCandidateReadiness>` | Yes | Route/security evidence for every registered provider. |
| `ProbeObservations` | `IReadOnlyCollection<NnrpTransportProbeObservation>?` | No | Succeeded/failed evidence keyed by transport and provider identity. |

Metadata is validated against the Rust artifact manifest. C# uses the comparator frozen in
[Transport Strategy and Probing](/en/protocol/v1/transport-strategy) and does not invent a weighted
score.

## `NnrpNativeTransportRegistry`

| Method | Semantics |
|---|---|
| `Register(INnrpNativeTransportProvider)` | Registers one provider and rejects duplicate provider or transport IDs. |
| `Snapshot()` | Returns an immutable, stable-order provider snapshot. |
| `Resolve(NnrpTransportSelectionOptions)` | Filters and selects from the snapshot with typed candidate evidence; throws `NnrpTransportSelectionException` with complete candidates when no provider is selectable. |

Installed first-party packages register `NnrpNativeTcpTransportProvider`,
`NnrpNativeQuicTransportProvider`, `NnrpNativeIpcTransportProvider`, or
`NnrpNativeWebSocketTransportProvider` in the internal default registry. Public role options do not
accept provider instances or native handles; `ProviderRoutes` supplies provider endpoint intent and
`TransportPolicy` constrains selection over the installed packages.

One valid provider is selected directly. More than one valid provider triggers the frozen probe and
comparison path. Rejected candidates remain visible in `NnrpTransportSelection`.

Registration rejects duplicate transport IDs and duplicate provider metadata IDs without replacing the provider already
registered. Readiness and probe observations are matched by `(TransportId, ProviderId)`; duplicate, unmatched, or
incomplete readiness is invalid input. No matching probe observation means `Missing`, while an observation with state
`Failed` remains a distinct failure.

## First-Party Packages

| Package | Concrete provider | Owned artifacts |
|---|---|---|
| `Nnrp.Transport.Tcp` | `NnrpNativeTcpTransportProvider` | TCP only |
| `Nnrp.Transport.Quic` | `NnrpNativeQuicTransportProvider` | QUIC only |
| `Nnrp.Transport.Ipc` | `NnrpNativeIpcTransportProvider` | IPC only |
| `Nnrp.Transport.WebSocket` | `NnrpNativeWebSocketTransportProvider` | WebSocket only |

Each package owns its concrete provider descriptor and transport-scoped Rust artifact. The concrete provider exposes
connect, listen, and probe, while `Nnrp.NativeBridge` owns the shared coarse FFI invocation and native-handle lifetime
mechanics. Client and server packages do not carry transport artifacts.

## Diagnostic Framed Transports

`INnrpMessageSender`, `INnrpMessageReceiver`, `INnrpMessageTransport`, and
`NnrpTcpMessageTransport` remain low-level packet diagnostic/custom-carrier contracts. They do not
participate in production provider selection and are not a fallback when native artifacts are
missing.
