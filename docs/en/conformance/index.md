# NNRP Conformance Suite

The NNRP Conformance Suite is a shared, language-neutral protocol interoperability baseline that is independent of any single SDK. It gives implementations in different languages and from different organizations a common, versioned standard to prove that they speak the same protocol.

## What it is

As the number of NNRP implementations — official and third-party — continues to grow, a natural question arises: **how do you know these implementations are actually speaking the same protocol, rather than each one just passing its own tests?**

The conformance suite answers exactly that question. It consists of:

1. **Versioned baselines**: each protocol line (for example `nnrp-1-preview3`) has its own baseline directory containing a protocol manifest, case manifests, and golden vectors.
2. **Case manifests**: machine-readable JSON files that describe each test case's protocol layer (L0–L4), its status (mandatory / optional / experimental), and the capability declarations required to run it.
3. **Capability manifests**: each implementation repository provides a JSON declaration listing the protocol capabilities it has completed and is willing to publicly claim support for.
4. **Runner**: a Rust CLI that loads a baseline and an implementation's capability manifest, then produces an execution plan and a compliance report.

## Why it exists

Without a shared conformance baseline, three failure modes naturally emerge in any multi-implementation phase:

1. **Every CI is green, but nobody owns interoperability.** Each repository only runs its own unit tests. Everything looks passing, but nothing proves that two implementations can complete a handshake, negotiate capabilities, and run a full frame-submit and result-push cycle together.
2. **Protocol interpretation slowly drifts.** Without external constraints, each implementation develops its own understanding of protocol edge cases. By the time real interoperability is needed, the gap is hard to close.
3. **"Tests pass" loses its meaning.** If tests only validate internal self-consistency rather than alignment with a protocol standard, green CI is a false sense of security.

The conformance suite removes all three failure modes by providing an external, versioned, machine-executable protocol standard that each implementation can validate itself against independently.

## What you can do with it

### During development: run only completed capabilities

You do not need to wait until every capability is done before adopting conformance. The capability manifest lets you declare what you currently support, and the runner only executes cases for those capabilities. Cases for unclaimed capabilities are marked `not_claimed`, not as failures.

This means you can wire in conformance at any point during Preview3 development and get a meaningful report rather than a wall of noise from features you have not started yet.

### In CI: explicitly bind a protocol version

CI does not guess which protocol version your implementation targets. You pass an explicit baseline (for example `protocol/nnrp-1-preview3/manifest.json`) and the runner validates three things:

1. Protocol manifest version = case manifest version = capability manifest version.
2. Only capabilities the implementation claims are promoted into the mandatory or optional execution set.
3. A version mismatch causes an immediate failure — ambiguous "close enough to this version" states are never allowed to enter the merge flow.

### For third-party implementations: a verifiable interoperability claim

If you are building a third-party NNRP implementation, the conformance suite gives you a concrete way to say "this implementation passes the nnrp-1-preview3 mandatory core and supports the following capabilities" rather than just "I implemented NNRP".

## Where to go next

<div class="doc-grid">
  <div class="doc-card">
    <h3><a href="./quick-start">Quick Start</a></h3>
    <p>Minimum bring-up path. Get a first execution-plan report in five minutes.</p>
  </div>
  <div class="doc-card">
    <h3><a href="./capability-manifest-generator">Capability Manifest Generator</a></h3>
    <p>Choose a protocol line, tick capabilities, and generate JSON immediately instead of hand-writing the manifest.</p>
  </div>
  <div class="doc-card">
    <h3><a href="./capabilities/">Capability Catalog</a></h3>
    <p>Browse versioned capability tokens, combination rules, and the conformance obligations attached to each claim.</p>
  </div>
  <div class="doc-card">
    <h3><a href="./manifests">Manifests Reference</a></h3>
    <p>For suite authors. Complete JSON field reference for protocol manifests, case manifests, vector recipes, and reports.</p>
  </div>
  <div class="doc-card">
    <h3><a href="./sdk-integration">SDK Integration Guide</a></h3>
    <p>For SDK developers. How to create a capability manifest, run the CLI, write the vector test, and wire CI end-to-end.</p>
  </div>
  <div class="doc-card">
    <h3><a href="./ci">CI and Version Selection</a></h3>
    <p>How conformance version binding works and what errors to avoid in CI.</p>
  </div>
</div>