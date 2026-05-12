---
prev:
  text: Tensor Schema and Body
  link: /en/profiles/tensor/schema-body/
next:
  text: Token Profile
  link: /en/profiles/token/
---

# Tensor Profile: Payload Frame

The payload frame is where tensor carries the actual numeric bytes. The descriptor and body explain how to interpret the bytes; the payload frame is the data itself.

## What this layer answers

1. How much raw tensor data is present in the current chunk.
2. How that chunk maps back to `offset` and `length`.
3. Whether the receiver should process one chunk, reassemble multiple chunks, or wait for a full tensor.

## Typical representation

| Name | Typical shape | Description |
| --- | --- | --- |
| tensor_chunk | Binary block | Can hold a full tensor, a region chunk, or another partial numeric segment |

## Engineering notes

1. The payload frame does not self-describe shape, layout, or dtype; those still come from schema/body.
2. You cannot infer complete, partial, or degraded semantics from the payload frame alone; fixed metadata and descriptor still matter.
3. When a transport or implementation splits the tensor into chunks, receivers should reassemble with `offset` and `length` rather than assuming full-tensor delivery every time.