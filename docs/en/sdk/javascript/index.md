# JavaScript/TypeScript SDK Overview

`nnrp-js` is the JavaScript/TypeScript SDK workspace for NNRP. The repository is Deno-authored for
formatting, linting, testing, type checking, and builds. Published packages remain Node-compatible
ESM with `.d.ts` declarations.

This SDK does not own protocol-critical codecs or state machines. Runtime semantics come from
`nnrp-rs` native FFI artifacts on backend hosts and WASM artifacts in browser or edge hosts. The
TypeScript layer freezes package boundaries, host-facing objects, data ownership rules, and
conformance entrypoints.

## Package Map

| Package | Runtime target | Public role | Status |
|---|---|---|---|
| `@nnrp/core` | Any JS runtime | Shared types, capability manifests, diagnostics, payload ownership, and transport selection helpers | Contract frozen here; repository skeleton exists |
| `@nnrp/native` | Node.js and Deno backend hosts | Native artifact discovery, backend client/server runtime, sessions, submit/result, and event polling | Contract frozen here; implementation follows `nnrp-rs` FFI |
| `@nnrp/wasm` | Browser and edge clients | WASM loader, browser client runtime, sessions, submit/cancel/event APIs, and browser transport slots | Contract frozen here; implementation follows `nnrp-rs` WASM |

## Runtime Modes

The public API freezes two runtime modes:

1. **Backend native mode**: Node.js or Deno services load `nnrp-rs` native libraries and may expose
   both client and server APIs.
2. **Browser WASM mode**: browser and edge clients load the WASM bundle and expose client APIs only.

`@nnrp/core` is shared by both modes and must not import Node built-ins, DOM APIs, native loaders, or
WASM loader code.

## Current Implementation Status

The `nnrp-js` repository already contains the package skeleton, Deno tasks, runtime policy checks,
and initial placeholder exports. The API documented here is the frozen target contract for the
implementation work that follows. Before registry publication, the package exports must converge on
these names and shapes.

| Area | Required public state before publish |
|---|---|
| Core package | Exports the frozen `Nnrp*` interfaces, constants, manifest builders, and transport selection helpers |
| Native package | Loads and validates native artifact manifests before opening backend runtimes |
| WASM package | Loads and validates WASM manifests without importing native or server-only code |
| Conformance | Emits build-mode-specific capability manifests and adapter results |
| Benchmarks | Reports backend native and browser WASM measurements separately |

## Tooling Policy

- Deno is the repository toolchain.
- Node.js compatibility is a package output requirement.
- Bun is outside the supported runtime, tooling, CI, example, and package export surface.
- Browser packages must never load `.dll`, `.so`, or `.dylib` files.
- Backend native packages must not ship browser-only transport code.

## Contents

- [Quick Start](./quick-start)
- **API Reference**: [Overview](./api) · [Core Types](./api/core) ·
  [Native Backend](./api/native) · [WASM Browser Client](./api/wasm)
