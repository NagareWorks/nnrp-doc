# JavaScript/TypeScript Quick Start

## Install Shape

The package names are:

| Package                | Import         |
| ---------------------- | -------------- |
| Core                   | `@nnrp/core`   |
| Backend native runtime | `@nnrp/native` |
| Browser WASM runtime   | `@nnrp/wasm`   |

## Backend Native Client

Use `@nnrp/native` for Node.js/Deno CLI tools, agent runtimes, backend services, and adapter
processes.

```ts
import { openNativeClient } from "@nnrp/native";

const client = await openNativeClient({
  endpoint: "127.0.0.1:4433",
  nativeLibrary: { artifactDir: "./native" },
  transportPolicy: "score",
});

const session = client.openSession({ inputProfile: "tensor" });

const result = await session.submit({
  frameId: 1,
  payload: new Uint8Array([1, 2, 3]),
  inputProfile: "tensor",
  submitMode: "inline",
});

await session.close();
await client.close();
```

## Backend Native Runtime

Use `openBackendRuntime` when the application needs explicit runtime lifecycle control or server
APIs.

```ts
import { openBackendRuntime } from "@nnrp/native";

const runtime = await openBackendRuntime({
  nativeLibrary: { artifactDir: "./native" },
  transportPolicy: "score",
});

const server = runtime.listen({ endpoint: "0.0.0.0:4433" });
const client = runtime.connect({ endpoint: "127.0.0.1:4433" });

await client.close();
await server.close();
await runtime.close();
```

## Browser WASM Client

Use `@nnrp/wasm` for browser and edge clients. The runtime accepts either an explicit module URL, a
precompiled `WebAssembly.Module`, or an `nnrp-rs` WASM primitive manifest.

```ts
import { openBrowserRuntime } from "@nnrp/wasm";

const runtime = await openBrowserRuntime({
  artifact: {
    baseUrl: "/assets/nnrp",
    manifest: {
      package: "nnrp-wasm",
      wasm: "nnrp_wasm.wasm",
      types: "nnrp_wasm.d.ts",
      exports: [
        "nnrp_wasm_protocol_major",
        "nnrp_wasm_wire_format",
        "selectTransportWithProbeJson",
        "scoreProviderProbeJson",
      ],
    },
  },
});

const client = runtime.connect({
  endpoint: "wss://example.test/nnrp",
  transportPolicy: "score",
});

const session = client.openSession({ inputProfile: "token" });
```

## Validation Commands

```bash
deno task lint
deno task test
deno task package-smoke
deno task release-dry-run
```

`release-dry-run` generates capability, conformance, benchmark, and package pack JSON artifacts for
review before registry publication.
