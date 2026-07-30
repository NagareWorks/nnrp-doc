# Cross-SDK API Contract

NNRP/1 Preview 4 freezes one semantic role API for Rust, Python, JavaScript/TypeScript, and C#.
Language naming and ownership syntax may be idiomatic, but fields, validation, cardinality, and wire
meaning must remain equivalent.

The normative machine-readable source is
[`nnrp-1-preview4-sdk-api.json`](/contracts/nnrp-1-preview4-sdk-api.json). SDK CI must validate its
public surface against that file. An adapter that normalizes SDK-specific objects for wire
conformance does not prove public API parity.

## Submit Request

Every client role accepts one owned, profile-neutral submit request:

| Semantic field | Required | Meaning                                                                          |
| -------------- | -------: | -------------------------------------------------------------------------------- |
| `operation_id` |      Yes | Non-zero `u64` operation identity.                                               |
| `frame_id`     |      Yes | Non-zero `u32` common-header frame identity.                                     |
| `metadata`     |      Yes | Typed submit metadata excluding `operation_id`.                                  |
| `body`         |      Yes | Owned application payload; it may be empty when the selected profile permits it. |

The SDK inserts `operation_id` into the encoded `FRAME_SUBMIT` metadata and `frame_id` into the
common header. A binding encodes metadata and body once, then performs one coarse FFI submit call.
Application code never builds an FFI buffer.

`SubmitMetadata` retains all normative `FRAME_SUBMIT` semantics, while profile-specific builders own
counters, byte lengths, and defaults. Tensor, token, structured-event, tool-delta, and opaque
payload helpers produce the same `SubmitRequest`; they are not separate role protocols.

Cache references, runtime objects, scheduling updates, and control frames retain their dedicated
typed APIs. They are not hidden in an arbitrary submit metadata map.

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

## Release Gate

A Preview 4 SDK release is blocked unless all of the following hold:

1. Its public API projection matches the machine-readable contract.
2. Its native and WebSocket event paths preserve the same header and tail semantics.
3. Its profile builders produce wire-conformant metadata without additional FFI round trips.
4. Wire conformance and public API parity both pass; neither substitutes for the other.
5. No compatibility shim for an earlier preview remains in the public surface.
