# Python API

Python SDK（`nnrp-py`）的公开 API 分为协议基础类型、客户端/服务端 host helper、传输适配器和 native runtime facade。

优先从 [客户端](./api/client) 或 [服务端](./api/server) 开始阅读。枚举、packet、message 和 transport 页面是参数表链接过去的参考资料。

| 分组 | 说明 | 状态 |
|---|---|---|
| [枚举与常量](./api/enums) | 消息类型、flag、payload kind、状态枚举和常量 | 稳定 |
| [包头与数据包](./api/packet) | `NnrpHeader`、`NnrpPacket`、tensor section 与序列化工具 | 稳定 |
| [消息类型](./api/messages) | 控制面/数据面消息的 metadata 类与构造函数 | 稳定 |
| [客户端](./api/client) | Client profile、session lifecycle、submit/result helper、迁移与路由 | 稳定 |
| [服务端](./api/server) | Server profile、session accept、frame receive 与 result push helper | 稳定 |
| [传输适配器](./api/transport) | TCP / QUIC 连接工厂与配置类型 | 稳定 |

## 包信息

| 属性 | 值 |
|---|---|
| Distribution | `nnrp-py` |
| 导入包名 | `nnrp` |
| 当前预览包 | `1.0.0rc3.post4` |
| 最低 Python | `3.11` |
| 运行时依赖 | `aioquic >= 1.2.0`、`cffi >= 2.0.0` |

```bash
pip install --pre "nnrp-py==1.0.0rc3.post4"
```

## Native Runtime Facade

顶层 `nnrp` 包也导出了 native runtime helper，例如 `load_native_runtime`、`load_native_client`、`probe_native_artifact`、`NativeRuntimeBackend`、`NativeRuntimeClient`、`NativeRuntimeConnection`、`NativeRuntimeSession`、`NativeSchemaCodec`、`NativeRecoveryCodec`，以及缓存、session 和诊断相关类型。

默认 binding 模式为 `auto`，会优先使用已打包的 cffi API 快路径；如果快路径不可用，则回退到 `ctypes`。本地开发需要免编译路径时设置 `NNRP_NATIVE_BINDING_MODE=ctypes`；需要强制快路径并在不可用时失败时设置 `NNRP_NATIVE_BINDING_MODE=cffi_api`。

## 工具入口

| 命令 | 用途 |
|---|---|
| `python -m nnrp.tools.adapter_conformance` | 消费 suite-owned adapter execution plan，并输出 adapter case results。 |
| `python -m nnrp.tools.benchmark` | 消费 benchmark execution plan，并输出 benchmark results。 |
| `nnrp-run-benchmark` | Benchmark runner 的 console-script 别名。 |

## Wire Format

当前只支持 NNRP/1 wire format `0`。所有 packet header 的 `wire_format` 字段都必须匹配该值，否则 parser 会抛出 `ValueError`。

## Python 侧约定

1. Async-first 方法是主要 host API 合约。
2. 同步 helper 只是同一协议语义上的便利包装。
3. 公开方法名、参数分组和返回状态对象不应在没有正式 SDK 版本变更的情况下漂移。
4. 代码块只展示用例；方法签名和参数说明应放在方法级参数表中。
