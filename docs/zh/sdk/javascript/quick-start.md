# JS/TS 快速使用

Preview3 的 JS/TS SDK 当前处于骨架与 API 冻结阶段。仓库可以用 Deno 完成验证和构建，后续 npm
发布仍输出 Node.js-compatible ESM 包。

## 仓库验证

```bash
deno task lint
deno task test
deno task build
```

`deno task lint` 会同时执行 runtime policy 检查，阻止 Bun 相关文件、适配路径或 CI 配置进入仓库。

## 后端模式（Node.js / Deno 服务端）

后端模式消费 `nnrp-rs` native FFI 产物。后续冻结后的使用形态：

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

后端包可以暴露 client 和 server API，但不能携带浏览器 client-only transport 实现。

## 浏览器客户端模式

浏览器模式消费 `nnrp-rs` WASM primitive 产物。后续冻结后的使用形态：

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

浏览器包只暴露 client API，不暴露 server listen/accept/send-result API，不加载 `.dll` / `.so` /
`.dylib`。
