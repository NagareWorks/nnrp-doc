# JavaScript/TypeScript 快速使用

## 安装包

SDK 使用 Deno 作为开发工具链，但发布物是标准 npm ESM 包，并带 `.d.ts` 声明，保持 Node.js 兼容。

Deno 后端 client，允许 TCP/QUIC 自动探测：

```bash
deno add npm:@nnrp/native-client npm:@nnrp/transport-tcp npm:@nnrp/transport-quic
```

Node.js 后端 client：

```bash
npm install @nnrp/native-client @nnrp/transport-tcp @nnrp/transport-quic
```

Deno 后端 server：

```bash
deno add npm:@nnrp/native-server npm:@nnrp/transport-tcp npm:@nnrp/transport-quic
```

Node.js 后端 server：

```bash
npm install @nnrp/native-server @nnrp/transport-tcp @nnrp/transport-quic
```

默认浏览器 WebSocket 路径：

```bash
npm install @nnrp/browser-client @nnrp/transport-websocket
```

如果 browser 或 edge host 暴露 TCP/QUIC-capable WASM transport bridge：

```bash
npm install @nnrp/browser-client @nnrp/transport-tcp @nnrp/transport-quic @nnrp/transport-websocket
```

如果要精确固定当前 preview：

```bash
deno add npm:@nnrp/native-client@1.0.0-preview.3.4 npm:@nnrp/transport-tcp@1.0.0-preview.3.4 npm:@nnrp/transport-quic@1.0.0-preview.3.4
npm install @nnrp/native-client@1.0.0-preview.3.4 @nnrp/transport-tcp@1.0.0-preview.3.4 @nnrp/transport-quic@1.0.0-preview.3.4
```

## Backend Native Client

Node.js/Deno CLI、agent runtime、后端服务和 adapter 进程使用 `@nnrp/native-client`。安装一个或多个
transport 包；runtime 会探测已安装 provider 并根据策略选择 active transport。

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

应用需要暴露 NNRP endpoint 时使用 `@nnrp/native-server`。

```ts
import { openBackendRuntime } from "@nnrp/native-server";
import { createTcpTransportProvider } from "@nnrp/transport-tcp";

const runtime = await openBackendRuntime({
  transportPolicy: "tcp-only",
  transports: [createTcpTransportProvider()],
});

const server = runtime.listen({ endpoint: "0.0.0.0:4433" });

// 在 server adapter 中 accept 并处理 session。

await server.close();
await runtime.close();
```

## Browser Client

浏览器与 edge client 使用 `@nnrp/browser-client`。Browser client 包带浏览器 WASM primitives。
WebSocket 是默认浏览器原生 transport；`@nnrp/transport-tcp` 与 `@nnrp/transport-quic` 携带 WASM
transport primitives，用于宿主提供对应 network bridge 的 browser/edge runtime。

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

如果宿主能把 TCP/QUIC transport capability 暴露给 WASM，也可以同时传入这些 provider：

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

## 包边界清单

1. `@nnrp/native-client` 与 `@nnrp/native-server` 是 role package，不捆绑 `.dll`、`.so`、`.dylib` 或
   transport WASM artifact。
2. `@nnrp/transport-tcp` 与 `@nnrp/transport-quic` 携带完整 native/WASM transport 产物，包括
   browser/edge WASM transport primitives。
3. `@nnrp/transport-websocket` 使用宿主 WebSocket implementation，不依赖 Rust WebSocket transport
   artifact。
4. 安装哪个 transport 就允许哪个 transport 参与探测；同时安装多个时由 runtime probing 与 policy 选择
   active path。
