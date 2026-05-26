# 文档总览

你在这里首先看到的，应该是：NNRP 是什么、解决什么问题、适合哪些实时场景、核心对象和报文骨架是什么。

1. 先讲全局概念与使用边界。
2. 再讲核心对象、常见流程和稳定报文骨架。
3. 最后才进入具体版本入口和版本范围。

<div class="doc-grid">
	<div class="doc-card">
		<h3>先看全局概念</h3>
		<p>从协议背景、使用场景、核心对象和公共头入手，而不是直接扎进某个 preview 的冻结细节。</p>
	</div>
	<div class="doc-card">
		<h3>版本入口</h3>
		<p>从“版本入口”和当前公开的 NNRP/1 入口查看版本边界与当前能力面。</p>
	</div>
	<div class="doc-card">
		<h3>协议设计</h3>
		<p>需要看各预览版的冻结范围、设计取舍和详细方案时，直接进入协议设计页。</p>
	</div>
	<div class="doc-card">
		<h3>SDK 控制面</h3>
		<p>当你需要冻结的控制面接口、多语言入口和部署接入说明时，进入独立的 SDK 视图。</p>
	</div>
	<div class="doc-card">
		<h3>Conformance</h3>
		<p>当你需要公共一致性测试套件的接入方式、manifest 契约和 CI 版本选择规则时，进入独立的 conformance 视图。</p>
	</div>
</div>

推荐阅读顺序：

1. 先看 [协议背景与介绍](/zh/background) 和 [常见场景与边界](/zh/use-cases)。
2. 再看 [核心对象与流程](/zh/core-concepts)、[标准 Profile](/zh/profiles/) 和 [公共头](/zh/common-header/)。
3. 最后进入 [版本入口](/zh/protocol/) 和 [NNRP/1（预览）](/zh/protocol/v1/)。

如果你是通过语言 SDK 接入，请从 [SDK 总览](/zh/sdk/) 开始。

如果你是在实现仓库里接入公共一致性测试套件，请从 [Conformance 总览](/zh/conformance/) 开始。
