# NNRP Protocol Conformance Suite Design

## 1. Positioning

This document defines the public design boundary of the NNRP protocol conformance suite.

Its role is not to replace the protocol design documents, nor to replace the unit tests owned by individual SDK repositories. Its role is to provide a shared, cross-implementation, cross-language, cross-version conformance baseline so that any NNRP implementation can answer the same question:

"Does this implementation actually conform to the target protocol version, rather than merely remaining self-consistent inside its own repository?"

The formal role of the conformance suite in the NNRP protocol stack is therefore:

1. The first executable baseline after the protocol document.
2. A shared validation entry point for multi-language SDKs, runtimes, servers, and third-party implementations.
3. One of the common sources of truth for version freeze, preview migration, and historical regression.

## 2. Why It Must Be Specified on the Protocol Side

The conformance suite must be specified clearly in `nnrp-doc`, rather than being left inside a single SDK repository, for the following reasons:

1. Conformance validates public protocol semantics, not the API habits of one host language.
2. Future implementers may not maintain `nnrp-cs`, `nnrp-py`, or `nnrp-rs`, but they still need a protocol-level validation entry point they can rely on.
3. If conformance is defined only inside implementation repositories, it easily degrades into a model where an implementation effectively owns the protocol interpretation and thereby pollutes the protocol boundary.
4. This is especially dangerous in preview stages, where different implementations may each form an internally consistent but mutually incompatible interpretation while all claiming a green CI state.

The protocol document freezes semantics. The conformance suite turns frozen semantics into executable assertions. They must share the same source of truth, but they must not collapse into the same artifact.

## 3. Boundary with the Protocol Document and Implementation Repositories

### 3.1 What `nnrp-doc` Owns

`nnrp-doc` owns:

1. The protocol objects, fixed layouts, state machines, error codes, version boundaries, and conformance rules.
2. The public goals, versioning strategy, layering model, and pass criteria of the conformance suite.
3. The record of which semantics are frozen already and which semantics remain under design and therefore cannot yet enter the mandatory conformance set.

### 3.2 What `nnrp-rs` Owns

`nnrp-rs` owns:

1. The canonical `nnrp-conformance` artifacts and the first reference implementation.
2. The export of golden vectors, fixture manifests, state-machine scenarios, error-path baselines, and machine-readable report formats.
3. Acting as the first implementation that consumes the protocol document, while still not inventing protocol semantics before they are frozen in `nnrp-doc`.

### 3.3 What SDK and Runtime Repositories Own

SDK, runtime, and third-party implementation repositories own:

1. Consuming canonical conformance artifacts and running them in CI.
2. Providing a language-specific adapter or driver so that the same protocol cases can be executed.
3. Adding repository-local regression tests where useful, but not replacing public conformance with private local tests.

## 4. Design Goals

At minimum, the conformance suite should satisfy the following goals:

1. The same protocol version should run the same core assertions across different language implementations.
2. Preview versions and formally frozen versions should coexist, instead of only keeping a single moving "latest" suite.
3. The suite should distinguish protocol failure, binding failure, runtime integration failure, and performance regression rather than collapsing everything into one red light.
4. Future third-party implementations should be able to reuse the public test description and artifacts without depending on the internal layout of the current repositories.
5. The design should prioritize protocol stability first and test convenience second.

## 5. Non-Goals

The conformance suite does not directly own the following responsibilities:

1. It does not replace SDK-specific API experience tests, IDE integration tests, or host-framework adaptation tests.
2. It does not replace benchmarks, capacity tests, long-duration soak tests, model-quality evaluation, or visual-quality comparisons.
3. It does not freeze implementation-specific thread models, callback styles, package shapes, or host object trees.
4. It does not turn not-yet-frozen design ideas into mandatory test requirements.

## 6. Versioning Strategy

The conformance suite must be organized by protocol version line rather than as one unversioned pile of tests.

Minimum requirements:

1. Each protocol line should distinguish at least `NNRP/1-preview1`, `NNRP/1-preview2`, `NNRP/1-preview3`, and later formally frozen versions.
2. Preview suites must be retained, because previews overwrite the current semantics within one major line, while historical implementations and migration validation still need the historical baseline.
3. Once a new preview is frozen, the old preview's conformance result set must not be silently rewritten; a new version directory or version tag must be added instead.
4. If a semantic rule is not yet frozen in the design document, it may only enter an experimental or draft case set and must not enter the mandatory set.

Suggested version directory shape:

1. `protocol/nnrp-1-preview1/...`
2. `protocol/nnrp-1-preview2/...`
3. `protocol/nnrp-1-preview3/...`
4. `protocol/nnrp-1-final/...`

## 7. Test Layers

The conformance suite should be organized into at least five layers:

### 7.1 L0 Byte-Level and Fixed-Layout Layer

This layer validates:

1. Common headers, length model, fixed metadata, enum values, and numeric error codes.
2. Parse / re-emit / roundtrip behavior of canonical golden vectors.
3. Hard error paths such as invalid lengths, out-of-range fields, reserved bits, and unknown mandatory markers.

### 7.2 L1 Protocol State-Machine Layer

This layer validates:

1. Handshake and capability negotiation.
2. Session open / patch / close.
3. Operation lifecycle, priority, and cancel scope.
4. `FLOW_UPDATE`, `RESULT_HINT`, recovery, resume windows, and other control semantics that must match across implementations.

### 7.3 L2 Binding and Driver-Consistency Layer

This layer validates:

1. FFI handle lifetime.
2. Whether callback and polling drive modes preserve protocol semantics.
3. Whether buffer ownership, error mapping, and event-pump behavior remain aligned with the protocol-level vocabulary.

Different languages may adapt this layer differently, but they must not change the public protocol semantics.

### 7.4 L3 Integration Smoke Layer

This layer validates:

1. Multiple sessions on one connection.
2. Actual transport bindings.
3. The minimal interoperable path among runtime, SDK, and server implementations.

This layer still belongs to the extended conformance surface, but it must not replace the normative assertions of L0-L2.

### 7.5 L4 Performance and Stability Regression Layer

This layer validates:

1. Whether obvious copy regressions, tail-latency regressions, or flow-control degradation have appeared.
2. Whether the protocol implementation has fallen back in a way that harms stability.

This layer may be used as a release gate, but it must not be confused with the mandatory protocol-conformance pass condition.

## 8. Case Status Classes

Every conformance case should carry at least one of the following status classes:

1. `mandatory`: the protocol rule is frozen, and every implementation claiming this version must pass it.
2. `optional`: the protocol allows an implementation not to support the feature, but if support is claimed, the case must pass.
3. `experimental`: the design is not yet fully frozen and the case exists only for parallel validation, not for the formal compatibility matrix.
4. `deprecated`: the old version still has regression value, but is no longer a current-line capability requirement.

## 9. Public Artifacts

The protocol side must define the kinds of public artifacts that implementations will integrate against:

1. Golden vectors: canonical byte-level samples.
2. Fixture manifests: machine-readable case inventories, inputs, expected outputs, and version tags.
3. State-machine scenarios: step-driven handshake, session, operation, recovery, and flow-control scripts.
4. Machine-readable reports: pass/fail outputs for CI consumption.
5. Binding-consumption contract: instructions for how SDKs and third-party implementations integrate with the runner, rather than depending directly on one internal test API.

An important distinction must remain explicit:

1. The public protocol contract consists of fixtures, manifests, case semantics, and report formats.
2. The internal Rust API of `nnrp-conformance` may evolve and does not need to be frozen as a cross-language public API.

## 10. Recommended Execution Model

The recommended execution model is "one canonical suite, many language adapters":

1. `nnrp-rs` generates or hosts the canonical conformance artifacts.
2. Each implementation repository provides a language-specific test driver or adapter.
3. CI selects the target protocol version, runs the corresponding case set, and emits results in one common format.

In other words, it is not recommended for every SDK to hand-write a separate set of "roughly similar" protocol tests. That only creates multiple drifting pseudo-baselines.

## 11. Change Rules

The following changes must update `nnrp-doc` first, then the conformance artifacts, and only then the implementation repositories:

1. Changes to wire shape, fixed metadata, error-code semantics, or descriptor layouts.
2. Changes to the public state-machine semantics of session, operation, recovery, or flow control.
3. Additions, removals, or stricter assertions in the mandatory case set.

The following changes should not directly modify protocol-side conformance rules:

1. Renaming a host-facing API in one SDK.
2. Changing a runtime's thread pool, queueing design, or framework integration.
3. Package formats, release scripts, or platform-specific assembly details.

## 12. Explicit Constraints on Future Implementers

Any implementer, whether or not they belong to the current official repositories, should satisfy at least the following requirements if they claim support for an NNRP protocol version:

1. Treat the semantics frozen in `nnrp-doc` as authoritative, rather than the current behavior of a specific SDK.
2. Use the conformance case set of the corresponding version rather than relying only on local unit tests.
3. Do not bypass public mandatory assertions by weakening a local adapter.
4. If the protocol document and the conformance cases disagree, repair the document and baseline first rather than inventing an implementation-local interpretation.

## 13. Current Conclusion

Given NNRP's current multi-language state, the protocol conformance suite should be treated as part of protocol design rather than as an auxiliary tool of one implementation repository.

The protocol side should make the following explicit:

1. Conformance is a public protocol asset.
2. `nnrp-rs` is the first canonical source of the baseline artifacts.
3. `nnrp-cs`, `nnrp-py`, the runtime, and future third-party implementations should all prove conformance by consuming the same versioned baseline.