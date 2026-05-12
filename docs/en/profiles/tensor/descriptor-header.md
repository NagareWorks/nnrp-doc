---
prev:
  text: Tensor Profile
  link: /en/profiles/tensor/
next:
  text: Tensor Schema and Body
  link: /en/profiles/tensor/schema-body/
---

# Tensor Profile: Descriptor Common Header

The shared field definitions now live in [Typed Payload Descriptor](/en/typed-payload-descriptor/). This page stays tensor-specific: it explains how those shared descriptor fields are combined when the payload belongs to the tensor family.

## Key field combinations in tensor

| Field | What matters in tensor | Typical values |
| --- | --- | --- |
| `profile_id` | Tells the receiver that the downstream body belongs to the tensor family | `tensor` |
| `schema_id` | Selects the concrete tensor semantic template, such as tile, frame, or another numeric structure | `im.render.tile.v1` |
| `schema_version` | Pins the exact schema interpretation version | `1` |
| `stream_semantics` | Decides whether the tensor arrives as a full result, a region chunk, or another incremental form | `region_partial` |
| `offset / length` | Places the current chunk back into the logical tensor stream | `0 / 3145728` |
| `descriptor_flags` | Exposes tensor-side hints such as explicit coverage presence | `degraded_allowed`, `coverage_present` |

## What to focus on in tensor

1. `schema_id + schema_version` decide which tensor body contract should interpret `shape / layout / dtype / coverage`.
2. `stream_semantics + offset + length` decide whether the current payload is a whole tensor, a region block, or an incremental chunk.
3. `descriptor_flags` works best as extra consumption hints rather than as a substitute for structured body fields.

This descriptor layer anchors tensor payloads to the right profile, schema, and logical stream; the actual numeric interpretation still lives in [Schema and Body](./schema-body) and [Payload Frame](./payload-frame).