# Rust API 概览

这一页是地图。具体方法表放在 client、server、core、FFI 和 WASM 分页里，方便使用者从自己要实现的工作流进入，而不是先读一整坨符号清单。

## Release

| 项目 | 值 |
|---|---|
| NNRP 协议线 | NNRP/1 Preview4 |
| Rust package version | `1.0.0-preview.4.17` |
| 最低 Rust 版本 | `1.82` |
| GitHub release asset tag | `v1.0.0-preview.4.17` |

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
nnrp-core = "1.0.0-preview.4.17"
nnrp-runtime = "1.0.0-preview.4.17"
nnrp-transport-provider = "1.0.0-preview.4.17"
nnrp-transport-tcp = "1.0.0-preview.4.17"
nnrp-transport-quic = "1.0.0-preview.4.17"
nnrp-transport-ipc = "1.0.0-preview.4.17"
nnrp-transport-websocket = "1.0.0-preview.4.17"

# 可选下游表面
nnrp-ffi = "1.0.0-preview.4.17"
nnrp-wasm = "1.0.0-preview.4.17"
nnrp-conformance = "1.0.0-preview.4.17"
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
| `nnrp-wasm` | 浏览器 WASM primitives 与 browser binary-frame helpers | 浏览器 artifact 是 `nnrp-wasm-browser-1.0.0-preview.4.17.zip` |

client/server runtime 这种角色包不隐藏 carrier 实现。需要哪个 transport，就安装拥有该行为的 transport 包；多个 carrier 同时可用时，再交给 provider policy 选择。

### 宿主角色边界

Rust 与其他 SDK 使用相同的宿主基数。`NnrpClient::connect` 接收一个应用 endpoint、
`ClientProviderRoutes` 和显式编译进来的 provider set；它可以评估多条 route，但最终只接管一条 carrier。
`NnrpServer::listen` 接收 `ServerProviderRoutes`，并原子持有全部 eligible listener 组成的集合；每个已接受
session 仍只接管一条 carrier。低层 provider `connect`/`listen`、`from_transport`、`from_listener` 与 native
FFI handle 保持单数，但不得替代生产宿主 API。

精确 route/security 类型见[客户端 API](./api/client)与[服务端 API](./api/server)；共享规则冻结在
[传输策略与探测](/zh/protocol/v1/transport-strategy)。

## Runtime Control 与 Object/Cache Frame

Preview4 增加了紧凑控制面事件，用于 scheduling、cancel、progress、partial result、backpressure、
capability negotiation、route hint、cache reference 和 trace context。Wire 定义见
[运行时控制 Profiles](/zh/profiles/runtime-control/)。Rust 侧通过 client event、server send/receive helper
和 core metadata 类型暴露这些能力。

## Artifact 命名

| Artifact family | 示例 |
|---|---|
| Native transport FFI | `nnrp-ffi-transport-tcp-native-linux-x86_64-1.0.0-preview.4.17.zip` |
| Native QUIC FFI | `nnrp-ffi-transport-quic-native-windows-x86_64-1.0.0-preview.4.17.zip` |
| Browser WASM | `nnrp-wasm-browser-1.0.0-preview.4.17.zip` |
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
| `TransportCandidateReadiness` | `transport_id`、`provider_id`、`route_resolved`、`security_satisfied`、可选 `diagnostic` |
| `ProbeMetrics` | `sample_count`、`success_count`、`median_throughput_bytes_per_sec`、`median_rtt_us` |
| `ProbeSample` | `transport_id`、`provider_id`、`elapsed_us`、可选 `rtt_us`、`bytes_sent`、`bytes_received`、`timed_out`、`failed` |
| `TransportProbeObservation` | `transport_id`、`provider_id`、`state`、可选 `metrics`、可选 `diagnostic`；state 只能是 `Succeeded` 或 `Failed` |
| `ProbeState` | `NotRun`、`Succeeded`、`Failed`、`Missing` |
| `TransportCandidateDiagnostic` | `transport_id`、`provider`、`local_available`、`peer_supported`、`within_limits`、`probe_state`、可选 `probe`、可选 `selection_rank`、可选 `rejection_reason`、可选 `diagnostic` |
| `TransportRejectionReason` | `PolicyDisallowed`、`LocalUnavailable`、`PeerUnsupported`、`LimitExceeded`、`RouteUnresolved`、`SecurityUnsatisfied`、`ProbeMissing`、`ProbeFailed` |
| `TransportSelection` | 选中的 descriptor 与有序 `candidates`；rank `0` 为最终选择 |
| `TransportSelectionError` | `InvalidEvidence { diagnostic }`、`ForcedTransportUnavailable { transport_id, candidates }` 或 `NoViableTransport { candidates }` |
| `TransportProviderRegistryError` | transport ID 重复或 provider ID 重复；先注册的 provider 保持不变 |

`TransportProviderDescriptor.name` 是 provider 自有的 package 名或展示名。Registry lookup、readiness、
selection、route lookup 与 reporting 使用 `transport_id`，不得从 `name` 推导 carrier 身份。

选择入口冻结为：

```rust
pub fn select_transport(
    providers: &[TransportProviderDescriptor],
    options: &TransportSelectionOptions,
) -> Result<TransportSelection, TransportSelectionError>;

pub fn select_transport_with_probe(
    providers: &[TransportProviderDescriptor],
    options: &TransportSelectionOptions,
) -> Result<TransportSelection, TransportSelectionError>;

pub fn summarize_provider_probe(
    provider: &TransportProviderDescriptor,
    samples: &[ProbeSample],
) -> Option<ProbeMetrics>;
```

`TransportProviderRegistry::register` 必须拒绝重复 transport ID 和 provider ID。
`TransportProviderRegistry::select` 与 `select_with_probe` 分别接收和对应自由函数相同的
`&TransportSelectionOptions`，并遵守相同的冻结 evidence 规则。多个可用 provider 没有匹配 observation 时统一报告 `ProbeMissing`，不得通过
实现私有的捷径排序。
`peer_supported_transports` 按集合解释；`requested_max_frame_bytes = Some(0)` 是合法请求值，不代表未提供限制。

Readiness、observation 与原始 sample 都按 `(transport_id, provider_id)` 匹配。`ProbeSample` 继续作为
`summarize_provider_probe` 的原始输入；selection 消费经过校验的聚合 observation，因此 provider probe 失败
不会与从未提供 observation 混淆。`TransportSelectionError.candidates` 使用与成功
选择相同的有序诊断模型，因此错误不得丢弃 provider 证据。

两种选择函数都必须使用[传输策略与探测](/zh/protocol/v1/transport-strategy)冻结的 comparator。公开 API 暴露结构化
metrics 与有序诊断；`ProbeScore`、`ProbeCandidateScore`、`ProbeSelection` 以及任何不透明加权 score 均不属于
Preview4 API。
