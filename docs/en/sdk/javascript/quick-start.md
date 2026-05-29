# JS/TS Quick Start

The Preview3 JS/TS SDK is currently in the skeleton and API-freeze stage. The repository validates
and builds with Deno, while future npm packages still emit Node.js-compatible ESM.

## Repository Validation

```bash
deno task lint
deno task test
deno task build
```

`deno task lint` also runs the runtime policy check, which rejects Bun files, adaptation paths, or
CI configuration.

## Backend Mode (Node.js / Deno Services)

Backend mode consumes `nnrp-rs` native FFI artifacts. The frozen shape is expected to look like
this:

```ts
import { openBackendRuntime } from "@nnrp/native";

const runtime = await openBackendRuntime({
  nativeLibrary: {
    path: process.env.NNRP_NATIVE_LIBRARY,
  },
});

const client = await runtime.connect({
  endpoint: "127.0.0.1:4433",
  transportPolicy: "score",
});

const session = await client.openSession();
const result = await session.submit({
  payload: new Uint8Array([1, 2, 3]),
});
```

The backend package may expose client and server APIs, but must not carry browser client-only
transport implementations.

## Browser Client Mode

Browser mode consumes `nnrp-rs` WASM primitive artifacts. The frozen shape is expected to look like
this:

```ts
import { openBrowserRuntime } from "@nnrp/wasm";

const runtime = await openBrowserRuntime({
  wasmUrl: new URL("/assets/nnrp_wasm_bg.wasm", location.href),
});

const client = await runtime.connect({
  endpoint: "wss://example.test/nnrp",
  transportPolicy: "score",
});
```

The browser package exposes client APIs only. It does not expose server listen/accept/send-result
APIs and does not load `.dll` / `.so` / `.dylib` libraries.
