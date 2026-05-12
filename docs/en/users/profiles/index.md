# Standard Profiles

Profile is one of the core abstractions in NNRP. Its purpose is to keep the public layer stable while moving domain-specific interpretation into profile and schema combinations.

The public layer is responsible for:

1. Message skeletons.
2. Length models.
3. Shared semantics such as sessions, operations, and flow control.

Profiles are responsible for:

1. Identifying the semantic family of a payload.
2. Working with schemas to define the actual interpretation.
3. Preventing one business scenario from bloating the public layer.

## Current public standard directions

`tensor` and `token` are the clearest current standard profile directions.

<div class="doc-grid">
  <div class="doc-card">
    <h3>Tensor Profile</h3>
    <p>For numeric blocks, region-oriented payloads, real-time enhanced rendering, and parts of media processing.</p>
  </div>
  <div class="doc-card">
    <h3>Token Profile</h3>
    <p>For discrete tokens, streaming text, AI NPC dialogue, agent collaboration, and tool-result streams.</p>
  </div>
</div>