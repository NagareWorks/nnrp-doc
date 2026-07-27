# 能力声明生成器

<div class="page-note">
本页提供纯前端的低代码生成器，帮助你快速拼出一致性测试声明骨架。它适合用来减少手写 JSON 的摩擦，但不会替你决定实现或适配器可以对外声明哪些能力。
</div>

## 协议能力声明

这个生成器面向 SDK
仓库。先选协议版本，再填写实现名，勾选已经完成且愿意对外承诺的协议能力，下方预览区就会实时生成
JSON。复制之后，建议仍然回到 [能力列表](./capabilities/) 复核 token 语义与组合要求。

能力目录来自版本化的 protocol manifest 与 case manifest。它只输出 SDK 负责维护的能力声明
结构：`implementation_name`、`protocol_version` 和 `supports`。它不会生成适配器执行计划、benchmark
plan 或 case 定义。

<CapabilityManifestGenerator />

## OpenAI API 配置档能力声明

这个生成器面向提供 OpenAI-compatible NNRP API 的适配器，例如 vLLM NNRP adapter。它输出 API 配置档
测试 runner 使用的适配器
声明：`adapter`、`profile`、`schema_version`、`compatibility_levels`、`operations` 和 `extensions`。

能力目录来自 `profiles/openai-compatible/1/manifest.json` 及其声明式 recipe manifest。生成的文件会和
配置档测试套件声明一起用于选择 recipe 级测试。

<ApiProfileManifestGenerator />

## 线路级测试声明

这个生成器用于一致性测试 runner 直接测试真实端点，而不是调用 SDK 自己提供的 adapter。生成的 target
manifest 会声明测试套件模式、帧级传输端点、主机路由提供程序、选中的线路级能力以及执行限制。切换到
“主机路由场景”后，生成器会把测试套件已经冻结的 fixture 和预期证据写入场景 manifest。

主机路由 fixture 中的 `application_endpoint` 始终是 `nnrp://` 或 `nnrps://` 应用端点，每个 provider
则维护自己独立的本地 `locator`。安全声明只记录模式和凭据归属，生成的场景不会包含证书、私钥或其他密钥字节。

它刻意独立于 SDK 能力声明和 OpenAI API 配置档能力声明。适配器 manifest 适合做 recipe
选择，但线路级一致性测试必须能够直接扮演客户端、服务端或代理，并交换协议帧。

<WireConformanceManifestGenerator />
