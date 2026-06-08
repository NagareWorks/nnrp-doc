# 能力声明生成器

<div class="page-note">
本页提供纯前端的低代码生成器，帮助你快速拼出一致性测试声明骨架。它适合用来减少手写 JSON 的摩擦，但不会替你决定实现或 adapter 可以对外声明哪些能力。
</div>

## 协议能力声明

这个生成器面向 SDK
仓库。先选协议版本，再填写实现名，勾选已经完成且愿意对外承诺的协议能力，下方预览区就会实时生成
JSON。复制之后，建议仍然回到 [能力列表](./capabilities/) 复核 token 语义与组合要求。

能力目录来自版本化的 protocol manifest 与 case manifest。它只输出 SDK 负责维护的能力声明
结构：`implementation_name`、`protocol_version` 和 `supports`。它不会生成 adapter plan、benchmark
plan 或 case 定义。

<CapabilityManifestGenerator />

## OpenAI API Profile 能力声明

这个生成器面向提供 OpenAI-compatible NNRP API 的 adapter，例如 vLLM NNRP adapter。它输出 API profile
runner 使用的 adapter
声明：`adapter`、`profile`、`schema_version`、`compatibility_levels`、`operations` 和 `extensions`。

能力目录来自 `profiles/openai-compatible/1/manifest.json` 及其声明式 recipe manifest。生成的文件会和
profile suite manifest 一起用于选择 recipe 级测试。

<ApiProfileManifestGenerator />

## Wire 级测试目标声明

这个生成器用于一致性测试 runner 直接测试真实端点，而不是调用 SDK 自己提供的 adapter。生成的 target
manifest 会声明 runner 模式、传输端点、选中的 wire 场景以及执行限制。

它刻意独立于 SDK 能力声明和 OpenAI API Profile 能力声明。adapter manifest 适合做 recipe
选择，但 Wire 级一致性测试必须能够直接扮演 client、server 或 proxy，并交换协议帧。

<WireConformanceManifestGenerator />
