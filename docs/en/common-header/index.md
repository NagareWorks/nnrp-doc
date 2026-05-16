---
prev:
  text: Core Objects and Flow
  link: /en/core-concepts/
next:
  text: Typed Payload Descriptor
  link: /en/typed-payload-descriptor/
---

# Common Header

The common header is the first stable skeleton users should understand.

Across the public design evolution, NNRP keeps two key principles in its common header model:

1. Fixed length for fast and uniform parsing.
2. A self-describing `meta_len + body_len` model for reliable byte-stream transport bindings.

The current common header is `40B`. This page keeps the whole layout, the field summary, and the per-field notes in one place for continuous reading.

<div class="protocol-diagram">
  <div class="protocol-row">
    <div class="protocol-block tone-a" style="flex: 4 1 0">
      <span class="field-offset">0-3</span>
      <span class="field-name">magic</span>
      <span class="field-size">4B</span>
      <span class="field-tip">ASCII `NNRP`, used for quick protocol identification.</span>
    </div>
    <div class="protocol-block tone-b" style="flex: 1 1 0">
      <span class="field-offset">4</span>
      <span class="field-name">version_major</span>
      <span class="field-size">1B</span>
      <span class="field-tip">Major protocol version.</span>
    </div>
    <div class="protocol-block tone-b" style="flex: 1 1 0">
      <span class="field-offset">5</span>
      <span class="field-name">wire_format</span>
      <span class="field-size">1B</span>
      <span class="field-tip">Wire-level format selector for the current header and payload encoding.</span>
    </div>
    <div class="protocol-block tone-c" style="flex: 1 1 0">
      <span class="field-offset">6</span>
      <span class="field-name">msg_type</span>
      <span class="field-size">1B</span>
      <span class="field-tip">Top-level message family selector.</span>
    </div>
    <div class="protocol-block tone-c" style="flex: 1 1 0">
      <span class="field-offset">7</span>
      <span class="field-name">header_len</span>
      <span class="field-size">1B</span>
      <span class="field-tip">Currently fixed at 40 bytes.</span>
    </div>
  </div>
  <div class="protocol-row">
    <div class="protocol-block tone-d" style="flex: 4 1 0">
      <span class="field-offset">8-11</span>
      <span class="field-name">flags</span>
      <span class="field-size">4B</span>
      <span class="field-tip">Public flags shared across message families.</span>
    </div>
    <div class="protocol-block tone-e" style="flex: 4 1 0">
      <span class="field-offset">12-15</span>
      <span class="field-name">meta_len</span>
      <span class="field-size">4B</span>
      <span class="field-tip">Logical length of fixed metadata.</span>
    </div>
    <div class="protocol-block tone-e" style="flex: 4 1 0">
      <span class="field-offset">16-19</span>
      <span class="field-name">body_len</span>
      <span class="field-size">4B</span>
      <span class="field-tip">Logical length of the body region.</span>
    </div>
  </div>
  <div class="protocol-row">
    <div class="protocol-block tone-a" style="flex: 4 1 0">
      <span class="field-offset">20-23</span>
      <span class="field-name">session_id</span>
      <span class="field-size">4B</span>
      <span class="field-tip">Session anchor for default context and flow-control scope.</span>
    </div>
    <div class="protocol-block tone-b" style="flex: 4 1 0">
      <span class="field-offset">24-27</span>
      <span class="field-name">frame_id</span>
      <span class="field-size">4B</span>
      <span class="field-tip">Stable work-unit anchor carried forward from the historical frame-oriented model.</span>
    </div>
    <div class="protocol-block tone-c" style="flex: 2 1 0">
      <span class="field-offset">28-29</span>
      <span class="field-name">view_id</span>
      <span class="field-size">2B</span>
      <span class="field-tip">Logical lane identifier. Rendering-oriented profiles may map it to a camera or view.</span>
    </div>
    <div class="protocol-block tone-d" style="flex: 2 1 0">
      <span class="field-offset">30-31</span>
      <span class="field-name">route_id</span>
      <span class="field-size">2B</span>
      <span class="field-tip">Reserved for routing and scheduling expansion.</span>
    </div>
    <div class="protocol-block tone-e" style="flex: 8 1 0">
      <span class="field-offset">32-39</span>
      <span class="field-name">trace_id</span>
      <span class="field-size">8B</span>
      <span class="field-tip">64-bit trace identifier for cross-component observability.</span>
    </div>
  </div>
</div>

## Field Summary

| Field | Data Type | Offset | Size | Description | Value Range |
| --- | --- | --- | --- | --- | --- |
| magic | ASCII[4] | 0 | 4B | Protocol magic used for fast NNRP packet identification | Fixed to `NNRP` |
| version_major | u8 | 4 | 1B | Major protocol version that defines the top major-version boundary | `1-255`, current public line is `1` |
| wire_format | enum(u8) | 5 | 1B | Wire-level format selector for the current common-header and metadata/body encoding | Current public value is `0`, meaning the current NNRP/1 wire format |
| msg_type | enum(u8) | 6 | 1B | Top-level message type that selects the fixed metadata and body interpretation path | Examples include `CLIENT_HELLO`, `SESSION_OPEN`, `RESULT_PUSH`, and `FLOW_UPDATE` |
| header_len | u8 | 7 | 1B | Common-header length used to confirm whether the header shape changed | Currently fixed to `40` |
| flags | bitset(u32) | 8 | 4B | Shared flag bits for cross-message public state and reserved extensions | `0x00000000-0xffffffff` |
| meta_len | u32 | 12 | 4B | Logical length of the fixed metadata region after the common header | `0-4294967295` bytes |
| body_len | u32 | 16 | 4B | Logical length of the body region after fixed metadata | `0-4294967295` bytes |
| session_id | u32 | 20 | 4B | Session identifier that anchors default context, reusable state, and session-scope flow control | `0x00000000-0xffffffff` |
| frame_id | u32 | 24 | 4B | Work-unit or frame-level identifier used to correlate submissions and result streams | `0x00000000-0xffffffff` |
| view_id | u16 | 28 | 2B | Logical lane or view identifier for parallel observation surfaces or subchannels | `0x0000-0xffff` |
| route_id | u16 | 30 | 2B | Routing or scheduling extension field reserved for future policy and execution splits | `0x0000-0xffff` |
| trace_id | u64 | 32 | 8B | Cross-message, cross-component, and cross-runtime tracing identifier | `0x0000000000000000-0xffffffffffffffff` |

## Reading Path

1. Start with `magic / version_major / wire_format` to understand protocol identification, the major-version boundary, and the current wire identity.
2. Then read `msg_type / header_len / flags / meta_len / body_len` to understand how the header controls downstream parsing.
3. Finish with `session_id / frame_id / view_id / route_id / trace_id` to understand context, scheduling, and observability anchors.

## magic

| Field | Data Type | Offset | Size | Description | Value Range |
| --- | --- | --- | --- | --- | --- |
| magic | ASCII[4] | 0 | 4B | Protocol magic used for fast NNRP packet identification | Fixed to `NNRP` |

Receivers should validate `magic` first. If it does not match, the packet should not continue through the NNRP parser.

## version_major

| Field | Data Type | Offset | Size | Description | Value Range |
| --- | --- | --- | --- | --- | --- |
| version_major | u8 | 4 | 1B | Major protocol version that defines the top major-version boundary | `1-255`, current public line is `1` |

`version_major` answers whether the peer can continue under the same public compatibility contract. It is not meant to be a business-level feature flag.

## wire_format

| Field | Data Type | Offset | Size | Description | Value Range |
| --- | --- | --- | --- | --- | --- |
| wire_format | enum(u8) | 5 | 1B | Wire-level format selector for the current common-header and metadata/body encoding | Current public value is `0`, meaning the current NNRP/1 wire format |

This field expresses which wire-level encoding the current packet uses. It is not a preview/stable stage marker and does not replace capability negotiation. In the current public implementation, the value is fixed to `0`.

## msg_type

| Field | Data Type | Offset | Size | Description | Value Range |
| --- | --- | --- | --- | --- | --- |
| msg_type | enum(u8) | 6 | 1B | Top-level message type that selects the fixed metadata and body interpretation path | Examples include `CLIENT_HELLO`, `SESSION_OPEN`, `RESULT_PUSH`, and `FLOW_UPDATE` |

If `magic` answers whether the packet is NNRP, `msg_type` answers how the rest of the packet should be interpreted.

## header_len

| Field | Data Type | Offset | Size | Description | Value Range |
| --- | --- | --- | --- | --- | --- |
| header_len | u8 | 7 | 1B | Common-header length used to confirm whether the header shape changed | Currently fixed to `40` |

The public docs currently freeze the common header at `40B`. If the public header shape ever expands, this field is the first guard rail a receiver sees.

## flags

| Field | Data Type | Offset | Size | Description | Value Range |
| --- | --- | --- | --- | --- | --- |
| flags | bitset(u32) | 8 | 4B | Shared flag bits for cross-message public state and reserved extensions | `0x00000000-0xffffffff` |

`flags` works well for cross-cutting booleans that many message families need to check quickly. It is the wrong place for profile-private semantics.

## meta_len

| Field | Data Type | Offset | Size | Description | Value Range |
| --- | --- | --- | --- | --- | --- |
| meta_len | u32 | 12 | 4B | Logical length of the fixed metadata region after the common header | `0-4294967295` bytes |

`meta_len` is transport-neutral. It tells the receiver exactly how many bytes belong to fixed metadata before the body region begins.

## body_len

| Field | Data Type | Offset | Size | Description | Value Range |
| --- | --- | --- | --- | --- | --- |
| body_len | u32 | 16 | 4B | Logical length of the body region after fixed metadata | `0-4294967295` bytes |

`body_len` lets the same application-level framing model work across QUIC, TCP+TLS, and other reliable byte-stream bindings.

## session_id

| Field | Data Type | Offset | Size | Description | Value Range |
| --- | --- | --- | --- | --- | --- |
| session_id | u32 | 20 | 4B | Session identifier that anchors default context, reusable state, and session-scope flow control | `0x00000000-0xffffffff` |

Different `msg_type` families may place different requirements on `session_id`, but its long-term role is stable: it is the default-context anchor.

## frame_id

| Field | Data Type | Offset | Size | Description | Value Range |
| --- | --- | --- | --- | --- | --- |
| frame_id | u32 | 24 | 4B | Work-unit or frame-level identifier used to correlate submissions and result streams | `0x00000000-0xffffffff` |

The name is historical. The field survives because it is a stable work-unit anchor, not because the protocol is limited to rendering frames.

## view_id

| Field | Data Type | Offset | Size | Description | Value Range |
| --- | --- | --- | --- | --- | --- |
| view_id | u16 | 28 | 2B | Logical lane or view identifier for parallel observation surfaces or subchannels | `0x0000-0xffff` |

In rendering-oriented profiles it can map to a camera or view. In non-rendering profiles it can remain a pure logical lane, or simply stay `0` when no sub-view split exists.

## route_id

| Field | Data Type | Offset | Size | Description | Value Range |
| --- | --- | --- | --- | --- | --- |
| route_id | u16 | 30 | 2B | Routing or scheduling extension field reserved for future policy and execution splits | `0x0000-0xffff` |

Even if a current implementation does not expose advanced routing yet, `route_id` should still be treated as protocol-reserved space rather than application-private reuse.

## trace_id

| Field | Data Type | Offset | Size | Description | Value Range |
| --- | --- | --- | --- | --- | --- |
| trace_id | u64 | 32 | 8B | Cross-message, cross-component, and cross-runtime tracing identifier | `0x0000000000000000-0xffffffffffffffff` |

`trace_id` is about observability, not business meaning. It allows the host, gateway, runtime, and cache layers to stitch the same interaction into one trace line.

<div class="page-note">
  This layer explains the long-lived common-header skeleton. It is not a substitute for the exact fixed metadata, descriptor, or flow-control layouts frozen by a specific preview page.
</div>