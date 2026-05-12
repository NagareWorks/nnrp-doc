---
prev:
  text: Tensor Descriptor Common Header
  link: /en/profiles/tensor/descriptor-header/
next:
  text: Tensor Payload Frame
  link: /en/profiles/tensor/payload-frame/
---

# Tensor Profile: Schema and Body

This page covers the fields that tensor adds on top of the shared descriptor. They stay out of the public layer because they only make sense for the tensor family.

## dtype

| Field | Data shape | Typical values | Description |
| --- | --- | --- | --- |
| dtype | Scalar type | `f16`, `f32`, `u8` | Specifies how each payload element should be interpreted |

## shape

| Field | Data shape | Typical values | Description |
| --- | --- | --- | --- |
| shape | Integer array | `[1, 3, 512, 512]` | Defines the logical tensor dimensions and total element layout |

## layout

| Field | Data shape | Typical values | Description |
| --- | --- | --- | --- |
| layout | Enum or short string | `nchw`, `nhwc` | Maps shape dimensions onto semantic axes |

## coverage

| Field group | Child fields | Typical values | Description |
| --- | --- | --- | --- |
| coverage | `tile_x / tile_y / width / height` | `12 / 7 / 512 / 512` | Explains which spatial region the current tensor chunk covers |

`coverage` matters when the schema carries region-based semantics. It should not be treated as a universal required tensor field.