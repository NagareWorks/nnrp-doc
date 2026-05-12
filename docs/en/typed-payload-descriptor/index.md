---
prev:
  text: Common Header
  link: /en/common-header/
next:
  text: Tensor Profile
  link: /en/profiles/tensor/
---

# Typed Payload Descriptor

This page covers the shared descriptor fields used across profiles. Its job is not to replace the common header or the profile-specific body. Its job is to pin down which semantic family a payload belongs to, which schema should interpret it, and where the payload sits in the logical stream.

## What this layer solves

1. The common header can classify the message family, but it cannot fully describe the profile and schema semantics of the payload.
2. Profile-specific bodies provide detailed interpretation, but receivers first need a shared way to know which profile and schema to use.
3. Incremental, chunked, and region-based results all need a logical-position layer that stays independent from the profile body itself.

## Reading path

1. Start with `profile_id / schema_id / schema_version` to understand semantic binding.
2. Then read `stream_semantics / offset / length` to understand logical position and consumption mode.
3. Finish with `descriptor_flags` for optional hints and extra consumption signals.

## Shared field summary

| Field | Data shape | Semantic role | Typical values | Value range |
| --- | --- | --- | --- | --- |
| profile_id | Enum or short string | Identifies the profile semantic family of the payload | `tensor`, `token` | Publicly registered profile identifiers |
| schema_id | Enum or short string | Identifies the concrete schema template | `im.render.tile.v1`, `llm.chat.delta.v1` | Public schema identifiers registered under the current profile |
| schema_version | Integer | Pins the schema's own version | `1` | Non-negative integers, with exact limits defined by implementations |
| stream_semantics | Enum or short string | Describes how the current payload should be consumed in the result stream | `region_partial`, `ordered_incremental` | Stream-semantic sets publicly defined by the active schema or profile |
| offset | Integer | Points to the logical start position of the current payload chunk | `0`, `128` | Non-negative integers |
| length | Integer | Describes the logical size of the current payload chunk | `3145728`, `36` | Non-negative integers |
| descriptor_flags | Flag set or short-string array | Exposes extra hints attached to the current descriptor | `degraded_allowed`, `coverage_present`, `stop_reason_present` | Optional flags jointly defined by the protocol and active profile |

## profile_id

| Field | Data shape | Semantic role | Typical values | Value range |
| --- | --- | --- | --- | --- |
| profile_id | Enum or short string | Identifies the profile semantic family of the payload | `tensor`, `token` | Publicly registered profile identifiers |

`profile_id` is the first semantic split in the descriptor layer. Without it, receivers cannot reliably decide whether the downstream body should be interpreted as tensor, token, or another profile family.

## schema_id

| Field | Data shape | Semantic role | Typical values | Value range |
| --- | --- | --- | --- | --- |
| schema_id | Enum or short string | Identifies the concrete schema template | `im.render.tile.v1`, `llm.chat.delta.v1` | Public schema identifiers registered under the current profile |

One profile can expose multiple schemas. `schema_id` prevents the ambiguity of saying “this is tensor” or “this is token” while still leaving the actual body layout unclear.

## schema_version

| Field | Data shape | Semantic role | Typical values | Value range |
| --- | --- | --- | --- | --- |
| schema_version | Integer | Pins the schema's own version | `1` | Non-negative integers, with exact limits defined by implementations |

When `schema_id` needs to evolve without forcing a rename for every change, `schema_version` becomes the clean freeze point. It should always be interpreted together with `schema_id`.

## stream_semantics

| Field | Data shape | Semantic role | Typical values | Value range |
| --- | --- | --- | --- | --- |
| stream_semantics | Enum or short string | Describes how the current payload should be consumed in the result stream | `region_partial`, `ordered_incremental` | Stream-semantic sets publicly defined by the active schema or profile |

`stream_semantics` answers how consumers should treat the data they just received. It is not just a label. It constrains chunk merging, append behavior, and whether partial data is immediately consumable.

## offset

| Field | Data shape | Semantic role | Typical values | Value range |
| --- | --- | --- | --- | --- |
| offset | Integer | Points to the logical start position of the current payload chunk | `0`, `128` | Non-negative integers |

`offset` only describes logical position. Whether that means bytes, sequence units, or another unit depends on the active schema definition.

## length

| Field | Data shape | Semantic role | Typical values | Value range |
| --- | --- | --- | --- | --- |
| length | Integer | Describes the logical size of the current payload chunk | `3145728`, `36` | Non-negative integers |

`length` works together with `offset` to describe which segment of the logical stream the current chunk covers. Its unit must be interpreted through the active schema rather than assumed to always be bytes.

## descriptor_flags

| Field | Data shape | Semantic role | Typical values | Value range |
| --- | --- | --- | --- | --- |
| descriptor_flags | Flag set or short-string array | Exposes extra hints attached to the current descriptor | `degraded_allowed`, `coverage_present`, `stop_reason_present` | Optional flags jointly defined by the protocol and active profile |

`descriptor_flags` is a good place for extra consumption hints. It is the wrong place to hide structured body fields or model-private runtime state.

<div class="page-note">
  These pages define cross-profile shared field semantics. When you move into tensor, token, or another profile, switch back to that profile's descriptor page to see how the shared fields are actually combined there.
</div>