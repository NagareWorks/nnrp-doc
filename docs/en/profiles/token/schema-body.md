---
prev:
  text: Token Descriptor Common Header
  link: /en/profiles/token/descriptor-header/
next:
  text: Token Payload Frame
  link: /en/profiles/token/payload-frame/
---

# Token Profile: Schema and Body

This page covers the fields that token adds on top of the shared descriptor. These are the fields that actually explain how the discrete sequence should be interpreted.

## token_unit

| Field | Data shape | Typical values | Description |
| --- | --- | --- | --- |
| token_unit | Enum or short string | `bpe`, `sentencepiece` | Defines the segmentation contract for the sequence |

## sequence_start

| Field | Data shape | Typical values | Description |
| --- | --- | --- | --- |
| sequence_start | Integer | `128` | Start position covered by the current chunk |

## sequence_end

| Field | Data shape | Typical values | Description |
| --- | --- | --- | --- |
| sequence_end | Integer | `136` | End position covered by the current chunk |

## terminal

| Field | Data shape | Typical values | Description |
| --- | --- | --- | --- |
| terminal | Boolean | `true`, `false` | Indicates whether the current operation or profile output has terminated |

## stop_reason

| Field | Data shape | Typical values | Description |
| --- | --- | --- | --- |
| stop_reason | Enum or string | `none`, `eos`, `tool_call` | Explains why output stopped when the schema decides to expose it |

`sequence_start / sequence_end` position the chunk in the logical stream. `terminal / stop_reason` tell the consumer whether more chunks are still expected.