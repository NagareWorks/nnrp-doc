# JS/TS SDK Overview

`nnrp-js` is the Deno-first TypeScript SDK workspace for NNRP. The repository uses Deno for
formatting, linting, tests, type checking, and builds, while published packages must remain
Node.js-compatible ESM with `.d.ts` declarations.

The Preview3 JS/TS SDK does not reimplement the protocol core. It consumes native FFI and WASM
primitives from `nnrp-rs`, then freezes package boundaries, data structures, and runtime APIs at the
TypeScript layer.

## Current Status (Preview3)

| Module         | Status                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `@nnrp/core`   | 🚧 Skeleton created; freezes shared types, capability manifest, and transport selection data structures |
| `@nnrp/native` | 🚧 Skeleton created; targets Node.js/Deno backend native FFI client/server runtime                      |
| `@nnrp/wasm`   | 🚧 Skeleton created; targets browser/edge client-only WASM runtime                                      |
| Deno tooling   | ✅ format/lint/typecheck/test/build connected                                                           |
| Bun policy     | ✅ Bun is rejected from runtime support, adaptation, CI, examples, and package exports                  |
| Conformance    | ⏳ JS/TS adapter and build-mode capability manifest pending                                             |

## Build Modes

Preview3 freezes two build modes:

1. **Backend build mode**: Node.js/Deno services use `nnrp-rs` native FFI artifacts.
2. **Browser client build mode**: browser/edge clients use `nnrp-rs` WASM artifacts.

These modes produce three distribution artifacts:

| Artifact       | Package        | Native dependency                           | Boundary                                                                  |
| -------------- | -------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| Core           | `@nnrp/core`   | None                                        | Shared types, capability claims, transport selection structures only      |
| Backend        | `@nnrp/native` | `.dll` / `.so` / `.dylib` / `.a` native FFI | May include client/server APIs; must not include browser client-only code |
| Browser client | `@nnrp/wasm`   | `.wasm` + JS/TS declarations                | Browser client APIs only; must not include server APIs or native loaders  |

## Contents

- [Quick Start](./quick-start)
- **API Reference**: [Core Types](./api/core) · [Native Backend](./api/native) ·
  [WASM Browser Client](./api/wasm)
