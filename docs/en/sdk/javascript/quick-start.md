# JavaScript/TypeScript Quick Start

## Install Packages

The SDK is developed with Deno, but the published packages are standard npm ESM packages with
`.d.ts` declarations and remain Node.js-compatible.

For a Deno backend client with all Preview4 native carriers installed:

```bash
deno add npm:@nnrp/native-client npm:@nnrp/transport-tcp npm:@nnrp/transport-quic npm:@nnrp/transport-ipc npm:@nnrp/transport-websocket
```

For a Node.js backend client:

```bash
npm install @nnrp/native-client @nnrp/transport-tcp @nnrp/transport-quic @nnrp/transport-ipc @nnrp/transport-websocket
```

For a Deno backend server:

```bash
deno add npm:@nnrp/native-server npm:@nnrp/transport-tcp npm:@nnrp/transport-quic npm:@nnrp/transport-ipc npm:@nnrp/transport-websocket
```

For a Node.js backend server:

```bash
npm install @nnrp/native-server @nnrp/transport-tcp @nnrp/transport-quic @nnrp/transport-ipc @nnrp/transport-websocket
```

For the default browser WebSocket path:

```bash
npm install @nnrp/browser-client @nnrp/transport-websocket
```

## Backend Native Client

Use `@nnrp/native-client` for Node.js/Deno CLI tools, agent runtimes, backend services, and adapter
processes. Install one or more transport packages; the runtime probes installed providers and
applies the selected transport policy.

```ts
import { openNativeClient } from "@nnrp/native-client";
import { createTcpTransportProvider } from "@nnrp/transport-tcp";
import { createQuicTransportProvider } from "@nnrp/transport-quic";

const client = await openNativeClient({
  endpoint: "nnrps://runtime.example/session/default",
  transportPolicy: "auto",
  transports: [
    createQuicTransportProvider(),
    createTcpTransportProvider(),
  ],
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

## Backend Native Server

Use `@nnrp/native-server` when the application exposes an NNRP endpoint.

```ts
import { openBackendRuntime } from "@nnrp/native-server";
import { createTcpTransportProvider } from "@nnrp/transport-tcp";

const runtime = await openBackendRuntime({
  transportPolicy: "force-tcp",
  transports: [createTcpTransportProvider()],
});

const server = runtime.listen({ endpoint: "nnrp://0.0.0.0:4433" });

// Accept and handle sessions in the server adapter.

await server.close();
await runtime.close();
```

## Browser Client

Use `@nnrp/browser-client` for browser and edge clients. Browser clients use the WebSocket provider
with the WASM runtime carried by the browser role package.

```ts
import { openBrowserRuntime } from "@nnrp/browser-client";
import { createWebSocketTransportProvider } from "@nnrp/transport-websocket";

const runtime = await openBrowserRuntime({
  transportProviders: [createWebSocketTransportProvider()],
});

const client = runtime.connect({
  endpoint: "nnrps://example.test/session/default",
  providerEndpoint: "wss://example.test/nnrp",
  transportPolicy: "auto",
});

const session = client.openSession({ inputProfile: "token" });
```

## Package Boundary Checklist

1. `@nnrp/native-client` and `@nnrp/native-server` are role packages; they do not bundle `.dll`,
   `.so`, `.dylib`, or browser WASM artifacts.
2. TCP, QUIC, IPC, and WebSocket transport packages carry their own native provider payloads.
3. `@nnrp/browser-client` carries browser WASM; browser `@nnrp/transport-websocket` uses it with the
   host WebSocket object and does not duplicate it.
4. Install the transports you want to allow; if several are installed, runtime probing and policy
   choose the active path.
