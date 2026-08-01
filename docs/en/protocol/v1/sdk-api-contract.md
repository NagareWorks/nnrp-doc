# Cross-SDK API Contract

NNRP/1 Preview 4 freezes one semantic role API for Rust, Python, JavaScript/TypeScript, and C#.
Language naming and ownership syntax may be idiomatic, but fields, validation, cardinality, and wire
meaning must remain equivalent.

The normative machine-readable source is
[`nnrp-1-preview4-sdk-api.json`](/contracts/nnrp-1-preview4-sdk-api.json). SDK CI must validate its
public surface against that file. An adapter that normalizes SDK-specific objects for wire
conformance does not prove public API parity.

The machine contract assigns every projected API to exactly one required domain: submission, runtime
events, lifecycle, capability, cache, schema, transport, or roles. Adding a new SDK or feature
without covering every domain is a contract failure, even when its wire adapter passes conformance.

## Submit Request

Every client role accepts one owned, profile-neutral submit request:

| Semantic field | Required | Meaning                                                                          |
| -------------- | -------: | -------------------------------------------------------------------------------- |
| `operation_id` |      Yes | Non-zero `u64` operation identity.                                               |
| `frame_id`     |      Yes | Non-zero `u32` common-header frame identity.                                     |
| `header`       |      Yes | Flags plus caller-selected view, route, and trace identity.                      |
| `metadata`     |      Yes | Typed submit metadata excluding `operation_id`.                                  |
| `body`         |      Yes | Owned application payload; it may be empty when the selected profile permits it. |

The SDK inserts `operation_id` into the encoded `FRAME_SUBMIT` metadata and `frame_id` into the
common header. A binding encodes metadata and body once, then performs one coarse FFI submit call.
That carrier also transports `SubmitHeaderContext`; Rust adds the negotiated `session_id` and
derived header lengths. Application code never builds an FFI buffer.

`SubmitMetadata` retains all normative `FRAME_SUBMIT` semantics, while profile-specific builders own
tile/section counts, byte lengths, payload bitmaps, payload-frame counts, and defaults. The required
builder families are tensor, token, and generic typed payload. Structured-event, tool-delta, audio,
video, and opaque payloads use the typed-payload builder. Every builder produces the same
`SubmitRequest`; they are not separate role protocols.

Each builder accepts one closed input object rather than an open keyword map:

| Builder       | Input                     | SDK-derived wire fields                                                                |
| ------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| tensor        | `TensorSubmitInput`       | tile/section counts, section descriptors, body regions, lengths, mode, reference mask  |
| token         | `TokenSubmitInput`        | token profile/schema defaults, descriptor offsets, payload bitmap, payload-frame count |
| typed payload | `TypedPayloadSubmitInput` | descriptor offsets, payload bitmap, payload-frame count                                |

All three inputs contain a `SubmitIdentity` and `SubmitPolicy`. `SubmitIdentity` owns the non-zero
operation and frame identities plus `SubmitHeaderContext`; `SubmitPolicy` owns frame class, latency
and cadence targets, retry/dependency identities, budget policy, and loss-tolerance policy. Tensor
input additionally owns dimensions, tile IDs, semantic `TensorSection` values, camera bytes, input
profile, tile-index mode, tile base, and standard object references. Token input owns token chunks;
the SDK applies the frozen token profile, schema, and append-stream defaults. Generic typed-payload
input owns semantic `TypedPayloadInputFrame` values; those omit descriptor offsets and lengths,
which the SDK derives from frame order and owned payload sizes.

`TensorSection` is semantic input, not a pre-encoded descriptor. It owns role, codec, dtype, layout,
scale policy, element count, per-tile payloads, optional per-tile codecs, and optional fixed stride.
The SDK derives descriptor flags and all table/payload lengths. The inherited NNRP/1 32-byte tensor
descriptor remains `role_id`, `codec_id`, `dtype_id`, `layout_id`, `scale_policy`, `section_flags`,
`element_count_per_tile`, `codec_table_bytes`, `length_table_bytes`, `payload_bytes`,
`payload_stride_bytes`, and zero `reserved`, in that exact offset order.

Cache references, runtime objects, scheduling updates, and control frames retain their dedicated
typed APIs. They are not hidden in an arbitrary submit metadata map.

## Typed Payload Frames

Every SDK exposes the current 24-byte `TypedPayloadDescriptor` as the same eight semantic fields:
`profile_id`, `payload_kind`, `descriptor_flags`, `schema_id`, `schema_version`, `stream_semantics`,
`offset`, and `length`. A decoded `TypedPayloadFrame` owns that descriptor and its payload bytes.

Every descriptor carries exactly one payload kind. `payload_kind_bitmap` is the union of those
kinds, plus `tensor` when tensor regions are present. SDKs validate this equality and never infer a
per-frame kind from descriptor order. The current layout must not be replaced with the Preview2
16-byte descriptor or the earlier Preview3 draft that omitted the per-frame kind.

## Runtime Event

Every client and server role event owns:

| Field      | Meaning                                                            |
| ---------- | ------------------------------------------------------------------ |
| `header`   | Complete non-derived common-header projection.                     |
| `metadata` | Typed metadata union selected by `header.message_type`.            |
| `tail`     | Typed `none`, body, diagnostic, or metadata-body-plus-delta union. |

The header contains `version_major`, `wire_format`, `message_type`, `flags`, `session_id`,
`frame_id`, `view_id`, `route_id`, and `trace_id`. `header_len`, `meta_len`, and `body_len` are
derived during encoding and are not caller-controlled SDK fields.

An SDK must not duplicate header fields beside `header`, and it must not manufacture zero/default
values when a binding failed to preserve a wire value. Native handles and generation counters are
binding context, not protocol-header fields.

The machine contract contains the closed `RuntimeEventMetadata` and `RuntimeEventTail` variants and
an exhaustive mapping for every message delivered by a role event pump. Handshake responses, probe
replies, migration acknowledgements, cache command acknowledgements, ping/pong, connection close,
and fatal connection errors are consumed by their dedicated role or connection APIs; they must not
be silently reclassified as runtime events.

An FFI carrier may also report local lifecycle state. Such an event has `header.present == 0` and
remains a lifecycle-event type in the SDK. Only `header.present == 1` may become `RuntimeEvent`.
Bindings must not create a zero-filled wire header for local state.

## Runtime Metadata And Enums

The machine contract is a closed graph rather than a curated example list. It freezes every field of
every runtime-event metadata variant, every enum or bitmask referenced by those fields, and the
numeric value and wire width of each enum member. A metadata union variant may not name a type that
is absent from the contract, and an SDK may not replace a frozen enum with a language-local state
model.

`RESULT_PUSH.status_code` remains an application-defined `u16` detail code. It does not encode the
protocol terminal state. `RESULT_PUSH` establishes successful completion; cancellation, drop, and
error are established by their corresponding protocol messages and operation lifecycle. The
canonical terminal registry is `ResultTerminalState` (`success`, `cancelled`, `dropped`, `error`).

Local operation lifecycle uses the canonical `OperationState` registry (`accepted`, `running`,
`partial`, `waiting_tool`, `superseded`, `cancelled`, `failed`, `completed`). It remains separate
from wire events. The terminal mapping is fixed: completed to success, cancelled to cancelled,
superseded to dropped, and failed to error.

## Cache And Provider Host Models

The machine contract also freezes the cross-SDK host values that are not wire records. A semantic
enum has one closed member set but may use an idiomatic language representation, such as a Rust or
C# enum, a Python `StrEnum`, or a TypeScript string union. SDKs may not add or omit semantic
members.

Cache identity, leases, dependencies, versions, results, invalidations, and opt-in policy use the
canonical `CacheObjectId`, `CacheLease`, `CacheDependency`, `CacheDependencyState`,
`CacheObjectVersion`, `CacheLeaseResult`, `CacheInvalidation`, `CacheDependencyInvalidation`, and
`CachePolicyOptions` types. `CacheValidationFailure` contains failures only; a language may express
successful validation through `Result`, an exception-free return, or a `Try` method, but success is
not an additional failure reason.

Provider discovery and selection use the canonical provider cost, limits, metadata, descriptor,
readiness, probe, candidate, selection, failure, and options types. Selection preserves every
ordered candidate and its rejection evidence. `TransportSelection.policy` records the policy that
produced the decision; `TransportSelectionFailure` preserves the same candidate diagnostics instead
of reducing failure to an opaque string. Provider packages own transport behavior and artifacts;
these shared host values do not turn a provider package into a feature flag.

## Canonical Role Options

Every SDK exposes the same transport-neutral option model. Language conventions may change casing,
builders, and constructor syntax, but may not add, remove, or reinterpret fields.

`ClientSessionOptions` is normalized into `SESSION_OPEN`:

| Field                          |                     Default | Meaning                                                    |
| ------------------------------ | --------------------------: | ---------------------------------------------------------- |
| `requested_session_id`         |                         `0` | Preferred wire session id; zero lets the server assign it. |
| `profile_id`                   |      standard token profile | Requested profile registry id.                             |
| `schema_id` / `schema_version` | standard token delta schema | Requested schema identity.                                 |
| `priority_class`               |                  `balanced` | Session scheduling class.                                  |
| `default_deadline_ms`          |                       `500` | Default operation deadline.                                |
| `max_in_flight_operations`     |                         `4` | Requested session concurrency ceiling.                     |
| `lease_ttl_hint_ms`            |                     `30000` | Requested cache lease lifetime.                            |
| `allow_resume`                 |                     `false` | Enables resumable-session negotiation.                     |
| `resume_token_bytes`           |                         `0` | Requested resume-token capacity.                           |
| `cache_hints`                  |                       empty | Cache object kinds the client expects to reuse.            |

The runtime derives `session_flags`, authentication and extension byte lengths, and the client
session tag. Applications do not construct those wire fields.

`ServerSessionOptions` freezes `supported_profiles`, `supported_cache_objects`, cache object and
byte limits, `schema_registry`, resume-token capacity, in-flight and granted-credit limits, lease
and resume windows, and `application_policy`. Its defaults match the standard token profile: four
in-flight operations, two granted credits, a 30-second lease, and a 120-second resume window. The
default policy accepts every wire-valid session.

Client and server bootstrap options contain the application endpoint, ordered provider routes,
transport policy, and the corresponding session defaults. `ServerAcceptOptions` contains only the
accept timeout. Connection, session, and server handles or generations are FFI implementation
details and never appear in application options. Cadence, quality tier, and application metadata are
profile or `SESSION_PATCH` values and do not alter `SESSION_OPEN`.

## Schema Registry Host API

All SDKs expose the inherited NNRP/1 schema registry as an application-facing host object, not an
FFI handle. `SchemaDescriptorHeader` is the canonical 32-byte descriptor. The registry provides
`install`, `lookup`, `invalidate`, `validate_binding`, and `snapshot`; actions and failures use the
closed `SchemaRegistryAction` and `SchemaRegistryFailure` registries. Profile-private schema bodies
remain outside the public descriptor.

## Role Surface And Results

The client and server role APIs both receive runtime events in wire order per session. For every
message in the runtime-event registry, the receiving-role booleans also define the opposite role as
an allowed sender. Each role must expose every allowed send through either an ergonomic typed method
or a typed generic runtime-frame method. A raw message code paired with unchecked metadata is not an
application API.

The application-facing `NnrpResult` owns a non-zero operation identity, a canonical
`ResultTerminalState`, and the terminal `RuntimeEvent`. This preserves the complete wire header,
typed metadata, and semantic tail instead of flattening the result into an SDK-specific payload or
string map.

Every role also exposes immutable connection and session lifecycle snapshots. Connection state is
exactly `open`, `closing`, or `closed`; session state is exactly `open`, `resumed`, `closing`,
`draining`, or `closed`. A session snapshot preserves the negotiated profile, priority, schema,
in-flight limit, route scope, last operation, and session error code. SDK-local state machines may
own transitions, but they may not publish a smaller or differently named semantic state registry.

One logical client connection may own many sessions. One logical server owns a set of installed
provider listeners and may accept many sessions. Application endpoints remain `nnrp://` or
`nnrps://`; `tcp://`, `quic://`, `unix://`, `npipe://`, `ws://`, and `wss://` are provider-local
locators and never replace the application endpoint.

## Release Gate

A Preview 4 SDK release is blocked unless all of the following hold:

1. Its public API projection matches the machine-readable contract.
2. Its native and WebSocket event paths preserve the same header and tail semantics.
3. Its profile builders produce wire-conformant metadata without additional FFI round trips.
4. Its current data-plane records match the contract's exact sizes, offsets, and canonical bytes.
5. Wire conformance and public API parity both pass; neither substitutes for the other.
6. No compatibility shim for an earlier preview remains in the public surface.
7. Every type reference, metadata union branch, enum value, role direction, and language projection
   passes the machine-contract closure checks.
8. Cache-host and provider-selection public values match the same semantic contract; an SDK-specific
   convenience wrapper may not replace or truncate them.
9. Client, server, session, schema-registry, and admission-policy host APIs match the canonical
   option and method contracts, including defaults and internal-only fields.
