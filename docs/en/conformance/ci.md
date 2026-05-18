# CI And Version Selection

This page defines how conformance should run during development and in CI.

## 1. How development only matches completed capabilities

During development, the rule should not be to run every case unconditionally, and it should not be to run a vague handpicked subset either.

The correct model is:

1. The implementation repository provides a capability manifest explicitly.
2. The runner selects cases by reading `required_capabilities` from the case manifest.
3. `mandatory` and `optional` cases become `selected` only when the required capabilities have been claimed.
4. Unclaimed capabilities become `not_claimed` rather than being disguised as passed.
5. `experimental` and `deprecated` cases default to informational output instead of acting as the hard gate.

This gives two benefits:

1. Teams can freeze a smaller capability set first and expand it incrementally.
2. CI reports can distinguish clearly between "not implemented yet" and "implemented but failing".

## 2. How CI knows which protocol version line it is targeting

CI must not infer the protocol version from the repository state.

CI must explicitly select one protocol manifest, for example:

1. `protocol/nnrp-1-preview3/manifest.json`
2. a future Preview4 or final-line protocol manifest

Then the runner should verify at least these three things:

1. the `protocol_version` in the protocol manifest
2. the `protocol_version` in the case manifest
3. the `protocol_version` in the capability manifest

If any of them disagree, CI should fail immediately instead of guessing which one is supposed to be correct.

## 3. Recommended CI execution chain

The minimum recommended chain is:

1. select the protocol manifest
2. select the case manifest set to consume
3. load the implementation repository's capability manifest
4. generate an execution plan or report
5. hard-gate the selected mandatory cases
6. output classified results for `not_claimed` and `informational` cases

## 4. Errors to avoid

None of the following should enter the formal workflow:

1. letting CI default to "the latest baseline"
2. weakening a local adapter in order to bypass public mandatory cases
3. replacing the shared conformance baseline with a private local pseudo-suite
4. treating unfinished capabilities as passed when no capability declaration exists

## 5. Current conclusion

The development goal is not that every case is already complete. The development goal is that the repository explicitly knows which capabilities it claims and accepts hard gates only for those capabilities.

The CI goal is also not to guess which protocol line you probably meant. The CI goal is to bind one explicit version line and verify that all input contracts align with it.