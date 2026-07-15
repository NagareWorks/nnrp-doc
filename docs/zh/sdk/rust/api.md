# Rust API 概览

这一页是地图。具体方法表放在 client、server、core、FFI 和 WASM 分页里，方便使用者从自己要实现的工作流进入，而不是先读一整坨符号清单。

## Release

| 项目 | 值 |
|---|---|
| NNRP 协议线 | NNRP/1 Preview4 |
| Rust package version | `1.0.0-preview.4.4` |
| 最低 Rust 版本 | `1.82` |
| GitHub release asset tag | `v1.0.0-preview.4.4` |

## API 区域

| 区域 | Package | 拥有内容 | 页面 |
|---|---|---|---|
| 核心协议模型 | `nnrp-core` | Wire codec、metadata、profiles、runtime-control、object/cache、校验 | [核心类型](./api/core) |
| 客户端 runtime | `nnrp-runtime` | connect、open session、submit、receive events、control requests、close | [客户端 API](./api/client) |
| 服务端 runtime | `nnrp-runtime` | bind、accept、receive submit/control、send result/progress/object/cache events | [服务端 API](./api/server) |
| Transport providers | `nnrp-transport-provider`、`nnrp-transport-*` | Registry、probe policy、TCP/QUIC/IPC/WebSocket 真实传输实现 | [Transport Provider 边界](#transport-provider-boundary) |
| 原生 ABI | `nnrp-ffi` | C ABI、handle/event model、native artifact manifest | [FFI / 原生接口](./api/ffi) |
| 浏览器 primitives | `nnrp-wasm` | WASM protocol helpers、browser binary-frame helpers、`.d.ts` 输出 | [WASM](./api/wasm) |

## Cargo

```toml
[dependencies]
nnrp-core = "1.0.0-preview.4.4"
nnrp-runtime = "1.0.0-preview.4.4"
nnrp-transport-provider = "1.0.0-preview.4.4"
nnrp-transport-tcp = "1.0.0-preview.4.4"
nnrp-transport-quic = "1.0.0-preview.4.4"
nnrp-transport-ipc = "1.0.0-preview.4.4"
nnrp-transport-websocket = "1.0.0-preview.4.4"

# 可选下游表面
nnrp-ffi = "1.0.0-preview.4.4"
nnrp-wasm = "1.0.0-preview.4.4"
nnrp-conformance = "1.0.0-preview.4.4"
```

## Transport Provider 边界

Runtime 只通过 framed transport traits 看 transport。Rust SDK 里的 transport 沿用 NNRP 的定义：它是
NNRP wire protocol 下方的帧承载边界，不是在声明 OSI 网络分层。具体 carrier 行为归 provider 包所有。

| Package | 拥有内容 | Native / WASM artifact 边界 |
|---|---|---|
| `nnrp-transport-tcp` | TCP connect/bind 与 TCP probe identity | Native FFI transport artifact 以 TCP 为粒度发布 |
| `nnrp-transport-quic` | Quinn/Rustls QUIC connect/bind 与 QUIC probe identity | Native FFI transport artifact 以 QUIC 为粒度发布 |
| `nnrp-transport-ipc` | 本地 IPC endpoint：Unix domain socket 与 Windows named pipe | Native FFI transport artifact 以 IPC 为粒度发布 |
| `nnrp-transport-websocket` | 原生 Rust WebSocket binary-frame carrier | Native FFI transport artifact 以 WebSocket 为粒度发布 |
| `nnrp-wasm` | 浏览器 WASM primitives 与 browser binary-frame helpers | 浏览器 artifact 是 `nnrp-wasm-browser-1.0.0-preview.4.4.zip` |

client/server runtime 这种角色包不隐藏 carrier 实现。需要哪个 transport，就安装拥有该行为的 transport 包；多个 carrier 同时可用时，再交给 provider policy 选择。

## Runtime Control 与 Object/Cache Frame

Preview4 增加了紧凑控制面事件，用于 scheduling、cancel、progress、partial result、backpressure、
capability negotiation、route hint、cache reference 和 trace context。Wire 定义见
[运行时控制 Profiles](/zh/profiles/runtime-control/)。Rust 侧通过 client event、server send/receive helper
和 core metadata 类型暴露这些能力。

## Artifact 命名

| Artifact family | 示例 |
|---|---|
| Native transport FFI | `nnrp-ffi-transport-tcp-native-linux-x86_64-1.0.0-preview.4.4.zip` |
| Native QUIC FFI | `nnrp-ffi-transport-quic-native-windows-x86_64-1.0.0-preview.4.4.zip` |
| Browser WASM | `nnrp-wasm-browser-1.0.0-preview.4.4.zip` |
| Checksums | `SHA256SUMS` |

下游 SDK 加载 native library 或 WASM 文件前，应先校验 artifact manifest。

## Transport Provider 公共 API

Rust SDK 是冻结选路契约的一等实现，不只是其他语言的产物后端。`nnrp-transport-provider` 精确公开以下类型：

| 类型 | 冻结字段 |
|---|---|
| `ProviderCost` | `model_id: u16`、`units: u64` |
| `ProviderLimits` | `max_frame_bytes: u64` |
| `ProviderLimitation` | `RequiresUdp`、`RequiresTcp`、`LocalHostOnly`、`NativeHostOnly`、`BrowserHostOnly`、`UnixDomainSocket`、`WindowsNamedPipe` |
| `TransportProviderMetadata` | `id`、`cost`、`preference_rank`、`limits`、`limitations` |
| `TransportProviderDescriptor` | `name`、`version`、`transport_id`、`kind`、`available`、可选 `library_path`、`metadata`、可选 `diagnostic` |
| `ProbeMetrics` | `sample_count`、`success_count`、`median_throughput_bytes_per_sec`、`median_rtt_us` |
| `ProbeSample` | `transport_id`、`provider_id`、`elapsed_us`、可选 `rtt_us`、`bytes_sent`、`bytes_received`、`timed_out`、`failed` |
| `ProbeState` | `NotRun`、`Succeeded`、`Failed`、`Missing` |
| `TransportCandidateDiagnostic` | `transport_id`、`provider`、`local_available`、`peer_supported`、`within_limits`、`probe_state`、可选 `probe`、可选 `selection_rank`、可选 `rejection_reason`、可选 `diagnostic` |
| `TransportRejectionReason` | `PolicyDisallowed`、`LocalUnavailable`、`PeerUnsupported`、`LimitExceeded`、`ProbeMissing`、`ProbeFailed` |
| `TransportSelection` | 选中的 descriptor 与有序 `candidates`；rank `0` 为最终选择 |
| `TransportSelectionError` | `ForcedTransportUnavailable { transport_id, candidates }` 或 `NoViableTransport { candidates }` |

选择入口冻结为：

```rust
pub fn select_transport(
    providers: &[TransportProviderDescriptor],
    remote: &RemoteTransportSupport,
    policy: TransportPolicy,
    requested_max_frame_bytes: Option<u64>,
) -> Result<TransportSelection, TransportSelectionError>;

pub fn select_transport_with_probe(
    providers: &[TransportProviderDescriptor],
    remote: &RemoteTransportSupport,
    policy: TransportPolicy,
    requested_max_frame_bytes: Option<u64>,
    samples: &[ProbeSample],
) -> Result<TransportSelection, TransportSelectionError>;

pub fn summarize_provider_probe(
    provider: &TransportProviderDescriptor,
    samples: &[ProbeSample],
) -> Option<ProbeMetrics>;
```

`TransportProviderRegistry::select` 在 `&self` 之后采用与 `select_transport` 相同的参数，并且只有在筛选后仅剩
一个可用 provider 时成功。`TransportProviderRegistry::select_with_probe` 在 `&self` 之后采用与
`select_transport_with_probe` 相同的参数。多个可用 provider 没有 samples 时统一报告 `ProbeMissing`，不得通过
实现私有的捷径排序。

`ProbeSample.provider_id` 与 `TransportProviderMetadata.id` 匹配。`TransportSelectionError.candidates` 使用与成功
选择相同的有序诊断模型，因此错误不得丢弃 provider 证据。

两种选择函数都必须使用[传输策略与探测](/zh/protocol/v1/transport-strategy)冻结的 comparator。公开 API 暴露结构化
metrics 与有序诊断；`ProbeScore`、`ProbeCandidateScore`、`ProbeSelection` 以及任何不透明加权 score 均不属于
Preview4 API。
