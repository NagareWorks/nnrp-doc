# NNRP/1-preview3 会话与操作模型

preview3 把连接、session、operation 三层拆开，避免不同实现继续把它们揉成一团。

## 连接

连接是 transport 级容器，负责：

1. 承载公共头、control-plane 与 data-plane 的 pack/unpack。
2. 容纳多个 session，而不是只服务单个活跃会话。
3. 作为 connection-scope `FLOW_UPDATE` 的生效边界。

## Session

session 是默认上下文容器，负责：

1. 固定本 session 的默认 profile、schema、预算窗口、优先级类与缓存要求。
2. 让多个 operation 共享同一套默认解释上下文。
3. 成为 session-scope credit 和状态控制的基本单元。

`SESSION_OPEN` 首轮固定元数据为 48B，`SESSION_OPEN_ACK` 为 56B；它们的职责是建立默认上下文，而不是塞进首个 operation 的正文。

## Operation

operation 是实际执行单元，负责：

1. 承载一次提交对应的 payload、schema override 或 profile-local hint。
2. 接收自己的结果流、终止语义与 operation-scope `FLOW_UPDATE`。
3. 与取消、暂停、恢复、完成状态建立明确对应关系。

如果你在宿主实现里需要一个最简映射：

1. 一个连接对应一个 I/O 循环。
2. 一个 session 对应一组默认参数和信用窗口。
3. 一个 operation 对应一次用户任务、一次推理或一次帧级工作单元。