# JavaScript/TypeScript Quick Start

The `nnrp-js` repository is in the API-freeze and implementation rollout stage. These examples are
the public shapes that implementation must preserve before packages are published.

## Repository Validation

```bash
deno task lint
deno task test
deno task build
```

`deno task lint` includes the runtime policy check. It rejects Bun-specific runtime paths, examples,
CI axes, package exports, and lockfiles.

## Package Names

| Package | Import path | Runtime |
|---|---|---|
| Core | `@nnrp/core` | Any JS runtime |
| Backend native | `@nnrp/native` | Node.js and Deno backend hosts |
| Browser WASM | `@nnrp/wasm` | Browser and edge clients |

Registry publication is deferred until the package artifacts and native/WASM distribution shape are
verified. Implementation work should still use these package names.

## Backend Native Mode

```ts
import { openBackendRuntime } from "@nnrp/native";

const runtime = await openBackendRuntime({
  nativeLibrary: {
    artifactDir: "./native",
  },
  transportPolicy: "score",
});

const client = await runtime.connect({
  endpoint: "127.0.0.1:4433",
});

const session = await client.openSession({
  inputProfile: "tensor",
});

const result = await session.submit({
  frameId: 1,
  payload: new Uint8Array([1, 2, 3]),
  inputProfile: "tensor",
  submitMode: "inline",
});

await session.close();
await client.close();
await runtime.close();
```

Backend mode may expose client and server APIs. It must validate the native artifact manifest before
loading a library and must report missing ABI symbols as structured diagnostics.

## Browser WASM Mode

```ts
import { openBrowserRuntime } from "@nnrp/wasm";

const runtime = await openBrowserRuntime({
  wasmUrl: new URL("/assets/nnrp_wasm_bg.wasm", location.href),
  manifestUrl: new URL("/assets/nnrp_wasm_manifest.json", location.href),
});

const client = await runtime.connect({
  endpoint: new URL("wss://example.test/nnrp"),
  transportPolicy: "score",
});

const session = await client.openSession({
  inputProfile: "tensor",
});

await session.submitNoWait({
  frameId: 1,
  payload: new Uint8Array([1, 2, 3]),
  inputProfile: "tensor",
  submitMode: "inline",
});
```

Browser mode exposes client APIs only. It must not expose `listen`, `accept`, server sessions, Node
built-ins, or native library loaders.

## Conformance Adapter Shape

The JS/TS SDK should provide build-mode-specific adapter commands:

```bash
deno task conformance:backend -- --manifest ./artifacts/backend-manifest.json
deno task conformance:browser -- --manifest ./artifacts/browser-manifest.json
```

Capability claims must match the active build mode. Backend native mode and browser WASM mode must
not claim identical transport or server capabilities.
