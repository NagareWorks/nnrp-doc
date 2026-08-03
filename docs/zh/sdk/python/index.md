# Python SDK 概览

`nnrp-py` 是 NNRP 协议的 Python SDK。公开包保持 Python 侧 host API 稳定，同时在可用时把运行时热路径委托给随 wheel 打包的 `nnrp-rs` native artifact。

## 当前状态

| 范围 | 状态 |
|---|---|
| 核心协议类型、包头、数据包与消息构造器 | 可用 |
| 客户端与服务端 host API | 可用 |
| Native runtime facade | 通过打包的 Rust artifact 可用 |
| Native binding | 基于已打包 Rust artifact 的 ABI 4 `ctypes` facade |
| Native transport providers | TCP、QUIC、IPC、WebSocket，随 platform wheel 以 transport-scoped artifact 打包 |
| Packet transport adapters | TCP 可用，QUIC 通过 `aioquic` 可用；用于 smoke、诊断和自定义 transport |
| 缓存、schema、恢复、诊断与 session lifecycle helper | 通过 native runtime 支撑的 Python facade 可用 |
| 一致性测试 adapter 命令 | `python -m nnrp.tools.adapter_conformance` |
| 线路级一致性测试命令 | `python -m nnrp.tools.wire_conformance` 或 `nnrp-wire-conformance` |
| Benchmark 命令 | `python -m nnrp.tools.benchmark` 或 `nnrp-run-benchmark` |

## 运行时要求

- Python 3.11 或更新版本。
- 可正常使用 `pip` 或 `uv` 安装包的环境。
- 对支持的平台，wheel 会携带平台对应的 native artifact。
- Preview4 native artifact 以 transport 为粒度打包；`tcp`、`quic`、`ipc`、`websocket` provider 各自声明能力、限制和成本偏好。
- 生产包不再携带已退役的 compiled CFFI side runtime。

## Native 边界

Python facade 通过 `ctypes` 使用粗粒度 ABI 4 role call。Transport provider 各自拥有
transport-scoped Rust library，connection/session runtime 行为仍由共享 Rust role runtime
负责。生产 artifact 缺失时，Python 不会替换为纯 Python 或 CFFI side runtime。

## 目录

- [快速使用](./quick-start)
- **API 参考**：[总览](./api) · [枚举](./api/enums) · [包头与数据包](./api/packet) · [消息类型](./api/messages) · [客户端](./api/client) · [服务端](./api/server) · [运行时控制与对象](./api/runtime) · [传输与 Provider](./api/transport)
