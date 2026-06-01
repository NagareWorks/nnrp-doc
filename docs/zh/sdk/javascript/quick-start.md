# JavaScript/TypeScript 快速使用

`nnrp-js` 仓库当前处于 API 冻结与实现推进阶段。本页示例是包发布前必须保持的公开形态。

## 仓库验证

```bash
deno task lint
deno task test
deno task build
```

`deno task lint` 包含 runtime policy 检查，会拒绝 Bun 相关运行时路径、示例、CI 轴、package export 和 lockfile。

## 包名

| 包 | import path | 运行时 |
|---|---|---|
| Core | `@nnrp/core` | 任意 JS 运行时 |
| Backend native | `@nnrp/native` | Node.js 与 Deno 后端宿主 |
| Browser WASM | `@nnrp/wasm` | 浏览器与 edge client |

Registry 发布会等 package artifact 与 native/WASM 分发形态验证后再开启。实现工作仍应使用这些包名。

## Backend Native 模式

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

Backend 模式可以暴露 client 与 server API。加载 library 前必须校验 native artifact manifest，并用结构化诊断报告 ABI symbol 缺失。

## Browser WASM 模式

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

Browser 模式只暴露 client API，不暴露 `listen`、`accept`、server session、Node built-in 或 native library loader。

## Conformance Adapter 形态

JS/TS SDK 应提供按 build mode 区分的 adapter 命令：

```bash
deno task conformance:backend -- --manifest ./artifacts/backend-manifest.json
deno task conformance:browser -- --manifest ./artifacts/browser-manifest.json
```

Capability claim 必须匹配当前 build mode。Backend native mode 与 browser WASM mode 不能声明完全相同的 transport 或 server capability。
