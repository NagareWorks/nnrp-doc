# JavaScript/TypeScript 快速使用

## 安装包

SDK 使用 Deno 作为开发工具链，但发布物是标准 npm ESM 包，并带 `.d.ts` 声明，保持 Node.js 兼容。

Deno 后端 client，安装全部 Preview4 native carrier：

```bash
deno add npm:@nnrp/native-client npm:@nnrp/transport-tcp npm:@nnrp/transport-quic npm:@nnrp/transport-ipc npm:@nnrp/transport-websocket
```

Node.js 后端 client：

```bash
npm install @nnrp/native-client @nnrp/transport-tcp @nnrp/transport-quic @nnrp/transport-ipc @nnrp/transport-websocket
```

Deno 后端 server：

```bash
deno add npm:@nnrp/native-server npm:@nnrp/transport-tcp npm:@nnrp/transport-quic npm:@nnrp/transport-ipc npm:@nnrp/transport-websocket
```

Node.js 后端 server：

```bash
npm install @nnrp/native-server @nnrp/transport-tcp @nnrp/transport-quic @nnrp/transport-ipc @nnrp/transport-websocket
```

默认浏览器 WebSocket 路径：

```bash
npm install @nnrp/browser-client @nnrp/transport-websocket
```

## Backend Native Client

Node.js/Deno CLI、agent runtime、后端服务和 adapter 进程使用 `@nnrp/native-client`。安装一个或多个
transport 包；runtime 会探测已安装 provider 并根据策略选择 active transport。

下面假设 `trustedCertificateDer` 是从部署信任配置中加载的 `Uint8Array`。

```ts
import { openNativeClient } from "@nnrp/native-client";
import { createTcpTransportProvider } from "@nnrp/transport-tcp";
import { createQuicTransportProvider } from "@nnrp/transport-quic";

const client = await openNativeClient({
  endpoint: "nnrps://runtime.example/session/default",
  providerRoutes: {
    quic: {
      security: { mode: "client", serverName: "runtime.example", trustedCertificateDer },
    },
    tcp: {
      security: { mode: "client", serverName: "runtime.example", trustedCertificateDer },
    },
  },
  transportPolicy: "auto",
  transports: [
    createQuicTransportProvider(),
    createTcpTransportProvider(),
  ],
});

const session = await client.openSession({ profileId: 1 });

const result = await session.submit({
  operationId: 1n,
  frameId: 1,
  payload: new Uint8Array([1, 2, 3]),
  inputProfile: "tensor",
  submitMode: "inline",
});

await session.close();
await client.close();
```

## Backend Native Server

应用需要暴露 NNRP endpoint 时使用 `@nnrp/native-server`。WSS route 使用的 `certificateDer` 与
`privateKeyPkcs8Der` 是从服务端凭据存储加载的 `Uint8Array`。

```ts
import { openBackendRuntime } from "@nnrp/native-server";
import { createIpcTransportProvider } from "@nnrp/transport-ipc";
import { createTcpTransportProvider } from "@nnrp/transport-tcp";

const runtime = await openBackendRuntime({
  transportPolicy: "auto",
  transports: [createTcpTransportProvider(), createIpcTransportProvider()],
});

const server = runtime.listen({
  endpoint: "nnrp://0.0.0.0:4433",
  providerRoutes: {
    ipc: { endpoint: "unix:///run/nnrp.sock" },
  },
});

// 在 server adapter 中 accept 并处理 session。

await server.close();
await runtime.close();
```

## Browser Client

浏览器与 edge client 使用 `@nnrp/browser-client`。Browser client 使用 WebSocket Provider 与 browser
role package 携带的 WASM runtime。

```ts
import { openBrowserRuntime } from "@nnrp/browser-client";
import { createWebSocketTransportProvider } from "@nnrp/transport-websocket";

const runtime = await openBrowserRuntime({
  transportProviders: [createWebSocketTransportProvider()],
});

const client = runtime.connect({
  endpoint: "nnrps://example.test/session/default",
  providerRoutes: {
    websocket: { endpoint: "wss://example.test/nnrp" },
  },
  transportPolicy: "auto",
});

const session = await client.openSession({ profileId: 2 });
```

## 包边界清单

1. `@nnrp/native-client` 与 `@nnrp/native-server` 是 role package，不捆绑 `.dll`、`.so`、`.dylib` 或
   browser WASM artifact。
2. TCP、QUIC、IPC 与 WebSocket transport package 分别携带自己的 native Provider 产物。
3. `@nnrp/browser-client` 携带 browser WASM；browser `@nnrp/transport-websocket` 将其与宿主
   WebSocket 对象组合使用，不复制该 WASM。
4. 安装哪个 transport 就允许哪个 transport 参与探测；同时安装多个时由 runtime probing 与 policy 选择
   active path。
