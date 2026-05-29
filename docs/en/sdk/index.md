# SDK Overview

The SDK view is separate from protocol design on purpose.

1. Protocol pages define the wire contract, packet shapes, descriptors, state machines, and version
   boundaries.
2. SDK pages define the frozen control-plane surface that applications call in Python, C#, Rust, and
   JS/TS.
3. Language-specific deployment and packaging guidance stays here instead of leaking back into
   protocol pages.

## Frozen scope

The Preview3 entry point should expose one shared control-plane contract across language SDKs.

1. Connection bootstrap and capability negotiation.
2. Session open, patch, close, and migration.
3. Operation submit, cancel, and receive loops.
4. Flow-control updates and backpressure handling.
5. Cache and schema install or invalidate operations.
6. Stable error model and lifecycle guarantees.

## Language entry

<div class="sdk-link-grid">
  <a class="sdk-link-card" href="/nnrp-doc/en/sdk/python/">
    <strong>Python</strong>
    <p>Frozen Python API surface and deployment path.</p>
  </a>
  <a class="sdk-link-card" href="/nnrp-doc/en/sdk/csharp/">
    <strong>C#</strong>
    <p>Frozen C# API surface and deployment path.</p>
  </a>
  <a class="sdk-link-card" href="/nnrp-doc/en/sdk/rust/">
    <strong>Rust</strong>
    <p>Frozen Rust API surface and deployment path.</p>
  </a>
  <a class="sdk-link-card" href="/nnrp-doc/en/sdk/javascript/">
    <strong>JS/TS</strong>
    <p>Deno-first, Node-compatible, and browser WASM SDK API surface.</p>
  </a>
</div>
