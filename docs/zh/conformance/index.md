# NNRP Conformance 测试套件

NNRP Conformance 测试套件是一套独立于任何单一语言 SDK
的公共协议一致性验证基线。它的作用是让不同语言、不同组织的 NNRP
实现，能够用同一套版本化标准来证明自己在协议层面是互通的。

## 这个东西是什么

随着 NNRP
的官方实现和第三方实现不断增加，一个自然的问题出现了：**怎么知道这些实现真的在说同一种协议，而不只是各自的测试通过了？**

Conformance 套件回答的就是这个问题。它由以下几个部分构成：

1. **版本化 baseline**：每条协议版本线（如 `nnrp-1-preview3`）对应一个独立的 baseline
   目录，包含协议清单、case 清单、语义向量 recipe 与生成产物。
2. **Case manifest**：机器可读的 JSON 文件，描述每个测试 case 的协议层（L0～L4）、状态（mandatory /
   optional / experimental），以及运行这个 case 所需的能力声明。
3. **Capability manifest**：每个实现仓库提供一份 JSON
   声明，列出自己当前已完成并愿意对外宣称支持的协议能力。
4. **API profile recipe**：OpenAI-compatible NNRP API 这类应用层 profile 使用可读 recipe manifest 和
   adapter capability 声明，而不是维护硬编码请求轨迹。
5. **Runner**：一个 Rust 命令行工具，加载 baseline 和 capability manifest，生成执行计划、adapter
   结果校验、API profile plan、benchmark 计划与报告。

## 为什么要有它

没有公共 conformance 基线时，三件坏事会在多实现并行阶段自然发生：

1. **各自 CI 绿，互通没人管。**
   每个仓库只跑自己的单元测试，看起来都在通，但没有任何机制能证明两个实现之间实际上能握手、能协商能力、能跑完一次正常的帧提交和结果返回。
2. **协议口径慢慢漂移。**
   在没有约束的情况下，各实现对协议细节的理解会逐渐发散。等到真正要互通时，差距已经很难修复。
3. **"测试通过"失去意义。**
   如果测试只是验证"这个实现内部自洽"，而不是"这个实现对接了协议标准"，那么测试绿色只是一种假安全感。

Conformance
套件把这三个问题都收掉：它提供一个外部的、版本化的、机器可执行的协议标准，让每个实现都能独立地对照它，而不是对照彼此。

## 能用它做什么

### 开发阶段：只跑已完成的能力

在实现过程中，你不需要等所有能力都做完才能开始跑 conformance。Capability manifest
让你声明"我现在支持哪些能力"，runner 就只跑对应的 case，未声明的能力被标记为 `not_claimed`
而不是失败。

这意味着你可以在开发的任意阶段接入 conformance，得到一个有意义的报告，而不是一个全红的噪音输出。

### CI 阶段：显式绑定协议版本口径

CI 不会猜你的实现对接的是哪个版本的协议。你在 CI 里显式传入一个 baseline（比如
`protocol/nnrp-1-preview3/manifest.json`），runner 会校验三件事：

1. Protocol manifest 的版本 = Case manifest 的版本 = Capability manifest 的版本。
2. 只有实现声明支持的能力，才能进入 mandatory/optional 执行集。
3. 版本对不上就报错退出，不允许"差不多是这个版本"的模糊状态进入合并流程。

### SDK 集成：使用 suite-owned adapter 与 benchmark 合约

SDK 仓库不需要手工维护字节 fixture。Suite 负责维护人可读的语义 recipe、生成 canonical
vector、adapter execution plan、adapter result schema、benchmark execution plan 和 benchmark result
schema。SDK 仓库只提供能力声明、adapter command，以及可选的 benchmark runner 证据。

### 第三方实现：可验证的互通承诺

如果你要做一个第三方 NNRP 实现，conformance 套件让你有办法公开说明"我的实现通过了 nnrp-1-preview3
mandatory 核心集，支持以下能力"，而不只是说"我实现了 NNRP"。

## 快速入口

<div class="doc-grid">
  <div class="doc-card">
    <h3><a href="./quick-start">快速开始</a></h3>
    <p>最小接入路径，5 分钟跑出第一份执行计划。</p>
  </div>
  <div class="doc-card">
    <h3><a href="./capability-manifest-generator">Capability Manifest 生成器</a></h3>
    <p>生成协议 capability manifest 和 OpenAI API profile adapter 声明，减少手写 JSON 的摩擦。</p>
  </div>
  <div class="doc-card">
    <h3><a href="./capabilities/">能力列表</a></h3>
    <p>按版本查看 capability token、组合要求，以及每个能力对应的 conformance 约束。</p>
  </div>
  <div class="doc-card">
    <h3><a href="./manifests">Manifest 参考</a></h3>
    <p>面向套件开发者。Protocol manifest、case manifest、向量 recipe、adapter plan、benchmark plan 与报告格式的完整字段参考。</p>
  </div>
  <div class="doc-card">
    <h3><a href="./sdk-integration">SDK 集成指南</a></h3>
    <p>面向 SDK 开发者。如何创建 capability manifest、实现 adapter command、运行 benchmark，并端到端接入 CI。</p>
  </div>
  <div class="doc-card">
    <h3><a href="./ci">CI 与版本选择</a></h3>
    <p>Conformance 版本绑定机制，以及 CI 中需要避免的错误。</p>
  </div>
</div>
