# JavaScript/TypeScript API

JavaScript/TypeScript SDK 的公开 API 分为核心类型、backend native runtime 与 browser WASM runtime。本页冻结跨包边界，`nnrp-js` 实现应在发布前收敛到这些名称。

| 分组 | 包 | 说明 | 契约 |
|---|---|---|---|
| [核心类型](./api/core) | `@nnrp/core` | 常量、capability manifest、诊断、payload 所有权、transport selection、请求与结果类型 | 冻结目标 |
| [Native 后端](./api/native) | `@nnrp/native` | Native artifact resolver、backend runtime、client/server/session API | 冻结目标 |
| [WASM 浏览器客户端](./api/wasm) | `@nnrp/wasm` | WASM loader、browser runtime、client/session API、浏览器 transport 插槽 | 冻结目标 |

## 包边界规则

1. `@nnrp/core` 保持轻依赖和 runtime-neutral。
2. `@nnrp/native` 可以导入 Node-compatible filesystem/process/native-loading helper，并可以暴露 server API。
3. `@nnrp/wasm` 可以导入浏览器与 WebAssembly API，只能暴露 client API。
4. 所有公开二进制 payload 参数接受 `Uint8Array` 或 `ArrayBufferView`；被保留的 payload 默认复制，除非 API 明确声明所有权转移。
5. 可能超过 JavaScript safe integer 范围的 operation id 使用 `bigint`。
6. Runtime error 必须保留结构化诊断，不能把 native 或 WASM status 压扁成字符串。

## 版本与能力契约

```ts
export const NNRP_PROTOCOL_NAME: "NNRP";
export const NNRP_PROTOCOL_VERSION: string;

export type NnrpBuildMode = "backend-native" | "browser-wasm";
```

JS/TS SDK 必须按 build mode 输出 capability manifest。Browser WASM manifest 不得声明 server capability 或 native transport capability。Backend native manifest 只有在真实启用浏览器 adapter 时，才可以声明浏览器专用 transport。

## 命名规则

冻结公开面使用 `Nnrp` 前缀导出 interface 和 class。当前仓库 skeleton 中没有前缀的名称是实现占位，发布前应改为别名或替换为这里的公开名称。
