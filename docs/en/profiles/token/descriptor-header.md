---
prev:
  text: Token Profile
  link: /en/profiles/token/
next:
  text: Token Schema and Body
  link: /en/profiles/token/schema-body/
---

# Token Profile: Descriptor Common Header

The shared field definitions now live in [Typed Payload Descriptor](/en/typed-payload-descriptor/). This page stays token-specific: it shows how the common descriptor fields are combined when the payload belongs to a discrete-sequence stream.

## Key field combinations in token

| Field | What matters in token | Typical values |
| --- | --- | --- |
| `profile_id` | Tells the receiver that the payload belongs to the token family | `token` |
| `schema_id` | Selects the concrete token-sequence template, such as chat delta or tool-result streaming | `llm.chat.delta.v1` |
| `schema_version` | Pins the exact schema interpretation version | `1` |
| `stream_semantics` | Decides how the receiver should append, merge, or otherwise consume the token stream | `ordered_incremental` |
| `offset / length` | Places the current chunk back into the logical sequence | `128 / 36` |
| `descriptor_flags` | Exposes token-side hints such as explicit stop-reason presence | `stop_reason_present` |

## What to focus on in token

1. `schema_id + schema_version` decide how to interpret `token_unit / sequence_start / sequence_end / terminal / stop_reason`.
2. `stream_semantics + offset + length` decide whether the chunk should be appended in order, reassembled, or handled under another sequence policy.
3. `descriptor_flags` is the right place for extra chunk-level hints, not for sampling internals or model-private runtime state.

This descriptor layer anchors token chunks to the right profile, schema, and logical sequence; the actual sequence interpretation still lives in [Schema and Body](./schema-body) and [Payload Frame](./payload-frame).