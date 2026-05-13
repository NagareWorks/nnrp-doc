---
prev:
  text: 快速上手
  link: /zh/protocol/v1/quick-start/
next:
  text: 传输策略与探测
  link: /zh/protocol/v1/transport-strategy/
---

# NNRP/1 会话与操作模型

当前公开版本把 connection、session、operation 三层拆开，每一层只做自己该做的事。

## 连接

连接是传输层的容器，负责消息的打包、解包与字节流收发，并同时容纳多个 session。连接级 `FLOW_UPDATE` 的效果作用在这条连接的所有会话上。

## Session

session 是默认上下文容器，负责：

1. 固定本 session 的默认 profile、schema、预算窗口、优先级类与缓存要求。
2. 让多个 operation 共享同一套默认解释上下文。
3. 成为 session-scope credit 和状态控制的基本单元。

`SESSION_OPEN` 目前是 48 字节的固定格式，`SESSION_OPEN_ACK` 是 56 字节；它们专门用来建立默认上下文，不是 operation 正文的一部分。

## Operation

operation 是实际执行单元，负责：

1. 承载一次提交对应的 payload、schema override 或 profile-local hint。
2. 接收自己的结果流、终止语义与 operation-scope `FLOW_UPDATE`。
3. 与取消、暂停、恢复、完成状态建立明确对应关系。

如果你在宿主实现里需要一个最简映射：

1. 一个连接对应一个 I/O 循环。
2. 一个 session 对应一组默认参数和信用窗口。
3. 一个 operation 对应一次用户任务、一次推理或一次帧级工作单元。