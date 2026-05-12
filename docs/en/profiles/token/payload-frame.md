---
prev:
  text: Token Schema and Body
  link: /en/profiles/token/schema-body/
next: false
---

# Token Profile: Payload Frame

The payload frame is where token carries the actual discrete sequence content. The descriptor and body define the rules; the payload frame is the content the receiver ultimately displays, buffers, or merges.

## What this layer answers

1. Which token fragment the current chunk actually carries.
2. How that fragment maps back to `sequence_start / sequence_end` and `offset / length`.
3. Whether the receiver should display it immediately, buffer it, or wait for more chunks before merging.

## Typical representation

| Name | Typical shape | Description |
| --- | --- | --- |
| token_chunk | String, byte block, or encoded token fragment | Carries the actual incremental discrete-sequence content |

## Engineering notes

1. The payload frame does not define the token unit; that still comes from schema/body.
2. Do not infer terminal state from the payload frame alone; `terminal` and `stop_reason` still matter.
3. If an implementation supports discontinuous transfer or reassembly, the receiver should merge chunks with descriptor offsets rather than assuming full-sequence delivery.