# Conformance 总览

这个栏目独立于协议页和 SDK 页，专门说明 NNRP 公共一致性测试套件如何被实现仓库消费。

需要先区分三件事：

1. 协议设计页定义 conformance 的设计边界、版本策略、分层结构和职责分工。
2. 这个栏目定义 conformance baseline 如何组织、如何声明能力、如何在本地与 CI 中运行。
3. 各语言 SDK 或 runtime 页只负责引用它，不重复定义公共 conformance 规则。

## 适合谁看

这个栏目主要面向以下读者：

1. `nnrp-rs`、`nnrp-py`、`nnrp-cs` 和 runtime 的实现者。
2. 需要把公共 baseline 接入 CI 的仓库维护者。
3. 未来想做第三方 NNRP 实现的人。

## 推荐阅读顺序

1. 先看 [快速开始](./quick-start)，了解仓库、baseline 和最小执行路径。
2. 再看 [Manifest 与报告契约](./manifests)，确认公共 JSON 产物的字段边界。
3. 最后看 [CI 与版本选择](./ci)，明确开发期和 CI 中如何只跑已声明能力，以及如何显式绑定协议版本口径。

## 与设计文档的关系

如果你还没有看过 conformance 的设计边界，先回到 [协议一致性测试套件设计](/zh/design/conformance-suite)。

这里不重复解释为什么要有 conformance，也不重复定义协议设计边界。这里回答的是另一类问题：

1. baseline 文件怎么组织。
2. case manifest、capability manifest、report 的字段语义是什么。
3. 实现仓库怎么把它接进本地开发和 CI。