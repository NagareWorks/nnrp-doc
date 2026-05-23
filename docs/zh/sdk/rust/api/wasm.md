# Rust — WASM Primitives（Preview3）

::: tip 已实现的边界
`nnrp-rs` 当前提供 `nnrp-wasm` primitive crate：它通过 `wasm-bindgen` 暴露协议版本、transport probe scoring 和 transport selection 的低层 JSON 接口，并产出 `.wasm`、`.d.ts` 与 manifest。完整 JS/TS SDK、npm 包布局、Node native loader、浏览器 WebSocket/WebTransport adapter 由后续 `nnrp-js` 仓库负责。
:::

## 产物边界

| 场景 | 推荐路径 |
|---|---|
| Node.js 后端 | 优先探测 `nnrp_ffi.dll` / `.so` / `.dylib` native link library；不可用时回退到 `nnrp-wasm` |
| 浏览器 | 使用 `nnrp-wasm` primitives，加上 `nnrp-js` 提供的 WebSocket/WebTransport adapter |
| C#/Python/Unity | 使用 `nnrp-ffi` native package，不走浏览器 WASM 包 |

浏览器不能加载 native link library，也不能直接打开原生 TCP/UDP。浏览器侧的实际传输仍必须由 JS/TS 层使用 WebSocket 或 WebTransport 接入。

## 构建

```bash
rustup target add wasm32-unknown-unknown
python scripts/package_wasm_primitives.py --out artifacts/wasm
```

输出目录：

```text
artifacts/wasm/nnrp-wasm-primitives/
  nnrp_wasm.wasm
  nnrp_wasm.d.ts
  manifest.json
```

CI 会构建并上传 `nnrp-wasm-primitives` artifact；release 包也会包含 `artifacts/wasm/**`。

## 当前导出

```typescript
export function nnrp_wasm_protocol_major(): number;
export function nnrp_wasm_wire_format(): number;

export function selectTransportWithProbeJson(
  providersJson: string,
  remoteTransportsJson: string,
  policy: TransportPolicy,
  samplesJson: string
): string;

export function scoreProviderProbeJson(
  providerJson: string,
  policy: TransportPolicy,
  samplesJson: string
): string;
```

`selectTransportWithProbeJson` 与 `scoreProviderProbeJson` 使用 JSON 字符串作为 ABI 边界，方便 `nnrp-js` 在 Node/browser 两侧复用同一套低层 primitive。返回 JSON 中包含 selected provider、probe score、candidate scores 与 rejected candidate diagnostics。

## 策略语义

`auto`、`prefer_quic`、`prefer_tcp` 会在本地 provider、远端能力和 probe 样本之间做综合评分；不会因为 QUIC 能连通就一定选择 QUIC。`force_quic` / `force_tcp` 会在目标 provider 缺失、远端不支持或 probe 全失败时 fail-fast。

评分会综合：

- RTT / latency
- timeout 与失败率
- 有效吞吐
- 本地 policy 偏好

## 非目标

- `nnrp-wasm` 不提供 `NnrpWasmClient` / `NnrpWasmSession` 高层 API。
- `nnrp-rs` 不维护 npm package、bundler adapter、React/Vue 示例或浏览器 transport adapter。
- raw `nnrp_ffi.wasm` 不是浏览器 SDK；跨语言 C ABI 继续属于 native/FFI 路径。

## 常见坑点

::: warning
1. **浏览器不能加载 `.dll` / `.so` / `.dylib`。** Node 可以走 native addon，浏览器只能走 WASM + web transport。
2. **WASM 不等于传输实现。** WebSocket/WebTransport 连接、重连、鉴权和 fetch/worker 生命周期由 `nnrp-js` 管理。
3. **选择 QUIC/TCP 不能只看“能通”。** 生产路径应使用 probe score、失败率、远端能力和本地策略综合选择。
:::
