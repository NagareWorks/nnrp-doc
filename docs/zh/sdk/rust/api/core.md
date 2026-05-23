# Rust — 核心类型

`nnrp-core` crate 是 Preview3 协议语义的 Rust canonical source。它包含 wire codec、固定布局 metadata、枚举/错误基线、生命周期状态机、流控校验、缓存/Schema 语义、恢复校验和操作状态。

它还不包含网络化 client/server runtime。

## Cargo.toml

```toml
[dependencies]
nnrp-core = "1.0.0-preview.2"
```

## 已实现的 Preview3 表面

| 领域 | 状态 |
|---|---|
| Common header、消息类型、header flags、协议版本 | 已实现 |
| Client/server hello、session open/ack/close、migration/probe metadata | 已实现 |
| `FRAME_SUBMIT`、`RESULT_PUSH`、`RESULT_DROP`、body region、object reference | 已实现 |
| Typed payload descriptor 与 payload-family 边界 | 已实现 |
| `FLOW_UPDATE`、result hint、priority、operation state、cancel scope | 已实现 |
| Cache put/ack/invalidate 以及 lease/version/dependency 校验 | 已实现 |
| Schema/profile registry 与 token delta schema anchor | 已实现 |
| Session-bound recovery 与 migration resume cursor 校验 | 已实现 |

## 边界

`nnrp-core` 是 host-neutral 层。它校验协议行为并暴露可复用状态机原语，但不打开 socket、不启动 async task、不 accept client，也不运行 submit/result stream。

可直接使用的 Rust `NnrpClient` / `NnrpServer` API 由 runtime shard 跟踪，应该消费这些 core 类型，而不是重新定义协议行为。

## 常见坑点

::: warning
1. **不要把 core lifecycle object 当成网络 runtime。** 它们是协议状态机，不是 socket pump。
2. **不要在 SDK 侧重新发明 retry、cache 或 schema 语义。** 下游 SDK 应消费 Rust-owned semantics。
3. **不要在不更新 conformance fixtures 的情况下修改枚举/错误/消息数值。**
:::
