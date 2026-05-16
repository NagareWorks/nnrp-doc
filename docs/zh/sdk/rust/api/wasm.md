# Rust — WASM 导出（Preview3）

::: warning 规划中
WASM 导出计划在 Preview3 实现，依赖 `nnrp-ffi` crate 的 `wasm32-unknown-unknown` 构建目标。
:::

## 用途

WASM 导出允许在以下场景中不依赖原生 SDK 直接使用 NNRP 协议：

- 浏览器端 Web 应用（通过 WebTransport 或 WebSocket 接入服务端）
- Node.js 服务（无原生依赖）
- Electron 应用嵌入 NNRP 客户端逻辑

---

## 构建方式（规划）

```bash
# 安装工具链
rustup target add wasm32-unknown-unknown
cargo install wasm-pack

# 构建（from nnrp-rs/nnrp-ffi）
wasm-pack build --target web --out-dir pkg

# 或仅编译 wasm 二进制
cargo build --target wasm32-unknown-unknown --release -p nnrp-ffi
```

产物目录：`target/wasm32-unknown-unknown/release/nnrp_ffi.wasm`

---

## 规划导出接口（JavaScript/TypeScript）

编译后通过 `wasm-bindgen` 自动生成 TypeScript 类型定义：

```typescript
// 规划接口（Preview3，尚未实现）

export class NnrpWasmClient {
    constructor(config: NnrpClientConfig);

    /** 连接到服务端（通过 WebTransport） */
    async connect(url: string): Promise<NnrpWasmSession>;
}

export class NnrpWasmSession {
    readonly sessionId: number;
    readonly transportId: TransportId;

    /** 提交帧并等待结果 */
    async submit(request: NnrpSubmitRequest): Promise<NnrpResult>;

    /** 取消帧 */
    async cancelFrame(frameId: number): Promise<void>;

    /** 关闭会话 */
    async close(): Promise<void>;
}

export interface NnrpClientConfig {
    maxViews?: number;        // default: 1
    enableCache?: boolean;    // default: true
    transportPolicy?: string; // "auto" | "prefer_quic" | "force_tcp" | ...
}

export interface NnrpSubmitRequest {
    frameId: number;
    sections: NnrpTensorSection[];
    inferenceBudgetMs?: number;
    deadlineMs?: number;
}

export interface NnrpResult {
    frameId: number;
    resultClass: "complete" | "partial" | "stale_reuse" | "degraded";
    inferenceMs: number;
    sections: NnrpTensorSection[];
}
```

---

## Web 应用集成规划

```html
<!-- 浏览器端（Preview3 规划） -->
<script type="module">
import init, { NnrpWasmClient } from "./pkg/nnrp_ffi.js";

await init();

const client = new NnrpWasmClient({ maxViews: 1 });
const session = await client.connect("https://render.example.com/nnrp");

const result = await session.submit({
    frameId: 1,
    sections: [encodedTensorSection],
    inferenceBudgetMs: 50,
});

console.log(`Inference: ${result.inferenceMs}ms, class: ${result.resultClass}`);
</script>
```

---

## 限制与注意事项

| 限制 | 说明 |
|---|---|
| 无 QUIC | 浏览器 WASM 不支持原生 QUIC，使用 WebTransport（基于 HTTP/3）或 WebSocket |
| 单线程 | WASM 默认单线程，异步推理需要 Web Workers |
| 包体大小 | Tensor 数据传输需注意 ArrayBuffer 拷贝开销 |
| TLS | 浏览器强制 HTTPS，开发环境需配置自签证书 |
