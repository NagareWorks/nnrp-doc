# Rust SDK

`nnrp-rs` 是 NNRP/1 Preview4 的 canonical Rust 实现。它拥有 wire model、runtime control
profiles、object/cache metadata、transport provider interface、原生 FFI ABI、浏览器 WASM
primitives，以及下游 SDK 复用的一致性测试支持。

## 包地图

| Package | 边界 | 先读 |
|---|---|---|
| `nnrp-core` | 协议常量、wire codec、metadata struct、profile registry、校验、runtime-control 与 object/cache model | [核心类型](./api/core) |
| `nnrp-runtime` | transport-neutral async client/server session runtime | [客户端 API](./api/client)、[服务端 API](./api/server) |
| `nnrp-transport-provider` | provider registry、policy、probe scoring、选择逻辑 | [API 概览](./api#transport-provider-boundary) |
| `nnrp-transport-tcp` | TCP transport 实现 | [快速上手](./quick-start) |
| `nnrp-transport-quic` | Quinn/Rustls QUIC transport 实现 | [API 概览](./api#transport-provider-boundary) |
| `nnrp-transport-ipc` | Unix domain socket / Windows named pipe transport 实现 | [API 概览](./api#transport-provider-boundary) |
| `nnrp-transport-websocket` | 面向二进制 NNRP frame 的原生 Rust WebSocket transport 实现 | [API 概览](./api#transport-provider-boundary) |
| `nnrp-ffi` | C ABI 与 transport-scoped native artifact packaging | [FFI / 原生接口](./api/ffi) |
| `nnrp-wasm` | 浏览器 WASM primitives 与 TypeScript 声明 | [WASM](./api/wasm) |
| `nnrp-conformance` | Rust-backed adapter、wire conformance、benchmark helpers | [测试套件](/zh/conformance/) |

## 怎么选

| 目标 | 使用 |
|---|---|
| 构建原生 Rust client 或 server | `nnrp-runtime` 加一个或多个 `nnrp-transport-*` 包 |
| 让 runtime 在已安装 transport 中选择 | `nnrp-transport-provider` 加注册过的 TCP/QUIC/IPC/WebSocket provider |
| 绑定 Python、C#、Unity 或其他原生宿主 | `nnrp-ffi` release artifacts |
| 发布浏览器协议 primitives | `nnrp-wasm`；浏览器 transport 生命周期仍由 JS/TS SDK 负责 |
| 检查语义兼容性 | `nnrp-conformance` wire 与 adapter suite |

## 当前状态

Preview4 增加了运行时控制帧、object/cache-reference frame、IPC 与 WebSocket transport、
transport-scoped native artifact、浏览器 WASM primitives，以及 wire-level conformance 支持。Rust
runtime 仍然保持 transport-neutral：client/server session 行为在 `nnrp-runtime`，每个 transport
crate 拥有自己的网络实现。

从 [快速上手](./quick-start) 开始，再通过 [API 概览](./api) 跳到具体页面。
