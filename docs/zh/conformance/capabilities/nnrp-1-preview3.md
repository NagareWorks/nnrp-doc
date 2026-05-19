# nnrp-1-preview3 能力列表

<div class="page-note">
本页对应 `nnrp-conformance/protocol/nnrp-1-preview3/mandatory-core.json`。和 Preview2 相比，Preview3 当前 baseline 更聚焦于 mandatory core，因此 token 总数更少，但每个 token 更直接代表公共协议面。
</div>

## 始终执行项

Preview3 当前有两个无 token 的 mandatory 基座检查：`header.roundtrip.basic` 与 `header.invalid_length.reject`。它们分别要求实现稳定往返公共头，以及拒绝声明长度与实际载荷长度不一致的非法包。

## 能力总览表

| Token | 覆盖层 | 状态 reach | 组合要求 | 说明 |
|---|---|---|---|---|
| `handshake.basic` | L1 | mandatory | 无 | 最小握手与能力协商流程。 |
| `session.open_close` | L1 | mandatory | 无 | 会话打开、维持与关闭状态机。 |
| `frame_submit.tensor.inline` | L1 | mandatory | 需同时声明 `result_push.basic` | 最小 inline tensor 提交路径。 |
| `result_push.basic` | L1 | mandatory | 需同时声明 `frame_submit.tensor.inline` | 与最小提交路径兼容的结果返回。 |
| `transport.quic` | L3 | optional | 无 | Preview3 QUIC 最小互通传输。 |
| `transport.tcp` | L3 | optional | 无 | Preview3 TCP 最小互通传输。 |
| `flow_update` | L1 | experimental | 无 | 尚未冻结进 mandatory core 的 flow-control 语义。 |

## 详细说明

### `handshake.basic`

这是 Preview3 mandatory core 的入口 token。声明它，意味着实现愿意对最小握手、版本确认和能力协商路径承担公共 CI 约束，而不是只在本仓库里验证“能连上”。

### `session.open_close`

该 token 关注的是状态机，而不是单一消息类型。实现需要能打开会话、维持协议状态并正确关闭，过程中不能违反 Preview3 当前冻结的状态迁移边界。

### `frame_submit.tensor.inline`

这是 Preview3 当前最小数据面提交能力。它要求实现接受 inline tensor submit 包，并能在同一公共语义口径下与结果路径完成闭环。因为该闭环天然依赖结果返回，所以它与 `result_push.basic` 成对出现。

### `result_push.basic`

该 token 表示实现具备最小结果返回能力。但在当前 baseline 里，它不是脱离提交路径独立验证的；只有与 `frame_submit.tensor.inline` 一起声明，最小 submit/result 主路径才会进入 `selected`。

### `transport.quic`

声明后，会触发 Preview3 的 QUIC optional smoke case。它覆盖的是最小互通 bring-up，而不是高级传输优化；目标是先证明不同实现至少可以在统一语义下把会话带起来。

### `transport.tcp`

它与 `transport.quic` 平行，只是底层换成 TCP。当前仍是 optional，适合那些先交付最小 TCP 路径的实现单独声明并获得额外覆盖。

### `flow_update`

Preview3 的 flow-control 语义还未并入 mandatory core，因此当前是 experimental。声明它不会形成硬 gate，但会让相关结果进入信息性报告，便于在语义冻结前持续观察实现分歧。