# Rust — 核心类型

`nnrp-core` 是 NNRP/1 Preview4 协议语义的 canonical Rust 来源。它拥有 wire 常量、固定布局 metadata、profile registry、runtime-control frame、object/cache metadata、校验逻辑和可复用生命周期状态机。

## Dependency

```toml
[dependencies]
nnrp-core = "1.0.0-preview.4.4"
```

## 边界

`nnrp-core` 不打开 socket，也不启动 async task。它定义并校验协议模型，供 `nnrp-runtime`、transport provider、FFI binding、WASM helper 和 conformance suite 复用。

## 主要类型族

| 类型族 | 示例 | 使用方 |
|---|---|---|
| Protocol header 与 message id | common header、message type、header flags、protocol version | 所有 wire codec |
| Session lifecycle | `SessionOpenMetadata`、`SessionCloseMetadata`、patch/migrate metadata | client/server runtime |
| Submit/result | `FrameSubmitMetadata`、`ResultPushMetadata`、result-drop metadata | request/result flow |
| Flow 与 scheduling | credit、backpressure、priority、deadline、expire-at metadata | runtime control |
| Runtime control | cancel/abort、progress、partial result、capability、route hint、trace context | Preview4 control profiles |
| Runtime object | object declare/ref/release/delta metadata | heavy transport 与 orchestration 路径 |
| Cache reference | cache reference/miss/invalidate metadata | cache-aware profile 与 runtime |
| Registry | profile id、schema id、payload family、object kind | conformance 与 SDK 校验 |

## `FrameSubmitMetadata`

| 字段组 | 说明 |
|---|---|
| Profile 与 schema | 选择解释 body 的标准或应用 profile。 |
| Operation identity | `operation_id: u64` 非零，并与公共头的 `frame_id: u32` 独立。 |
| Priority 与 deadline | 提供调度 hint，不要求额外 JSON/protobuf control envelope。 |
| Object/cache hints | 允许 transport 和 runtime 协调大 payload reference。 |

Canonical 72 字节 offset 见[数据面与 Operation 标识](/zh/protocol/v1/data-plane)。Rust 必须在
offset 32 编码 `tile_index_bytes`，在 offset 40 编码 `operation_id`。

## `ResultPushMetadata`

| 字段组 | 说明 |
|---|---|
| Correlation | 将 result bytes 关联回已提交 frame。 |
| Status 与 timing | 携带完成状态和 timing hint。 |
| Payload interpretation | 指向 result body 使用的 profile/schema。 |

## Runtime-Control Metadata

Rust metadata 名称与 [运行时控制 Profiles](/zh/profiles/runtime-control/) 中冻结的 wire profiles 对齐。

| Control family | 目的 |
|---|---|
| Cancel / abort | 停止过期或不再需要的工作。 |
| Priority / deadline / expire-at | Submit 后更新调度决策。 |
| Progress / partial result | 流式返回有意义的中间结果。 |
| Backpressure / credit | 协调生产者和消费者压力。 |
| Capability / route hint | 交换成本、偏好、限制和执行 hint。 |
| Trace context / result-drop reason | 让端到端计时和丢弃原因可解释。 |

## Object And Cache Metadata

| Family | 目的 |
|---|---|
| Object declare | 用 kind、size、version 和 lifetime hint 声明 runtime object。 |
| Object ref | 引用已有 object，而不是重新发送 bytes。 |
| Object release | 释放 ownership 或 lease state。 |
| Object delta | 对已有 object 发送紧凑更新。 |
| Cache reference | 报告可复用的 cached object。 |
| Cache miss | 报告请求的 cache key 不可用。 |
| Cache invalidate | 失效过期 object/cache state。 |

## 常见问题

::: warning
1. 不要在 SDK 本地代码重新分配 numeric message、profile、schema、object-kind 或 error value。
2. 不要把 transport 行为塞进 `nnrp-core`；使用 `nnrp-runtime` 和 provider crates。
3. 如果已经有紧凑控制帧，不要再把 Preview4 控制语义塞进临时 JSON。
:::
