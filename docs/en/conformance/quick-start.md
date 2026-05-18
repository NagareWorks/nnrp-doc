# Conformance Quick Start

This page gives the shortest integration path for the shared conformance baseline.

## Goal

The minimum integration should answer three questions:

1. Which protocol version line is the current repository targeting?
2. Which capabilities does the current repository explicitly claim to support already?
3. Which cases actually ran locally or in CI, instead of vaguely saying that "a test suite ran"?

## Basic pieces

The shared baseline currently consists of:

1. A versioned protocol manifest such as `protocol/nnrp-1-preview3/manifest.json`.
2. One or more case manifests such as `cases/mandatory-core.json`.
3. A capability manifest that declares which capabilities an implementation currently claims publicly.
4. A machine-readable report that records which cases were selected for execution.

## Shortest usage path

1. Select the target protocol line explicitly in the implementation repository, for example `nnrp-1-preview3`.
2. Prepare a capability manifest that declares the capabilities the implementation has already completed.
3. Use the shared runner to load the matching protocol manifest, case manifests, and capability manifest.
4. Emit a machine-readable report and let CI decide pass/fail from that report.

## Hard rules for the development phase

1. CI must not guess the target protocol line from branch names, default-branch state, or whatever happens to be latest.
2. Capabilities that have not been claimed must not be disguised as passed coverage.
3. An implementation repository must not replace the shared conformance baseline with a private pseudo-conformance suite.

## Relationship with local regression tests

Conformance does not replace a repository's own unit tests.

More precisely:

1. Local unit tests validate repository-internal implementation details and regressions.
2. Shared conformance validates whether the implementation actually conforms to one public protocol version line.
3. Both layers must exist, and neither may pretend to be the other.