# Rust Frozen API

The Rust SDK should freeze a crate-level control-plane surface that maps cleanly to the shared SDK contract.

## Core surface

1. Client builder or configuration entry.
2. Session lifecycle operations.
3. Operation submission, stream receive, and cancellation.
4. Cache and schema lifecycle operations.
5. Stable error enums and shutdown semantics.

## Rust-specific expectations

1. Ownership and borrowing rules must be reflected clearly in public types.
2. Async stream or channel-based receive flow should stay explicit.
3. Public crates, feature flags, and result types should remain stable during the Preview3 integration window.