# Manifest 与报告契约

本页定义 conformance 栏目下的公共 JSON 契约边界。

## 1. Protocol Manifest

protocol manifest 描述一个版本化 baseline 的入口。

最少应包含：

1. `protocol_version`：例如 `nnrp-1-preview3`。
2. `suite_version`：当前 conformance baseline 自身的版本。
3. `status`：例如 `draft`、`frozen`、`deprecated`。
4. `case_manifests`：当前 baseline 关联的 case manifest 列表。
5. `vector_manifests`：当前 baseline 关联的 golden vector 或其他向量入口。
6. `report_schema`：本版本 report 应遵循的 schema。

它解决的问题是：

1. 当前选中的到底是哪一条协议版本线。
2. 当前 baseline 由哪些公共产物组成。

## 2. Case Manifest

case manifest 负责定义一组 conformance case。

每个 case 至少应带这些字段：

1. `id`：稳定的 case 标识。
2. `layer`：例如 `L0` 到 `L4`。
3. `status`：`mandatory`、`optional`、`experimental`、`deprecated`。
4. `feature`：当前 case 对应的公共能力标签。
5. `required_capabilities`：实现若想运行该 case，必须先声明支持的能力。
6. `description`：当前 case 的公共语义描述。

关键点不是字段多不多，而是每个 case 都必须有明确的版本、层级和能力边界。

## 3. Capability Manifest

capability manifest 由实现仓库提供，用来声明“当前仓库已经做完并愿意对外声称支持什么”。

最少应包含：

1. `implementation_name`
2. `protocol_version`
3. `supports`

`supports` 里的每一项都代表一条实现方显式宣称的能力。

这份文件的意义是：

1. 开发阶段只对已声明能力做硬约束。
2. 未声明能力不会被误判成“通过”。
3. CI 可以明确区分 `selected`、`not_claimed` 和 `informational`。

## 4. Report

report 是一次 conformance 执行的机器可读输出。

最少应包含：

1. `protocol_version`
2. `implementation_name`
3. `summary`
4. `cases`

其中 `summary` 至少应统计：

1. `selected_cases`
2. `not_claimed_cases`
3. `informational_cases`

而 `cases` 至少应记录：

1. 当前 case 的 `id`
2. 当前 case 的选择结果，例如 `selected`、`not_claimed`、`informational`

## 5. 不应冻结什么

公共 JSON 契约应冻结字段语义，而不是冻结某个 Rust、Python 或 C# 的内部类型结构。

因此：

1. 对外冻结的是 manifest 和 report 的 JSON 边界。
2. `nnrp-conformance` 仓库内部 Rust 类型可以演进。
3. 各语言 adapter 的内部对象树也可以演进，只要它们不改变公共 JSON 语义。