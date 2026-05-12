# NNRP/1-preview3 Design Summary

This page is the English counterpart of the archived `v1-preview3` design document.

preview3 freezes the current canonical direction:

1. A profile-neutral public layer with `tensor` and `token` as peer standard profiles.
2. A multi-session connection model with explicit `SESSION_OPEN / SESSION_OPEN_ACK`.
3. Stable common layouts for schema descriptors, typed payload descriptors, and `FLOW_UPDATE` metadata.
4. A Rust canonical SDK baseline for cross-language behavior.

```mermaid
flowchart LR
	CONN[One Connection Container] --> S1[Session A]
	CONN --> S2[Session B]
	CONN --> S3[Session N]
	CONN --> REG[Schema / Profile Registry]
	CONN --> CACHE[Cache + Lease Model]
	CONN --> FLOW[FLOW_UPDATE + Priority]
	RUST[Rust Canonical Core] --> CONN
	PY[Python Binding] --> RUST
	CS[C# Binding] --> RUST
	FUTURE[JS / Java / Go Bindings] --> RUST
```

Use the full Chinese design document when you need every frozen byte layout and every detailed rationale; use this page when you need the English entry point and the main freeze themes.