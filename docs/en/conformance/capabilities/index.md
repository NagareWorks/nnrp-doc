# Capability Catalog

<div class="page-note">
This directory records the public capability tokens exposed by each conformance baseline. It answers a different question from the case list: not “which cases exist”, but “which capability claims may appear in `supports`, and what CI obligations follow from each claim”.
</div>

## Three boundaries to keep clear

1. A capability token is the unit an implementation repository claims publicly. It is not a runner-internal detail and not an SDK-private test tag.
2. A case `feature` and a capability token are not a one-to-one mapping. One case may require multiple tokens, and one token may affect multiple cases.
3. Cases with no token can still be mandatory. They typically represent the shared protocol floor every implementation must satisfy.

## How to use this catalog

1. Pick the target protocol line first.
2. Copy tokens only from that version page into the capability manifest's `supports` list.
3. When a case requires multiple tokens, it becomes `selected` only after all of them have been claimed.
4. Even if two versions reuse the same token name, do not assume the semantics are identical; the version page is the source of truth.

## Published version pages

<div class="version-switch">
  <a href="./nnrp-1-preview2">
    <strong>nnrp-1-preview2</strong>
    <span>Covers the preview2 wire vectors, control plane, data plane, and transport smoke capabilities.</span>
  </a>
  <a href="./nnrp-1-preview3">
    <strong>nnrp-1-preview3</strong>
    <span>Covers the current Preview3 mandatory core plus the evolving optional and experimental capabilities.</span>
  </a>
</div>

## What to pay attention to when reading the tables

| Term | Meaning |
|---|---|
| Always-on case | A case whose `required_capabilities` is `[]`. It enters the execution set for every implementation. |
| Combination rule | A case that needs multiple tokens at the same time; missing one keeps it out of `selected`. |
| Status reach | Which `mandatory`, `optional`, or `experimental` cases are typically affected once the token is claimed. |

If you are wiring conformance into an SDK repository, read the [SDK Integration Guide](../sdk-integration) first and come back here for the exact token list.