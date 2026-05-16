# C# Frozen API

The C# SDK should freeze one application-facing control-plane surface.

## Core surface

1. Client construction and capability negotiation.
2. Session lifecycle methods for open, patch, close, and migrate.
3. Operation submission, receive, and cancel entry points.
4. Cache and schema lifecycle methods.
5. Stable exception categories and cancellation behavior.

## C#-specific expectations

1. Async methods should be first-class and Task-based.
2. Disposable lifetimes and shutdown behavior must be explicit.
3. Public namespaces, interfaces, and result objects should remain stable across the Preview3 integration window.