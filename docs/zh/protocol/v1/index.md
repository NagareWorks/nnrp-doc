---
prev: false
next:
  text: 快速上手
  link: /zh/protocol/v1/quick-start/
---

# NNRP/1

当前对外只维护这一套公开口径。侧边栏入口旁边标注“预览”，只是说明稳定版编号尚未冻结；阅读和接入时，直接把这一页当作当前 `NNRP/1` 的版本入口即可。

如果只先记住几件事，优先记这四点：

1. `tensor` 和 `token` 是并列的标准 profile，公共层不再为某一种业务场景定制字段。
2. 连接、session、operation 三层拆开：一次实时交互不是"一发一收"，而是提交流、结果流、控制消息三条通路并行运转。
3. 传输层不写死：协议支持握手前探测路径质量，运行中也可以迁移传输，不用断连重建。
4. 公共头固定 40B，消息里带自描述长度，在 QUIC、TCP+TLS 等不同传输上都能用同一套解包逻辑。

## 当前公开口径的核心内容

### 1. 公共层不绑定具体业务

公共层只处理提交、结果、流控、状态和解释上下文——这些对所有实时 AI 任务都通用。`tensor` 和 `token` 各自的字段差异留在各自的 profile 和 schema 里，不渗透进公共协议头。这样新 profile 接入时，公共层不需要改动。

### 2. 三层执行模型与显式流控

连接、session、operation 各有自己的职责边界：连接是传输容器，session 是上下文和默认参数的载体，operation 是单次任务的生命周期单元。

流控也是协议的一部分：`FLOW_UPDATE` 可以作用在连接级、会话级或单个 operation 级，明确告诉宿主现在是降速、暂停还是恢复，而不是让每个实现自己猜测和重试。

### 3. 传输策略与会话延续

协议不绑死某种传输方式。宿主可以在握手前对多条候选路径（QUIC、TCP+TLS 等）做质量探测，然后选出更合适的一条正式建连。运行中如果网络质量变化，也可以通过 `SESSION_MIGRATE` 在不重建 session 的前提下切换传输路径。

更多细节，请继续看"传输策略与探测"页。

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
	<a href="/nnrp-doc/zh/protocol/v1/cache-and-lease/">
		<strong>缓存能力与租约</strong>
		看为什么 cache object、object reference 和 lease contract 必须是协议公共能力。
	</a>
	<a href="/nnrp-doc/zh/protocol/v1/schema-registry/">
		<strong>Schema / Profile Registry</strong>
		看为什么类型系统的扩展要走 registry，而不是继续膨胀公共枚举。
	</a>
	<a href="/nnrp-doc/zh/protocol/v1/flow-control-and-priority/">
		<strong>流控与优先级</strong>
		看为什么背压、信用和 priority 不能继续藏在 SDK 私有实现里。
	</a>
</div>
