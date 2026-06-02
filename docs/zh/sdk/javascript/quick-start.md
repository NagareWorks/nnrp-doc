# JavaScript/TypeScript 快速使用

## 安装形态

包名如下：

| 包                     | Import         |
| ---------------------- | -------------- |
| Core                   | `@nnrp/core`   |
| Backend native runtime | `@nnrp/native` |
| Browser WASM runtime   | `@nnrp/wasm`   |

## Backend Native Client

Node.js/Deno CLI、agent runtime、后端服务和 adapter 进程使用 `@nnrp/native`。

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

应用需要显式 runtime 生命周期或 server API 时使用 `openBackendRuntime`。

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

浏览器和 edge client 使用 `@nnrp/wasm`。Runtime 支持显式 module URL、预编译
`WebAssembly.Module`，或者 `nnrp-rs` WASM primitive manifest。

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

## 验证命令

```bash
deno task lint
deno task test
deno task package-smoke
deno task release-dry-run
```

`release-dry-run` 会生成 capability、conformance、benchmark 和 package pack JSON
产物，供发布前审查。
