# JavaScript/TypeScript Quick Start

## Install Packages

The SDK is developed with Deno, but the published packages are standard npm ESM packages with
`.d.ts` declarations and remain Node.js-compatible.

For a Deno backend client using automatic TCP/QUIC probing:

```bash
deno add npm:@nnrp/native-client npm:@nnrp/transport-tcp npm:@nnrp/transport-quic
```

For a Node.js backend client:

```bash
npm install @nnrp/native-client @nnrp/transport-tcp @nnrp/transport-quic
```

For a Deno backend server:

```bash
deno add npm:@nnrp/native-server npm:@nnrp/transport-tcp npm:@nnrp/transport-quic
```

For a Node.js backend server:

```bash
npm install @nnrp/native-server @nnrp/transport-tcp @nnrp/transport-quic
```

For the default browser WebSocket path:

```bash
npm install @nnrp/browser-client @nnrp/transport-websocket
```

For browser or edge hosts that expose TCP/QUIC-capable WASM transport bridges:

```bash
npm install @nnrp/browser-client @nnrp/transport-tcp @nnrp/transport-quic @nnrp/transport-websocket
```

To pin the current preview exactly:

```bash
deno add npm:@nnrp/native-client@1.0.0-preview.3.4 npm:@nnrp/transport-tcp@1.0.0-preview.3.4 npm:@nnrp/transport-quic@1.0.0-preview.3.4
npm install @nnrp/native-client@1.0.0-preview.3.4 @nnrp/transport-tcp@1.0.0-preview.3.4 @nnrp/transport-quic@1.0.0-preview.3.4
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
  endpoint: "127.0.0.1:4433",
  transportPolicy: "score",
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
  transportPolicy: "tcp-only",
  transports: [createTcpTransportProvider()],
});

const server = runtime.listen({ endpoint: "0.0.0.0:4433" });

// Accept and handle sessions in the server adapter.

await server.close();
await runtime.close();
```

## Browser Client

Use `@nnrp/browser-client` for browser and edge clients. The browser client package carries browser
WASM primitives. WebSocket is the default browser-native transport. `@nnrp/transport-tcp` and
`@nnrp/transport-quic` carry WASM transport primitives for browser/edge hosts that provide the
required network bridge.

```ts
import { openBrowserRuntime } from "@nnrp/browser-client";
import { createWebSocketTransportProvider } from "@nnrp/transport-websocket";

const runtime = await openBrowserRuntime({
  transportProviders: [createWebSocketTransportProvider()],
});

const client = runtime.connect({
  endpoint: "wss://example.test/nnrp",
  transportPolicy: "score",
});

const session = client.openSession({ inputProfile: "token" });
```

When the host can provide TCP/QUIC transport capability to WASM, pass those providers too:

```ts
import { createTcpTransportProvider } from "@nnrp/transport-tcp";
import { createQuicTransportProvider } from "@nnrp/transport-quic";

const runtime = await openBrowserRuntime({
  transportProviders: [
    createQuicTransportProvider(),
    createTcpTransportProvider(),
    createWebSocketTransportProvider(),
  ],
});
```

## Package Boundary Checklist

1. `@nnrp/native-client` and `@nnrp/native-server` are role packages; they do not bundle `.dll`,
   `.so`, `.dylib`, or transport WASM artifacts.
2. `@nnrp/transport-tcp` and `@nnrp/transport-quic` carry the full native/WASM transport payloads,
   including browser/edge WASM transport primitives.
3. `@nnrp/transport-websocket` uses the host WebSocket implementation and does not depend on Rust
   WebSocket transport artifacts.
4. Install the transports you want to allow; if several are installed, runtime probing and policy
   choose the active path.
