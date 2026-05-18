# Conformance Overview

This section is separate from both protocol pages and SDK pages. It explains how the shared NNRP conformance suite is consumed by implementation repositories.

Three boundaries must stay separate:

1. Protocol design pages define the conformance design boundary, versioning strategy, layering, and ownership.
2. This section defines how conformance baselines are organized, how capabilities are declared, and how the suite is run locally and in CI.
3. Individual SDK or runtime pages should reference this section rather than redefining public conformance rules on their own.

## Intended audience

This section is mainly for:

1. Implementers of `nnrp-rs`, `nnrp-py`, `nnrp-cs`, and the runtime.
2. Repository maintainers who need to wire the shared baseline into CI.
3. Future third-party NNRP implementers.

## Recommended reading order

1. Start from [Quick Start](./quick-start) for the minimum repository and baseline bring-up path.
2. Continue with [Manifests and Report Contract](./manifests) for the public JSON boundaries.
3. Finish with [CI and Version Selection](./ci) for capability-gated development and explicit protocol-line selection in CI.

## Relationship with the design document

If you have not read the conformance design boundary yet, go back to [NNRP Protocol Conformance Suite Design](/en/design/conformance-suite).

This section does not restate why conformance exists or redefine protocol-side design boundaries. It answers a different set of questions:

1. How baseline files are organized.
2. What the public fields of case manifests, capability manifests, and reports mean.
3. How implementation repositories wire them into local development and CI.