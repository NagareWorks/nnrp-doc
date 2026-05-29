# JS/TS — 冻结 API

JS/TS SDK 的 Preview3 API 分为三组：核心类型、native 后端 runtime、WASM 浏览器客户端 runtime。

| 分组                            | 包             | 说明                                                                       | 状态      |
| ------------------------------- | -------------- | -------------------------------------------------------------------------- | --------- |
| [核心类型](./api/core)          | `@nnrp/core`   | 共享数据结构、capability manifest、transport candidate、诊断与结果模型     | 🚧 冻结中 |
| [Native 后端](./api/native)     | `@nnrp/native` | Node.js/Deno 后端 native FFI loader、client/server/session API             | 🚧 冻结中 |
| [WASM 浏览器客户端](./api/wasm) | `@nnrp/wasm`   | 浏览器/edge WASM loader、client/session API、浏览器 transport adapter 插槽 | 🚧 冻结中 |

## 全局约束

1. Deno 是开发与构建工具链，不是运行时 API 依赖。
2. 发布包必须保持 Node.js-compatible ESM 与 `.d.ts`。
3. `@nnrp/core` 不得依赖 native、WASM、DOM 或 Node built-in。
4. `@nnrp/native` 使用 native FFI 产物，可以暴露 client/server API。
5. `@nnrp/wasm` 使用 WASM 产物，只暴露 browser client API。
6. Bun 不属于支持面。
