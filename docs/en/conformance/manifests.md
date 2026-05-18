# Manifests And Report Contract

This page defines the public JSON contract boundary for the conformance section.

## 1. Protocol Manifest

The protocol manifest is the entry point of one versioned baseline.

At minimum it should contain:

1. `protocol_version`, for example `nnrp-1-preview3`
2. `suite_version`, the version of the conformance baseline itself
3. `status`, for example `draft`, `frozen`, or `deprecated`
4. `case_manifests`, the case manifest list attached to the baseline
5. `vector_manifests`, the golden-vector or other vector entry list attached to the baseline
6. `report_schema`, the report schema used by this baseline

It answers two basic questions:

1. Which protocol version line is selected right now?
2. Which public artifacts make up that baseline?

## 2. Case Manifest

The case manifest defines a group of conformance cases.

Each case should carry at least these fields:

1. `id`, a stable case identifier
2. `layer`, for example `L0` to `L4`
3. `status`, one of `mandatory`, `optional`, `experimental`, or `deprecated`
4. `feature`, the public capability label represented by the case
5. `required_capabilities`, the capabilities an implementation must claim before the case becomes runnable
6. `description`, the public semantic description of the case

The important point is not the number of fields. The important point is that every case must have an explicit version, layer, and capability boundary.

## 3. Capability Manifest

The capability manifest is supplied by an implementation repository. It declares what the repository has already completed and is willing to claim publicly.

At minimum it should contain:

1. `implementation_name`
2. `protocol_version`
3. `supports`

Each entry under `supports` represents one capability the implementation explicitly claims.

This file exists so that:

1. Development-time gates apply only to claimed capabilities.
2. Unclaimed capabilities are not misreported as passed.
3. CI can distinguish `selected`, `not_claimed`, and `informational` cases clearly.

## 4. Report

The report is the machine-readable output of one conformance execution.

At minimum it should contain:

1. `protocol_version`
2. `implementation_name`
3. `summary`
4. `cases`

At minimum `summary` should count:

1. `selected_cases`
2. `not_claimed_cases`
3. `informational_cases`

And each item under `cases` should at least record:

1. the case `id`
2. the selection result such as `selected`, `not_claimed`, or `informational`

## 5. What Must Not Be Frozen

The public JSON contract should freeze field semantics, not the internal type layout of one Rust, Python, or C# implementation.

Therefore:

1. What is frozen publicly is the JSON boundary of manifests and reports.
2. Internal Rust types in `nnrp-conformance` may evolve.
3. Internal object trees inside language adapters may also evolve as long as they do not change the public JSON semantics.