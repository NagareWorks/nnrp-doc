# Conformance 快速开始

本页给出公共 conformance baseline 的最短接入路径。

## 目标

最小接入应回答三个问题：

1. 当前仓库要对齐哪个协议版本线。
2. 当前仓库已经声明支持哪些能力。
3. 当前本地或 CI 到底跑了哪些 case，而不是模糊地“跑了一套测试”。

## 基本组成

当前公共 baseline 由以下部分组成：

1. 版本化 protocol manifest，例如 `protocol/nnrp-1-preview3/manifest.json`。
2. case manifest，例如 `cases/mandatory-core.json`。
3. capability manifest，用来声明实现当前已完成并对外声称支持的能力。
4. 机器可读 report，用来描述本次执行到底选中了哪些 case。

## 最短使用路径

1. 在实现仓库中明确当前目标协议版本，例如 `nnrp-1-preview3`。
2. 准备一份 capability manifest，声明当前实现已经完成的能力。
3. 用公共 runner 加载对应协议版本的 protocol manifest、case manifest 和 capability manifest。
4. 输出一份机器可读 report，并让 CI 基于这份 report 判断通过/失败。

## 当前开发期的硬规则

1. 不允许让 CI 靠分支名、默认分支状态或“当前最新版本”猜测目标协议版本。
2. 不允许把尚未声明支持的能力伪装成“测试通过”。
3. 不允许在实现仓库里手写一套和公共 baseline 语义不一致的私有 conformance 替代物。

## 与本地回归测试的关系

conformance 不是为了替代实现仓库自己的单元测试。

更准确地说：

1. 本地单测负责验证本仓库内部实现细节和回归。
2. 公共 conformance 负责验证当前实现是否真的符合某个公开协议版本口径。
3. 这两层都需要存在，但不能互相冒充。