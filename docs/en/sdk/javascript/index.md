# JavaScript/TypeScript SDK Overview

`nnrp-js` provides the JavaScript and TypeScript SDK packages for NNRP applications. The workspace
is authored with Deno, while package output is ESM with `.d.ts` declarations for Node.js,
Deno-compatible backend hosts, browser clients, and edge clients.

The SDK has three packages:

| Package        | Runtime                        | Primary use                                                                                                                            |
| -------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `@nnrp/core`   | Runtime-neutral                | Shared protocol constants, diagnostics, submit/result shapes, capability manifests, and transport selection helpers.                   |
| `@nnrp/native` | Node.js and Deno backend hosts | Native artifact manifest validation, backend runtime lifecycle, client sessions, server sessions, and coarse native FFI binding slots. |
| `@nnrp/wasm`   | Browser and edge clients       | WASM primitive manifest validation, browser client runtime lifecycle, browser session APIs, and browser transport provider slots.      |

## Runtime Modes

| Mode           | Package        | Capabilities                                                                                   |
| -------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| Backend native | `@nnrp/native` | Client sessions, server listeners, TCP/QUIC capability claims, native artifact diagnostics.    |
| Browser WASM   | `@nnrp/wasm`   | Browser client sessions, WebSocket/WebTransport capability claims, WASM primitive diagnostics. |
| Core           | `@nnrp/core`   | Shared types and helpers only.                                                                 |

`@nnrp/core` must not import native loaders, WASM loaders, Node built-ins, or DOM APIs.
`@nnrp/native` must not ship browser-only code. `@nnrp/wasm` must not import `node:*` modules or
expose server APIs.

## Current Package State

The SDK packages already expose package export maps, declaration output, package smoke checks,
runtime policy checks, conformance commands, benchmark commands, and a release dry-run workflow.
Native and WASM artifact loading is manifest-gated before accelerated runtime paths are exposed.

## Contents

- [Quick Start](./quick-start)
- [API Overview](./api)
- [Core Types](./api/core)
- [Native Backend Runtime](./api/native)
- [WASM Browser Runtime](./api/wasm)
