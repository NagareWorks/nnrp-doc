# JavaScript/TypeScript API

The JavaScript/TypeScript SDK public API is organized into core types, Node/Deno native runtime, and
browser WASM runtime. This page freezes the cross-package boundary. Implementation in `nnrp-js`
should converge on these names before package publication.

Start with [Native Runtime](./api/native) for Node.js/Deno clients, CLI tools, agent runtimes, and services or
[WASM Browser Client](./api/wasm) for browser and edge clients. [Core Types](./api/core) is the
shared type reference linked from method parameter tables.

| Group | Package | Description | Contract |
|---|---|---|---|
| [Core Types](./api/core) | `@nnrp/core` | Constants, capability manifests, diagnostics, payload ownership, transport selection, request/result types | Frozen target |
| [Native Runtime](./api/native) | `@nnrp/native` | Native artifact resolver, Node/Deno client, backend runtime, server/session APIs | Frozen target |
| [WASM Browser Client](./api/wasm) | `@nnrp/wasm` | WASM loader, browser runtime, client/session APIs, browser transport slots | Frozen target |

## Package Boundary Rules

1. `@nnrp/core` is dependency-light and runtime-neutral.
2. `@nnrp/native` may import Node-compatible filesystem/process/native-loading helpers and may expose both client and server APIs.
3. `@nnrp/wasm` may import browser and WebAssembly APIs and must expose client APIs only.
4. Every public binary payload parameter accepts `Uint8Array` or `ArrayBufferView`; retained payloads are copied unless
   an API explicitly states ownership transfer.
5. `bigint` is used for operation identifiers that can exceed JavaScript's safe integer range.
6. Runtime errors must preserve structured diagnostics rather than flattening native or WASM status into strings.

## Version and Capability Contract

```ts
export const NNRP_PROTOCOL_NAME: "NNRP";
export const NNRP_PROTOCOL_VERSION: string;

export type NnrpBuildMode = "backend-native" | "browser-wasm";
```

The JS/TS SDK must emit capability manifests per build mode. A browser WASM manifest must not claim
server capabilities or native transport capabilities. A backend native manifest must not claim
browser-only transports unless a browser adapter is actually active in that runtime.

## Naming Rules

The frozen public surface uses the `Nnrp` prefix for exported interfaces and classes. Existing
repository skeleton names without the prefix are implementation placeholders and should either become
aliases or be replaced before publication.

## Documentation Pattern

Code blocks show usage examples. Method shape, requiredness, accepted values, returns, and error
behavior belong in method-level tables so implementation and user docs stay aligned.
