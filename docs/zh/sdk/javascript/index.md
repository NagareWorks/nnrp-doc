# JavaScript/TypeScript SDK 概览

`nnrp-js` 是 NNRP 的 JavaScript/TypeScript SDK 工作区。仓库使用 Deno 完成格式化、lint、测试、类型检查与构建；发布包保持 Node-compatible ESM 与 `.d.ts` 声明。

这个 SDK 不拥有协议关键 codec 或状态机。后端宿主的运行时语义来自 `nnrp-rs` native FFI 产物；浏览器和 edge 宿主的运行时语义来自 WASM 产物。TypeScript 层负责冻结包边界、host-facing 对象、数据所有权规则和 conformance 入口。

## 包映射

| 包 | 运行目标 | 公开职责 | 状态 |
|---|---|---|---|
| `@nnrp/core` | 任意 JS 运行时 | 共享类型、capability manifest、诊断、payload 所有权与 transport selection helper | 本页冻结契约；仓库骨架已存在 |
| `@nnrp/native` | Node.js 与 Deno 后端宿主 | Native artifact 发现、后端 client/server runtime、session、submit/result 与事件轮询 | 本页冻结契约；实现跟随 `nnrp-rs` FFI |
| `@nnrp/wasm` | 浏览器与 edge client | WASM loader、浏览器 client runtime、session、submit/cancel/event API 与浏览器 transport 插槽 | 本页冻结契约；实现跟随 `nnrp-rs` WASM |

## 运行模式

公开 API 冻结两种运行模式：

1. **Backend native mode**：Node.js 或 Deno 服务加载 `nnrp-rs` native library，可以暴露 client 与 server API。
2. **Browser WASM mode**：浏览器与 edge client 加载 WASM bundle，只暴露 client API。

`@nnrp/core` 被两种模式共享，不能导入 Node built-in、DOM API、native loader 或 WASM loader 代码。

## 当前实现状态

`nnrp-js` 仓库已经包含 package skeleton、Deno task、runtime policy check 与初始 placeholder exports。本页文档是后续实现必须收敛到的冻结目标契约。发布到 registry 前，包导出必须对齐这里的名称和形状。

| 区域 | 发布前必须达到的公开状态 |
|---|---|
| Core package | 导出冻结的 `Nnrp*` interface、常量、manifest builder 与 transport selection helper |
| Native package | 打开 backend runtime 前加载并校验 native artifact manifest |
| WASM package | 加载并校验 WASM manifest，不导入 native 或 server-only 代码 |
| Conformance | 按 build mode 输出 capability manifest 与 adapter result |
| Benchmark | 分别报告 backend native 与 browser WASM 指标 |

## 工具链策略

- Deno 是仓库工具链。
- Node.js compatibility 是发布包输出要求。
- Bun 不属于支持的运行时、工具链、CI、示例或 package export 面。
- 浏览器包不得加载 `.dll`、`.so` 或 `.dylib`。
- Backend native 包不得携带浏览器专用 transport 代码。

## 目录

- [快速使用](./quick-start)
- **API 参考**：[总览](./api) · [核心类型](./api/core) · [Native 后端](./api/native) ·
  [WASM 浏览器客户端](./api/wasm)
