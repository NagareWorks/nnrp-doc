# Standard Profiles

Profile is one of the core abstractions in NNRP. Its purpose is to keep the public layer stable
while moving domain-specific interpretation into profile and schema combinations.

The public layer is responsible for:

1. Message skeletons.
2. Length models.
3. Shared semantics such as sessions, operations, and flow control.

Profiles are responsible for:

1. Identifying the semantic family of a payload.
2. Working with schemas to define the actual interpretation.
3. Preventing one business scenario from bloating the public layer.

## Current public standard directions

`tensor`, `token`, and the preview4 runtime control profiles are the current standard profile
directions.

<div class="doc-grid">
  <div class="doc-card">
    <h3>Tensor Profile</h3>
    <p>For numeric blocks, region-oriented payloads, real-time enhanced rendering, and parts of media processing.</p>
  </div>
  <div class="doc-card">
    <h3>Token Profile</h3>
    <p>For discrete tokens, streaming text, AI NPC dialogue, agent collaboration, and tool-result streams.</p>
  </div>
  <div class="doc-card">
    <h3>Runtime Control Profiles</h3>
    <p>For cancellation, deadlines, partial results, backpressure, runtime objects, cache references, route hints, and trace context.</p>
  </div>
</div>

## Reading path

1. Start with [Tensor Profile Overview](/en/profiles/tensor/), then read its
   `Descriptor Common Header / Schema and Body / Payload Frame` child pages.
2. Continue with [Token Profile Overview](/en/profiles/token/) in the same order.
3. Read [Runtime Control Profiles](/en/profiles/runtime-control) before implementing preview4
   control, runtime object, cache reference, or wire conformance behavior.
4. For cross-profile descriptor fields, read
   [Typed Payload Descriptor](/en/typed-payload-descriptor/) first.
5. When you need to decide whether a field belongs to the public layer, cross-check
   [Common Header](/en/common-header/) or the version-frozen preview pages.
