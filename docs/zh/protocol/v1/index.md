---
prev: false
next:
  text: 快速上手
  link: /zh/protocol/v1/quick-start/
---

# NNRP/1

当前对外只维护这一套公开口径。侧边栏入口旁边标注“预览”，只是说明稳定版编号尚未冻结；阅读和接入时，直接把这一页当作当前 `NNRP/1` 的版本入口即可。

如果只先记住几件事，优先记这四点：

1. 公共层已经从单一业务语义里抽出来，`tensor` 与 `token` 作为并列 standard profile。
2. 连接、session、operation 三层职责被拉开，结果泵与 `FLOW_UPDATE` 成为标准接入模型。
3. 传输层不再被单一路径绑死，协议显式支持探测、选路与迁移。
4. 公共头仍保持 40B 骨架，自描述长度模型保证 transport-agnostic 拆包。

## 当前公开口径的核心内容

### 1. profile-neutral 公共层

当前公开口径里，公共层不再围绕单一神经渲染任务定制。`tensor` 与 `token` 被放到同等地位，公共层只负责表达提交、结果、流控、状态和解释上下文。

这带来两个直接结果：

1. profile 自身的差异留在 profile 与 schema 中，而不是污染公共头和控制面。
2. 协议的可复用对象从“某个具体 runtime 的私有接口”变成“多个实时 AI 任务共用的应用层协作面”。

### 2. 多层执行模型与显式流控

当前版本不再默认“发一个请求，等一个结果”。标准接入模型明确分成：

1. connection：承载 transport、公共头与多 session。
2. session：承载默认 profile、schema、预算窗口与信用边界。
3. operation：承载一次真正的提交与结果生命周期。

同时，`FLOW_UPDATE` 不再被视为实现细节，而是协议级背压与信用更新面。这样做的意义是：不同宿主、不同服务端、不同语言实现都能在同一套语义上表达降速、恢复、限额变化和局部阻塞，而不是各自发明一套私有重试逻辑。

### 3. 传输策略与会话延续

现代网络环境下，传输层选择不能再写死。当前公开口径把 transport probing、策略声明与迁移放进协议的一部分，目标不是“多加一种连接方式”，而是让协议在真实网络约束下继续稳定工作。

这项能力至少覆盖三件事：

1. 客户端可在握手前做 `TRANSPORT_PROBE / TRANSPORT_PROBE_ACK`，基于接近真实负载大小的样本做选路。
2. `CLIENT_HELLO / SERVER_HELLO_ACK` 要能表达 `transport_policy`、`preferred_transport_id` 与最终生效的 `active_transport_id`。
3. 运行中如果链路质量变化，协议允许通过 `SESSION_MIGRATE / SESSION_MIGRATE_ACK` 在不同 transport binding 之间延续同一会话。

更细的起因、行为形式和宿主视角，请继续看“传输策略与探测”页。

<div class="version-switch">
	<a href="/nnrp-doc/zh/protocol/v1/quick-start/">
		<strong>快速上手</strong>
		按当前公开版本的推荐顺序理解最小接入路径。
	</a>
	<a href="/nnrp-doc/zh/protocol/v1/operation-model/">
		<strong>会话与操作模型</strong>
		看 connection、session、operation 如何分层，以及为什么不能再把它们揉成同步调用。
	</a>
	<a href="/nnrp-doc/zh/protocol/v1/transport-strategy">
		<strong>传输策略与探测</strong>
		看为什么协议必须支持 transport probing、动态选路与会话迁移。
	</a>
</div>
