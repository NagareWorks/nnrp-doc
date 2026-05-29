# JS/TS SDK 概览

`nnrp-js` 是 NNRP 的 Deno-first TypeScript SDK 工作区。仓库使用 Deno
进行格式化、lint、测试、类型检查与构建，但发布产物必须保持 Node.js-compatible ESM 与 `.d.ts` 声明。

Preview3 的 JS/TS SDK 不重新实现协议核心。它消费 `nnrp-rs` 提供的 native FFI 与 WASM primitive，并在
TypeScript 层冻结应用可调用的包边界、数据结构和运行时 API。

## 当前状态（Preview3）

| 模块           | 状态                                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| `@nnrp/core`   | 🚧 已建立骨架；冻结 shared types、capability manifest、transport selection 数据结构 |
| `@nnrp/native` | 🚧 已建立骨架；目标是 Node.js/Deno 后端 native FFI client/server runtime            |
| `@nnrp/wasm`   | 🚧 已建立骨架；目标是浏览器/edge client-only WASM runtime                           |
| Deno 工具链    | ✅ 已接入 format/lint/typecheck/test/build                                          |
| Bun 策略       | ✅ 禁止 Bun 进入运行时、适配、CI、示例和包导出                                      |
| Conformance    | ⏳ 待接入 JS/TS adapter 与 build-mode capability manifest                           |

## 构建模式

Preview3 冻结两种构建模式：

1. **后端构建模式**：Node.js/Deno 服务端使用 `nnrp-rs` native FFI 产物。
2. **浏览器客户端构建模式**：浏览器/edge client 使用 `nnrp-rs` WASM 产物。

这两种模式对应三类发布产物：

| 产物           | 包             | Native 依赖                                 | 边界                                                            |
| -------------- | -------------- | ------------------------------------------- | --------------------------------------------------------------- |
| Core           | `@nnrp/core`   | 无                                          | 只包含共享类型、能力声明、transport selection 结构              |
| Backend        | `@nnrp/native` | `.dll` / `.so` / `.dylib` / `.a` native FFI | 可以包含 client/server API；不得包含浏览器 client-only 代码     |
| Browser client | `@nnrp/wasm`   | `.wasm` + JS/TS 声明                        | 只包含 browser client API；不得包含 server API 或 native loader |

## 目录

- [快速使用](./quick-start)
- **API 参考**：[核心类型](./api/core) · [Native 后端](./api/native) ·
  [WASM 浏览器客户端](./api/wasm)
