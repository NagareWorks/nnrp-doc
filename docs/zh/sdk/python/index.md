# Python SDK 概览

`nnrp-py` 是 NNRP 协议的 Python SDK。公开包保持 Python 侧 host API 稳定，同时在可用时把运行时热路径委托给随 wheel 打包的 `nnrp-rs` native artifact。

## 当前状态

| 范围 | 状态 |
|---|---|
| 核心协议类型、包头、数据包与消息构造器 | 可用 |
| 客户端与服务端 host API | 可用 |
| Native runtime facade | 通过打包的 Rust artifact 可用 |
| Native binding 模式 | `auto`、`ctypes`、`cffi_api` |
| TCP 传输适配器 | 可用 |
| QUIC 传输适配器 | 通过 `aioquic` 可用 |
| 缓存、schema、恢复、诊断与 session lifecycle helper | 通过 native runtime 支撑的 Python facade 可用 |
| 一致性测试 adapter 命令 | `python -m nnrp.tools.adapter_conformance` |
| Benchmark 命令 | `python -m nnrp.tools.benchmark` 或 `nnrp-run-benchmark` |

## 运行时要求

- Python 3.11 或更新版本。
- 可正常使用 `pip` 或 `uv` 安装包的环境。
- 对支持的平台，wheel 会携带平台对应的 native artifact。
- 在无法构建 cffi API 扩展的本地开发环境里，可以使用 `NNRP_NATIVE_BINDING_MODE=ctypes` 强制走免编译 fallback。

## Binding 选择

默认 binding 模式是 `auto`。生产 wheel 中，`auto` 会优先选择已打包的 cffi API 快路径；如果该模块不可用，则回退到 `ctypes`。本地 editable checkout 即使没有编译工具链，也可以通过 `ctypes` 跑通测试和联调。

`NNRP_NATIVE_BINDING_MODE` 主要用于诊断和本地开发：

| 取值 | 行为 |
|---|---|
| `auto` | 优先选择最快的已打包 binding，必要时回退。 |
| `cffi_api` | 强制要求 cffi API 快路径；不可用时失败。 |
| `ctypes` | 强制使用免编译 native binding。 |

## 目录

- [快速使用](./quick-start)
- **API 参考**：[总览](./api) · [枚举](./api/enums) · [包头与数据包](./api/packet) · [消息类型](./api/messages) · [客户端](./api/client) · [服务端](./api/server) · [传输适配器](./api/transport)
