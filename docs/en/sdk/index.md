# SDK Overview

The SDK view is separate from protocol design on purpose.

1. Protocol pages define the wire contract, packet shapes, descriptors, state machines, and version
   boundaries.
2. SDK pages define the frozen control-plane surface that applications call in Python, C#, Rust, and
   JavaScript/TypeScript.
3. Language-specific deployment and packaging guidance stays here instead of leaking back into
   protocol pages.

## Frozen scope

The Preview4 entry points expose one shared control-plane and host-route contract across the four
current language SDKs.

1. Carrier-neutral application endpoints, per-carrier route sets, and deterministic selection.
2. Atomic server listener sets and accepted-session active transport identity.
3. Connection bootstrap and capability negotiation.
4. Session open, patch, close, and migration.
5. Operation submit, cancel, and receive loops.
6. Flow-control updates and backpressure handling.
7. Runtime objects, cache references, schema operations, and lifecycle guarantees.

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
    <strong>JavaScript/TypeScript</strong>
    <p>Deno-authored, Node-compatible backend, and browser WASM SDK API surface.</p>
  </a>
</div>
