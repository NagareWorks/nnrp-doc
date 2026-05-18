# CI 与版本选择

本页定义 conformance 在开发期和 CI 中的执行规则。

## 1. 开发期如何只匹配已完成能力

开发阶段不应“全量跑所有 case”，也不应“随缘挑一些能过的 case”。

正确做法是：

1. 实现仓库显式提供 capability manifest。
2. runner 根据 case manifest 中的 `required_capabilities` 进行选择。
3. `mandatory` 和 `optional` case 只有在能力已声明时才进入 `selected`。
4. 未声明能力进入 `not_claimed`，而不是伪装成通过。
5. `experimental` 和 `deprecated` 默认只进入信息输出，不直接作为硬 gate。

这样做的结果是：

1. 开发团队可以先冻结小范围能力，再逐步扩展。
2. CI 报告能清楚说明“没做”与“做了但失败”是两回事。

## 2. CI 如何知道对接的是哪个协议版本口径

CI 不允许靠仓库当前状态推断协议版本。

CI 必须显式选择一个 protocol manifest，例如：

1. `protocol/nnrp-1-preview3/manifest.json`
2. 后续某条 Preview4 或正式版本线的 protocol manifest

然后 runner 至少要验证三件事：

1. protocol manifest 的 `protocol_version`
2. case manifest 的 `protocol_version`
3. capability manifest 的 `protocol_version`

三者不一致时，CI 应直接失败，而不是继续猜测“哪个才是当前正确版本”。

## 3. 推荐的 CI 执行链

最小推荐链路如下：

1. 选定 protocol manifest。
2. 选定要消费的 case manifest。
3. 加载实现仓库的 capability manifest。
4. 生成 execution plan 或 report。
5. 对 `selected` 的 mandatory case 做硬 gate。
6. 对 `not_claimed` 和 `informational` 做分类输出。

## 4. 需要避免的错误

以下做法都不应进入正式流程：

1. 让 CI 默认跑“当前最新 baseline”。
2. 在实现仓库里通过修改本地 adapter 绕过公共 mandatory case。
3. 用一份只在本仓库里存在的私有测试，替代公共 conformance baseline。
4. 在没有 capability 声明的前提下，把未完成能力默认为通过。

## 5. 当前结论

开发期的目标不是“所有 case 都已经做完”，而是“当前仓库明确知道自己宣称支持哪些能力，并且只对这些能力承担硬门禁”。

CI 的目标也不是“猜出你可能在对哪一版协议”，而是“显式绑定一条版本线，并验证所有输入契约都一致”。