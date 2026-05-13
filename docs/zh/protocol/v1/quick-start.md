---
prev:
  text: NNRP/1
  link: /zh/protocol/v1/
next:
  text: 会话与操作模型
  link: /zh/protocol/v1/operation-model/
---

# NNRP/1 快速上手

从宿主接入视角看，一条最小工作路径是：

1. 建立可靠字节流连接，并完成 `CLIENT_HELLO / SERVER_HELLO_ACK`。
2. 通过 `SESSION_OPEN / SESSION_OPEN_ACK` 建立某个 profile、schema 和默认预算窗口。
3. 发送 `FRAME_SUBMIT` 或其他提交类消息，把 operation 放进该 session。
4. 并行维护结果泵，持续接收 `RESULT_PUSH / RESULT_DROP / RESULT_HINT / FLOW_UPDATE`。
5. 根据 `FLOW_UPDATE` 和结果状态，决定继续提交、降速、恢复或取消。

最容易踩错的点有三类：

1. **把 NNRP 当成同步接口**：正确的接入方式是三条通路并行——一个循环持续发送任务，一个循环持续读取结果，一条通路处理 `FLOW_UPDATE` 等控制消息。
2. **把 session 和 operation 混用**：session 是持续的上下文容器（类似"会话"），operation 是其中的单次任务。session 建立一次，operation 可以反复提交。
3. **跳过 profile/schema 直接解读 payload**：payload 的字段含义由 profile 和 schema 定义，不同实现的字段布局不一定相同，直接硬猜偏移是不可靠的。

最小宿主实现至少要做到：

1. 独立维护一个发送循环和一个结果读取循环，两者不相互阻塞。
2. 为每个 session 记录 `profile_id / schema_id / schema_version`，以备 schema mismatch 时快速定位。
3. 正确区分结果类型：`partial`（中间帧，可以展示）、`terminal`（最终帧）、`drop`（被丢弃）、`degraded`（降级输出）。
4. 收到 `FLOW_UPDATE` 时，按其 scope（连接级或会话级）更新发送速率，而不是只盯着连接总开关。