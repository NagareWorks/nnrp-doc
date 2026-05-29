# Capability Manifest Generator

<div class="page-note">
This page provides a purely client-side low-code generator for capability manifest scaffolding. It is meant to remove the friction of hand-writing JSON, not to decide which tokens you are allowed to claim publicly.
</div>

The flow is simple: choose a protocol line, enter your implementation name, tick the capabilities you have actually completed, and copy the generated JSON from the live preview below. After that, you should still review the [Capability Catalog](./capabilities/) for token semantics and combination rules.

The generator catalog is built from the conformance repository's versioned protocol and case manifests. It emits only the SDK-owned capability manifest shape: `implementation_name`, `protocol_version`, and `supports`. It does not generate adapter plans, benchmark plans, or case definitions.

<CapabilityManifestGenerator />
