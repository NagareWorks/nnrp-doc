# JS/TS — Frozen API

The Preview3 JS/TS SDK API has three groups: core types, native backend runtime, and WASM browser
client runtime.

| Group                             | Package        | Description                                                                                      | Status      |
| --------------------------------- | -------------- | ------------------------------------------------------------------------------------------------ | ----------- |
| [Core Types](./api/core)          | `@nnrp/core`   | Shared data structures, capability manifest, transport candidates, diagnostics, and result model | 🚧 Freezing |
| [Native Backend](./api/native)    | `@nnrp/native` | Node.js/Deno backend native FFI loader, client/server/session APIs                               | 🚧 Freezing |
| [WASM Browser Client](./api/wasm) | `@nnrp/wasm`   | Browser/edge WASM loader, client/session APIs, browser transport adapter slots                   | 🚧 Freezing |

## Global Constraints

1. Deno is the development and build toolchain, not a runtime API dependency.
2. Published packages must remain Node.js-compatible ESM with `.d.ts`.
3. `@nnrp/core` must not depend on native, WASM, DOM, or Node built-ins.
4. `@nnrp/native` uses native FFI artifacts and may expose client/server APIs.
5. `@nnrp/wasm` uses WASM artifacts and exposes browser client APIs only.
6. Bun is outside the supported surface.
