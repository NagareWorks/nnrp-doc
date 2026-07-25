# Python API

Python SDK（`nnrp-py`）的公开 API 分为协议基础类型、客户端/服务端 host helper、native runtime facade、运行时控制对象和 transport provider。

优先从 [客户端](./api/client) 或 [服务端](./api/server) 开始阅读。枚举、packet、message 和 transport 页面是参数表链接过去的参考资料。

| 分组 | 说明 | 状态 |
|---|---|---|
| [枚举与常量](./api/enums) | 消息类型、flag、payload kind、状态枚举和常量 | 稳定 |
| [包头与数据包](./api/packet) | `NnrpHeader`、`NnrpPacket`、tensor section 与序列化工具 | 稳定 |
| [消息类型](./api/messages) | 控制面/数据面消息的 metadata 类与构造函数 | 稳定 |
| [客户端](./api/client) | Client profile、session lifecycle、submit/result helper、迁移与路由 | 稳定 |
| [服务端](./api/server) | Server profile、session accept、frame receive 与 result push helper | 稳定 |
| [运行时控制与对象](./api/runtime) | Preview4 control metadata、runtime object、cache reference 与 WebSocket binary frame helper | 稳定 |
| [传输与 Provider](./api/transport) | Native transport provider discovery/selection，以及 tooling 用 TCP/QUIC packet adapter | 稳定 |

## 包信息

| 属性 | 值 |
|---|---|
| Distribution | `nnrp-py` |
| 导入包名 | `nnrp` |
| 当前预览包 | `1.0.0rc4` |
| 最低 Python | `3.11` |
| 运行时依赖 | `aioquic >= 1.2.0`、`cffi >= 2.0.0` |

```bash
pip install --pre "nnrp-py==1.0.0rc4"
```

## Native Runtime Facade

顶层 `nnrp` 包也导出了 native runtime helper，例如 `load_native_runtime`、`load_native_client`、`probe_native_artifact`、`NativeRuntimeBackend`、`NativeRuntimeClient`、`NativeRuntimeConnection`、`NativeRuntimeSession`、`NativeSchemaCodec`、`NativeRecoveryCodec`，以及缓存、session 和诊断相关类型。

Preview4 wheel 使用 transport-scoped native artifact。`load_native_runtime(..., transport="tcp")`、`load_native_client(..., transport="ipc")` 这类入口会校验 artifact manifest、ABI `4.1.x`、协议版本和 transport slot。生产路径应优先使用 `nnrp.client.connect_native_client_connection("nnrps://...", provider_routes=...)`。

## Native Transport Provider

| API | 说明 |
|---|---|
| `discover_native_transport_providers()` | 扫描当前安装包内的 transport-scoped native artifacts。 |
| `select_native_transport_provider(policy_or_name)` | 在已安装 provider 中按 `auto`、`probe` 或显式名称选择。 |
| `resolve_native_transport_provider(name)` | 解析指定 provider；不存在时抛出 native artifact 错误。 |
| `diagnose_nnrp_endpoint_support(endpoint)` | 诊断应用侧 `nnrp://` / `nnrps://` endpoint 是否能映射到已安装 provider。 |
| `diagnose_native_transport_endpoint_support(endpoint)` | 诊断 provider-local endpoint，例如 `unix://`、`npipe://`、`ws://`、`wss://`。 |
| `native_transport_slot_names(mask)` | 将 native transport slot bitmask 转成名称。 |

默认 binding 模式为 `auto`，会优先使用已打包的 cffi API 快路径；如果快路径不可用，则回退到 `ctypes`。本地开发需要免编译路径时设置 `NNRP_NATIVE_BINDING_MODE=ctypes`；需要强制快路径并在不可用时失败时设置 `NNRP_NATIVE_BINDING_MODE=cffi_api`。

## 工具入口

| 命令 | 用途 |
|---|---|
| `python -m nnrp.tools.adapter_conformance` | 消费 suite-owned adapter execution plan，并输出 adapter case results。 |
| `python -m nnrp.tools.wire_conformance` | 生成 wire target manifest 或执行 suite 生成的 wire plan。 |
| `nnrp-wire-conformance` | Wire conformance runner 的 console-script 别名。 |
| `nnrp-wire-target-manifest` | Wire target manifest 生成器的 console-script 别名。 |
| `python -m nnrp.tools.benchmark` | 消费 benchmark execution plan，并输出 benchmark results。 |
| `nnrp-run-benchmark` | Benchmark runner 的 console-script 别名。 |

## Wire Format

当前只支持 NNRP/1 wire format `0`。所有 packet header 的 `wire_format` 字段都必须匹配该值，否则 parser 会抛出 `ValueError`。

## Python 侧约定

1. Async-first 方法是主要 host API 合约。
2. 同步 helper 只是同一协议语义上的便利包装。
3. 公开方法名、参数分组和返回状态对象不应在没有正式 SDK 版本变更的情况下漂移。
4. 代码块只展示用例；方法签名和参数说明应放在方法级参数表中。
