# 能力列表

<div class="page-note">
本目录记录的是每条 conformance baseline 对外暴露的 capability token。它回答的问题不是“有哪些 case”，而是“实现仓库可以在 `supports` 里声明哪些能力，以及声明后会承担什么 CI 约束”。
</div>

## 先理解三个边界

1. capability token 是实现仓库对外声明支持面的单位，不是 runner 内部实现细节，也不是 SDK 私有测试标签。
2. case 的 `feature` 与 capability token 不是一一对应关系；一个 case 可能依赖多个 token，一个 token 也可能覆盖多个 case。
3. 没有 token 的 case 仍然可能是 mandatory。它们通常表示“所有实现都必须满足的公共协议底座”，例如固定头部 round-trip 检查。

## 如何使用本目录

1. 先确定目标协议版本线，再进入对应版本页。
2. 只从该版本页复制 token 到 capability manifest 的 `supports`。
3. 如果某个 case 依赖多个 token，只有全部声明后它才会进入 `selected`。
4. 即使两个版本复用了同一个 token 名称，也不能默认它们的语义完全相同；版本页中的解释才是准绳。

## 当前已发布的能力页

<div class="version-switch">
  <a href="./nnrp-1-preview2">
    <strong>nnrp-1-preview2</strong>
    <span>覆盖 Preview2 线缆向量、控制面、数据面和传输 smoke 能力。</span>
  </a>
  <a href="./nnrp-1-preview3">
    <strong>nnrp-1-preview3</strong>
    <span>覆盖 Preview3 当前 mandatory core，以及正在演进的 optional / experimental 能力。</span>
  </a>
</div>

## 读表时要特别注意什么

| 术语 | 含义 |
|---|---|
| 始终执行项 | 对应 case 的 `required_capabilities` 为空数组 `[]`。无论实现声明什么能力，这些 case 都会进入执行集。 |
| 组合要求 | 某条 case 需要多个 token 同时声明，少一个都不会进入 `selected`。 |
| 状态 reach | 该 token 一旦声明，通常会影响哪些 `mandatory` / `optional` / `experimental` case。 |

如果你是在实现仓库里做接入，推荐先读 [SDK 集成指南](../sdk-integration)，再回来查具体 token。