# Python Frozen API

The Python SDK should freeze one explicit control-plane surface for Preview3 integration.

## Core surface

1. A client construction path that resolves endpoint, transport policy, and credentials.
2. Session lifecycle methods covering open, patch, close, and migrate.
3. Operation submission and receive-loop entry points.
4. Cache and schema lifecycle methods.
5. A stable error hierarchy and cancellation surface.

## Python-specific expectations

1. Async-first methods should be the primary contract.
2. Sync helpers may exist, but they are convenience wrappers over the same control-plane semantics.
3. Public method names, parameter groups, and returned state objects should not drift without a formal SDK version change.