# C# - Message Types

`Nnrp.Core` exposes the transport-neutral NNRP wire model. Application code normally uses the
role APIs in [`Nnrp.Client`](./client) and [`Nnrp.Server`](./server); these message types are for
transport providers, diagnostics, conformance targets, and protocol tooling.

```csharp
using Nnrp.Core;
```

## Common Message Shape

Every concrete message is a `readonly struct` composed from an [`NnrpHeader`](./protocol#nnrpheader),
zero or one fixed-width metadata value, and any body regions defined by that message. For example,
`TransportProbeAckMessage` exposes this exact shape:

```csharp
public NnrpHeader Header { get; }
public TransportProbeAckMetadata Metadata { get; }

public NnrpFramedMessage ToFramedMessage();
public byte[] ToArray();

public static bool TryParse(
    ReadOnlyMemory<byte> source,
    out TransportProbeAckMessage message,
    out NnrpParseError error);
```

Messages such as `PingMessage`, `PongMessage`, and `ResultDropMessage` are header-only; `CloseMessage`
has a body and no metadata. Metadata types expose `ToArray()` and
`TryParse(ReadOnlySpan<byte>, ...)`. Strict overloads reject reserved values and non-zero reserved
fields. Message parsing validates the header type, fixed metadata length, body-region lengths, and
trailing data before returning a value.

## Connection Handshake

### `ClientHelloMessage`

| Property | Type | Meaning |
|---|---|---|
| `Header` | `NnrpHeader` | `ClientHello` frame header |
| `Metadata` | `ClientHelloMetadata` | Version, profile, payload, codec, cache, lane, and budget capabilities |
| `AuthBlock` | `ReadOnlyMemory<byte>` | Application authentication bytes |
| `Extensions` | `ReadOnlyMemory<ControlExtensionBlock>` | Aligned control-extension blocks |

Typed accessors decode the client transport policy, loss tolerance, and payload capabilities:

```csharp
bool TryGetClientTransportPolicyExtension(
    out ClientTransportPolicyExtension extension,
    out NnrpParseError error);
bool TryGetClientLossToleranceExtension(
    out ClientLossToleranceExtension extension,
    out NnrpParseError error);
bool TryGetClientPayloadCapabilitiesExtension(
    out ClientPayloadCapabilitiesExtension extension,
    out NnrpParseError error);
```

### `ServerHelloAckMessage`

| Property | Type | Meaning |
|---|---|---|
| `Header` | `NnrpHeader` | `ServerHelloAck` frame header |
| `Metadata` | `ServerHelloAckMetadata` | Selected capabilities, limits, retry policy, and server flags |
| `Extensions` | `ReadOnlyMemory<ControlExtensionBlock>` | Accepted control-extension blocks |

Typed accessors decode the accepted transport policy, loss tolerance, and payload capabilities:

```csharp
bool TryGetServerTransportPolicyAckExtension(
    out ServerTransportPolicyAckExtension extension,
    out NnrpParseError error);
bool TryGetServerLossToleranceAckExtension(
    out ServerLossToleranceAckExtension extension,
    out NnrpParseError error);
bool TryGetServerPayloadCapabilitiesAckExtension(
    out ServerPayloadCapabilitiesAckExtension extension,
    out NnrpParseError error);
```

`PingMessage`, `PongMessage`, `CloseMessage`, and `ErrorMessage` complete the connection-control
surface. `ErrorMessage` carries `ErrorMetadata` plus optional diagnostic bytes.

## Session Lifecycle

| Message | Metadata/body |
|---|---|
| `SessionOpenMessage` | `SessionOpenMetadata` plus auth, resume-token, and extension bytes |
| `SessionOpenAckMessage` | `SessionOpenAckMetadata` plus resume-token and extension bytes |
| `SessionPatchMessage` | `SessionPatchMetadata` plus optional `TensorProfilePatchBlock` |
| `SessionPatchAckMessage` | `SessionPatchAckMetadata` plus optional `TensorProfilePatchAckBlock` |
| `SessionCloseMessage` | `SessionCloseMetadata` |
| `SessionCloseAckMessage` | `SessionCloseAckMetadata` |
| `SessionMigrateMessage` | `SessionMigrateMetadata` |
| `SessionMigrateAckMessage` | `SessionMigrateAckMetadata` |

Role APIs own lifecycle ordering. Low-level callers must enforce the same state transitions through
[`NnrpSessionStateMachine`](./protocol#nnrpsessionstatemachine).

For the Preview4 application-facing lifecycle model, use
[`NnrpConnectionLifecycle` and `NnrpSessionLifecycle`](./runtime#connection-and-session-lifecycle).
The model preserves whether a session was opened or resumed when a close request is rejected.

## Submission And Results

### `FrameSubmitMessage`

`FrameSubmitMessage` contains:

- `FrameSubmitMetadata`
- one `TensorSubmitBlock`
- an optional camera block
- tile IDs
- tensor section blocks

`FrameSubmitMetadata` carries dimensions, frame/input profile, latency budget, cadence, submit and
budget policy, object-reference mask, dependency frame, payload-kind bitmap, and payload-frame
count. The wire `operation_id` is managed by the Preview4 runtime-control tail and role APIs; it is
not aliased to `FrameId`.

### `ResultPushMessage`

`ResultPushMessage` contains:

- `ResultPushMetadata`
- one `TensorResultBlock`
- tile IDs and tensor sections
- typed payload descriptors
- typed payload frame bytes and validated frame views
- typed profile-coverage records

Parsing validates typed-payload ranges and profile coverage before exposing views. Use the role API
snapshot types when data must outlive the decoded frame.

### Other data messages

| Message | Meaning |
|---|---|
| `FrameCancelMessage` | Cancels the frame identified by its header |
| `ResultDropMessage` | Terminates a result without a payload |
| `ResultHintMessage` | Carries applied budget policy, congestion state, reason, and retry delay |
| `SubmitOutcome` | Discriminated result containing either `ResultPushMessage` or `ResultDropMessage` |

## Cache Messages

Preview4 uses the full cache identity: namespace, high and low key words, and object kind.

| Message | Public payload |
|---|---|
| `CachePutMessage` | `CachePutMetadata` plus `ObjectBytes` |
| `CacheAckMessage` | `CacheAckMetadata` |
| `CacheInvalidateMessage` | `CacheInvalidateMetadata` |

Role-facing cache operations use [`NnrpCacheObjectId`](./runtime#local-cache-lease-state). They do
not expose a second narrow key type.

## Flow And Transport Probe Messages

`FlowUpdateMessage` wraps `FlowUpdateMetadata`, including scope, reason, backpressure level,
connection/session/operation credits, the 64-bit operation ID, retry delay, credit epoch, and flags.

`TransportProbeMessage` carries `TransportProbeMetadata` plus the probe payload.
`TransportProbeAckMessage` carries `TransportProbeAckMetadata`. Provider selection consumes the
probe result through the typed provider API; applications do not parse probe packets themselves.

## `ControlExtensionBlock`

`ControlExtensionBlock` is the public aligned TLV value used by handshake messages.

```csharp
public readonly struct ControlExtensionBlock
{
    public ushort ExtensionType { get; }
    public ReadOnlyMemory<byte> Value { get; }
    public uint Length { get; }
    public int TotalLength { get; }
    public int PaddingLength { get; }
    public bool IsCritical { get; }
    public ushort TypeCode { get; }
    public ControlExtensionType TypedType { get; }

    public void WriteTo(Span<byte> destination);
    public byte[] ToArray();
    public static bool TryParse(
        ReadOnlySpan<byte> source,
        out ControlExtensionBlock block,
        out int bytesConsumed,
        out NnrpParseError error);
}
```

Unknown critical extensions fail negotiation. Unknown non-critical extensions may be ignored while
their aligned wire length is still consumed.

## Lifetime Rules

::: warning
`ReadOnlyMemory<byte>` and typed frame views may reference the input packet or a native-owned
buffer. Do not retain them beyond the documented owner lifetime. Role APIs return copied snapshots
where lifetime must be independent.
:::
