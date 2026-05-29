# nnrp-1-preview2 能力列表

<div class="page-note">
本页对应 `nnrp-conformance/protocol/nnrp-1-preview2/`。能力来源于 `l0-wire-vectors.json`、`l1-control-plane.json`、`l1-data-plane.json` 和 `l3-transport-smoke.json` 四组 case manifest。
</div>

## 始终执行项

Preview2 当前有一个无 token 的 mandatory 基座能力：`header.fixed_shape`。它来自 `l0.header.fixed_shape.golden`，因为 `required_capabilities` 为空，所以所有实现都会被检查固定 40 字节公共头的 round-trip 稳定性。

## 能力总览表

| Token | 覆盖层 | 状态 reach | 组合要求 | 说明 |
|---|---|---|---|---|
| `body_region.prelude` | L0 | mandatory | 无 | 固定 body-region prelude 的编码布局。 |
| `cache.lifecycle` | L1 | mandatory | 无 | 缓存对象的分配、确认、失效与命名空间管理。 |
| `control.client_hello` | L0 | mandatory | 无 | CLIENT_HELLO 固定元数据块。 |
| `control.session_patch_ack` | L0 | mandatory | 无 | SESSION_PATCH_ACK 固定元数据块。 |
| `flow_update` | L0 / L1 | mandatory | 无 | FLOW_UPDATE 的线缆与语义双层约束。 |
| `frame_submit.mixed` | L0 / L1 | mandatory | 需同时声明 `payload.tensor` | 混合提交模式的 FRAME_SUBMIT 主路径。 |
| `object_reference.cache` | L0 / L1 | mandatory + optional | L1 optional case 还需 `result_push.partial` | 缓存对象引用块，以及结果体中的引用解析。 |
| `payload.tensor` | L0 / L1 | mandatory 依赖项 | 常与 `frame_submit.mixed`、`result_push.partial`、`result_push.stale_reuse` 组合 | Tensor profile 主路径的依赖 token。 |
| `payload.typed` | L0 / L1 | mandatory + optional | 无 | 非 tensor typed payload 的 descriptor 与 region 打包。 |
| `result_hint` | L0 / L1 | mandatory | 无 | RESULT_HINT 的固定包体与语义验证。 |
| `result_push.degraded` | L1 | experimental | 无 | degraded/fallback 路径，目前仅信息性跟踪。 |
| `result_push.partial` | L0 / L1 | mandatory + optional | mandatory 主路径还需 `result_push.stale_reuse` 与 `payload.tensor` | 部分交付结果路径。 |
| `result_push.stale_reuse` | L0 / L1 | mandatory | 需同时声明 `result_push.partial` 与 `payload.tensor` | 旧帧复用语义。 |
| `transport.probe` | L1 / L3 | optional | 无 | 探测元数据与传输选择逻辑。 |
| `transport.quic` | L3 | optional | 无 | QUIC smoke 互通能力。 |
| `transport.tcp` | L3 | optional | 无 | TCP smoke 互通能力。 |

## 详细说明

### `body_region.prelude`

声明这个 token，意味着实现愿意对外承诺 body region prelude 的线缆布局是稳定的。Preview2 要求你能保留 inline、reference 和 typed payload 三类 region 的前导区形状，不能在字段顺序、长度编码或标志位上自定义变体。

### `cache.lifecycle`

这个 token 对应的是缓存对象生命周期，而不是单个缓存消息的“能解析”而已。声明后，你需要接受 `CACHE_PUT`、`CACHE_ACK`、`CACHE_INVALIDATE` 这条往返语义链的 mandatory 约束，并正确维护缓存命名空间与对象状态。

### `control.client_hello`

它覆盖 Preview2 CLIENT_HELLO 的固定元数据块。这里的核心不是业务协商策略，而是固定字段的 pack / parse 稳定性：版本范围、位图、缓存参数、目标 cadence 等必须以 frozen 线缆格式往返。

### `control.session_patch_ack`

它覆盖 SESSION_PATCH_ACK 的固定元数据块，包括 patch mask、拒绝原因、重试时间和生效配置。声明后，SDK 不仅要能解析，还要能按 canonical 向量重新发出同形数据。

### `flow_update`

`flow_update` 同时拉起 L0 和 L1 两层约束。L0 要求 FLOW_UPDATE 包头和元数据线缆形状稳定，L1 进一步要求 scope、retry-after、credit epoch、flags 等语义字段在 round-trip 后仍然自洽。

### `frame_submit.mixed`

这是 Preview2 提交主路径的核心 token，但它不是单独使用的。只有和 `payload.tensor` 一起声明，FRAME_SUBMIT 的 mandatory case 才会进入 `selected`，因为该路径隐含 tensor descriptor / schema / body 的稳定布局。

### `object_reference.cache`

它有两层含义。第一层是 mandatory 的 L0 对象引用块打包解析；第二层是 optional 的 L1 结果体引用解析。若你只声明 `object_reference.cache`，会选中 L0 mandatory case；如果再声明 `result_push.partial`，还会额外承担组合结果体中的引用解析检查。

### `payload.tensor`

这是 Preview2 主热路径的依赖能力，而不是一个单独的“tensor 向量页”。当前它主要服务于 `frame_submit.mixed` 和 `result_push.partial` / `result_push.stale_reuse` 组合 case，表示实现愿意对 tensor descriptor、schema 与 body 的线缆布局承担一致性责任。

### `payload.typed`

它覆盖非 tensor 的 typed payload descriptor 与 region 打包。Preview2 里它既有 mandatory 的 L0 描述符 canonical vector，也有 optional 的 L1 region / frame 保真检查，因此适合那些已经支持 token/audio/video/event 等热路径扩展的实现逐步声明。

### `result_hint`

该 token 对应 RESULT_HINT 的完整约束面。L0 检查固定线缆向量，L1 则要求理由码、固定宽度字段和 framed-message round-trip 行为都合法，不能用“能解码某些 happy path”替代完整语义一致性。

### `result_push.degraded`

这是 Preview2 里仍处于 experimental 状态的能力。声明它不会触发 mandatory gate，但会让 degraded/fallback 结果路径进入信息性报告，用于在 public surface 冻结前持续跟踪 SDK 行为。

### `result_push.partial`

它表示实现支持部分交付语义。但在当前 baseline 中，单独声明它还不够形成 Preview2 的主结果路径；mandatory 的 RESULT_PUSH case 还要求 `result_push.stale_reuse` 与 `payload.tensor` 同时存在。除此之外，它还会和 `object_reference.cache` 共同决定是否进入可选的引用解析 case。

### `result_push.stale_reuse`

这个 token 专门描述旧帧复用语义。当前 mandatory case 把它和 `result_push.partial`、`payload.tensor` 绑定在一起，因为 Preview2 的 canonical 结果向量同时覆盖 partial + stale-reuse 组合，而不是拆成彼此独立的结果面。

### `transport.probe`

它既出现在 L1 控制元数据验证，也出现在 L3 传输选择 smoke 逻辑里。声明它意味着你不仅支持探测消息的固定元数据，还接受按 success / throughput / RTT 排序的选择逻辑约束。

### `transport.quic`

该 token 只影响 L3 optional smoke case。声明后，仓库需要能完成最小 QUIC bring-up，并跑通 control + submit/result 的最短互通路径。

### `transport.tcp`

它与 `transport.quic` 相同，区别只在于目标传输是 TCP。声明后，需要接受最小 TCP 会话建立、帧边界处理和 smoke 路径互通检查。
