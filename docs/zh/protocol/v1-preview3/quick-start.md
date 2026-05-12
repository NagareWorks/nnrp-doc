# NNRP/1-preview3 快速上手

从宿主接入视角看，一条最小工作路径是：

1. 建立可靠字节流连接，并完成 `CLIENT_HELLO / SERVER_HELLO_ACK`。
2. 通过 `SESSION_OPEN / SESSION_OPEN_ACK` 建立某个 profile、schema 和默认预算窗口。
3. 发送 `FRAME_SUBMIT` 或其他提交类消息，把 operation 放进该 session。
4. 并行维护结果泵，持续接收 `RESULT_PUSH / RESULT_DROP / RESULT_HINT / FLOW_UPDATE`。
5. 根据 `FLOW_UPDATE` 和结果状态，决定继续提交、降速、恢复或取消。

最容易踩错的点有三类：

1. 把 NNRP 当成同步 request-response。规范宿主形态仍然是 `submit pump + result pump + control path`。
2. 把 session 当成 operation 本身。preview3 里 session 是默认上下文容器，operation 是独立生命周期对象。
3. 试图跳过 schema/profile 绑定，直接按某个语言 runtime 的私有字段解释 payload。

建议的最小宿主职责：

1. 维护一个连接级发送器和一个独立结果读取循环。
2. 为每个 session 记录默认 `profile_id / schema_id / schema_version`。
3. 能够识别 `partial / terminal / drop / stale_reuse / degraded` 等对使用者可见的结果语义。
4. 遇到 `FLOW_UPDATE` 时按 scope 更新本地发送窗口，而不是只看连接级总开关。