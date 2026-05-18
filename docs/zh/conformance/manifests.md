# Manifest 参考 — 面向测试套件开发者

<div class="page-note">
本页面面向的是维护 conformance 套件的工程师：负责编写 protocol manifest、case manifest、语义向量 recipe 文件的人。如果你是 NNRP SDK 开发者，需要将 conformance 套件集成到自己的仓库中，请参阅 <a href="./sdk-integration">SDK 集成指南</a>。
</div>

Conformance 套件由五种 JSON 文档类型构成。每种类型在 `nnrp-conformance` 仓库的 `schemas/` 目录下均有对应的 JSON Schema 文件。本页记录每个字段的含义、合法取值范围及语义约束。

## 1. Protocol Manifest（协议清单）

**Schema 文件：** `schemas/protocol-manifest.schema.json`  
**示例文件：** `protocol/nnrp-1-preview2/manifest.json`

Protocol manifest 是一个版本化 baseline 的根入口。Runner 首先加载该文件，再凭此找到该 baseline 的所有其他产物。

### 字段参考

| 字段 | 类型 | 是否必填 | 合法取值 | 说明 |
|---|---|---|---|---|
| `$schema` | string | 否 | 任意 URI | JSON Schema 引用，供 IDE 校验用。不需要时可省略。 |
| `protocol_version` | string | **是** | 非空字符串 | 标识协议版本线，例如 `nnrp-1-preview2`、`nnrp-1-preview3`。必须与所有被引用的 case manifest 以及针对该 baseline 使用的 capability manifest 中的 `protocol_version` 完全一致。版本不一致会导致 runner 立即报错退出。 |
| `suite_version` | string | **是** | 非空字符串 | Conformance baseline 自身的版本（推荐 semver，例如 `0.1.0`）。每次 mandatory case 集发生变化时递增。 |
| `status` | string | **是** | `draft` \| `frozen` \| `deprecated` | 生命周期状态。`draft` 表示 baseline 仍在积极开发中；`frozen` 表示不再新增 mandatory case；`deprecated` 仅供历史查阅，不应用于正式 CI。 |
| `case_manifests` | string 数组 | **是** | 相对路径（至少 1 项） | Case manifest 文件路径，相对于当前文件所在目录。Runner 会加载所有列出的文件。至少需要一项。 |
| `vector_recipe_manifests` | string 数组 | 否 | 相对路径 | 语义向量 recipe 文件路径。这些是由人工维护的源文件，用于确定性地生成规范化线缆向量。若置为空数组 `[]`，表示未配置基于 recipe 的生成流程。 |
| `vector_manifests` | string 数组 | **是** | 相对路径 | 预生成的 golden vector manifest 路径。如果所有向量均由 `vector_recipe_manifests` 生成，可置为空数组 `[]`。 |
| `report_schema` | string | **是** | 相对路径 | 指向本 baseline 所使用的 report JSON Schema 文件。 |

### 示例

```json
{
  "$schema": "../../schemas/protocol-manifest.schema.json",
  "protocol_version": "nnrp-1-preview2",
  "suite_version": "0.1.0",
  "status": "draft",
  "case_manifests": [
    "cases/l0-wire-vectors.json",
    "cases/l1-control-plane.json",
    "cases/l1-data-plane.json",
    "cases/l3-transport-smoke.json"
  ],
  "vector_recipe_manifests": [
    "vectors/semantic-vectors.json"
  ],
  "vector_manifests": [],
  "report_schema": "../../schemas/report.schema.json"
}
```

::: tip `vector_recipe_manifests` 与 `vector_manifests` 的区别
`vector_recipe_manifests` 指向 runner 可以按需生成向量的语义 recipe 文件。`vector_manifests` 指向已预先生成的产物。Preview2 阶段全部使用 recipe 生成。对于已冻结的正式 baseline，可以将产物预生成并提交入库，此时 `vector_recipe_manifests` 留空。
:::

---

## 2. Case Manifest（用例清单）

**Schema 文件：** `schemas/case-manifest.schema.json`  
**示例文件：** `protocol/nnrp-1-preview2/cases/l0-wire-vectors.json`，`l1-control-plane.json` 等

Case manifest 将一组 conformance 用例归在同一个文件中管理，通常按层级（layer）或功能区域划分。一个 baseline 可以引用多个 case manifest，每个都必须声明与 protocol manifest 相同的 `protocol_version`。

### 顶层字段

| 字段 | 类型 | 是否必填 | 合法取值 | 说明 |
|---|---|---|---|---|
| `$schema` | string | 否 | 任意 URI | JSON Schema 引用。 |
| `protocol_version` | string | **是** | 非空字符串 | 必须与父级 protocol manifest 的 `protocol_version` 完全一致。 |
| `manifest_name` | string | **是** | 非空字符串 | 本用例组的短标识符，例如 `l0-wire-vectors`。Runner 输出中用于标注各条目来自哪个 case 文件。 |
| `cases` | 对象数组 | **是** | ≥0 项 | Conformance 用例定义列表。 |

### Case 对象字段

`cases` 数组的每个元素定义一条 conformance 测试。

| 字段 | 类型 | 是否必填 | 合法取值 | 说明 |
|---|---|---|---|---|
| `id` | string | **是** | 非空的稳定字符串 | 用例的全局唯一且稳定的标识符，例如 `l0.header.fixed_shape.golden`。Baseline 发布后 ID 不得变更。约定格式：`<layer>.<feature>.<variant>`。 |
| `layer` | string | **是** | `L0` \| `L1` \| `L2` \| `L3` \| `L4` | 本用例验证的协议层级。`L0` = 线缆编码；`L1` = 控制面/数据面语义；`L2` = 会话语义；`L3` = 传输语义；`L4` = 完整端到端流程。 |
| `status` | string | **是** | `mandatory` \| `optional` \| `experimental` \| `deprecated` | 用例生命周期状态。`mandatory` 用例对声明了所需能力的实现做硬约束。`optional` 用例在能力已声明时进入执行集，但失败不阻断 CI。`experimental` 和 `deprecated` 仅输出信息，不做硬约束。 |
| `feature` | string | **是** | 非空字符串 | 本用例对应的公共能力标签，例如 `header.fixed_shape`、`control.client_hello`。在报告中用作分组标签。 |
| `required_capabilities` | string 数组 | **是** | 能力 token（可为空数组） | 实现必须在 capability manifest 中声明这些能力，本用例才会进入 `selected` 执行集。空数组 `[]` 表示无论能力声明如何，本用例始终执行。 |
| `description` | string | **是** | 非空字符串 | 描述本用例验证了什么，写法面向未看过实现代码的读者。 |

### 示例

```json
{
  "$schema": "../../../schemas/case-manifest.schema.json",
  "protocol_version": "nnrp-1-preview2",
  "manifest_name": "l0-wire-vectors",
  "cases": [
    {
      "id": "l0.header.fixed_shape.golden",
      "layer": "L0",
      "status": "mandatory",
      "feature": "header.fixed_shape",
      "required_capabilities": [],
      "description": "Parse and re-emit the fixed 40-byte Preview2 common header without changing any frozen fields."
    },
    {
      "id": "l0.control.client_hello.golden",
      "layer": "L0",
      "status": "mandatory",
      "feature": "control.client_hello",
      "required_capabilities": ["control.client_hello"],
      "description": "Pack and parse the Preview2 CLIENT_HELLO fixed metadata golden vector."
    },
    {
      "id": "l0.result_push.metadata.golden",
      "layer": "L0",
      "status": "mandatory",
      "feature": "result_push.partial_stale",
      "required_capabilities": [
        "result_push.partial",
        "result_push.stale_reuse",
        "payload.tensor"
      ],
      "description": "Encode and decode the Preview2 RESULT_PUSH metadata golden vector for partial stale-reuse results."
    }
  ]
}
```

::: warning 关于空 `required_capabilities`
`required_capabilities: []` 的用例对**所有**实现无条件执行，与 capability 声明无关。仅用于通用线缆格式用例（如公共包头）。特性专属用例必须显式列出所需能力。
:::

---

## 3. 语义向量 Recipe Manifest

**Schema 文件：** `schemas/preview2-vector-recipes.schema.json`  
**示例文件：** `protocol/nnrp-1-preview2/vectors/semantic-vectors.json`

语义向量 recipe manifest 是由人工维护的源文件，描述如何确定性地生成规范化线缆向量。Runner 读取此文件，生成一份 `vector-manifest.json` 产物。SDK 测试消费该产物。

这种设计使得仓库中无需提交任何二进制或十六进制载荷文件——唯一的来源是人可读的 recipe 文件。

### 顶层字段

| 字段 | 类型 | 是否必填 | 合法取值 | 说明 |
|---|---|---|---|---|
| `$schema` | string | 否 | 任意 URI | JSON Schema 引用。 |
| `protocol_version` | string | **是** | `nnrp-1-preview2` | 必须恰好为 `nnrp-1-preview2`。本 schema 绑定版本。 |
| `vectors` | 对象数组 | **是** | ≥1 项 | 向量 recipe 条目列表。 |

### Recipe 对象字段

每个向量 recipe 描述如何构建一个规范化线缆样本。`recipe_type` 之外的字段随类型而变化，以下三个字段对所有类型通用。

| 字段 | 类型 | 是否必填 | 说明 |
|---|---|---|---|
| `recipe_type` | string | **是** | 选择对应的构建函数。合法取值及各类型所需的额外字段见下文。 |
| `name` | string | **是** | 用于在报告和 SDK 测试断言中标识本向量的稳定名称。约定格式：`<scope>.<category>.<identifier>`。 |
| `description` | string | **是** | 描述本向量代表什么的人可读说明。 |

#### `recipe_type: "header"`

构建独立公共包头 golden vector。

| 额外字段 | 类型 | 说明 |
|---|---|---|
| `version_major` | integer | `version_major` 字节值，当前为 `1`。 |
| `wire_format` | integer | `wire_format` 字节值，当前为 `0`。 |
| `message_type` | string | 消息类型名称，如 `frame_submit`、`result_push`。 |
| `flags` | string 数组 | 要置位的 flag 名称列表，如 `["ack_required", "keyframe"]`。 |
| `meta_len` | integer | 声明的元数据长度（字节）。 |
| `body_len` | integer | 声明的 body 长度（字节）。 |
| `session_id` | integer (u32) | 会话标识符。 |
| `frame_id` | integer (u32) | 帧标识符。 |
| `view_id` | integer (u16) | 视图 / 通道标识符。 |
| `route_id` | integer (u16) | 路由标识符。 |
| `trace_id` | integer (u64) | 追踪标识符。 |

#### `recipe_type: "client_hello_metadata"`

构建 CLIENT_HELLO 固定元数据 golden vector。

| 额外字段 | 类型 | 说明 |
|---|---|---|
| `min_version_major` / `max_version_major` | integer | 版本协商范围。 |
| `supported_wire_format_bitmap` | integer | 支持的 wire format 位图。 |
| `supported_profile_bitmap` | integer | 支持的载荷 profile 位图。 |
| `supported_payload_kind_bitmap` | string 数组 | 支持的载荷类型名称列表，如 `["tensor"]`。 |
| `supported_codec_bitmap` | integer | Codec 支持位图。 |
| `supported_compression_bitmap` | integer | 压缩支持位图。 |
| `supported_dtype_bitmap` | integer | 数据类型支持位图。 |
| `supported_layout_bitmap` | integer | 内存布局支持位图。 |
| `cache_digest_bitmap` | integer | 缓存摘要算法位图。 |
| `cache_object_bitmap` | integer | 支持的缓存对象类型位图。 |
| `cache_namespace_count` | integer | 声明的缓存命名空间数量。 |
| `max_lane_count` | integer | 最大并发通道数。 |
| `max_cache_entries` | integer | 最大缓存条目数。 |
| `max_cache_bytes` | integer | 最大缓存总字节数。 |
| `target_cadence_x100` | integer | 目标帧率 × 100，例如 `6000` = 60 fps。 |
| `latency_budget_ms` | integer | 延迟预算（毫秒）。 |
| `quality_tier` | integer | 请求的画质档位。 |
| `degrade_policy` | integer | 降级策略选择器。 |
| `requested_session_id` | integer | 请求的会话 ID（`0` = 由服务端分配）。 |
| `auth_bytes` | integer | 认证载荷长度（字节）。 |
| `control_extension_bytes` | integer | 控制面扩展载荷长度（字节）。 |

### 示例（节选）

```json
{
  "$schema": "../../../schemas/preview2-vector-recipes.schema.json",
  "protocol_version": "nnrp-1-preview2",
  "vectors": [
    {
      "recipe_type": "header",
      "name": "current.header.frame_submit_ack_required_keyframe",
      "description": "Preview2 common header golden vector for a FRAME_SUBMIT keyframe with ACK_REQUIRED.",
      "version_major": 1,
      "wire_format": 0,
      "message_type": "frame_submit",
      "flags": ["ack_required", "keyframe"],
      "meta_len": 48,
      "body_len": 4096,
      "session_id": 7,
      "frame_id": 11,
      "view_id": 2,
      "route_id": 0,
      "trace_id": 123456789
    }
  ]
}
```

---

## 4. 生成的 Vector Manifest（线缆向量清单）

**Schema 文件：** `schemas/vector-manifest.schema.json`  
**由以下命令生成：** `nnrp-conformance-runner generate-vectors`

这是 runner 从语义 recipe manifest 生成的**输出产物**，包含实际的十六进制编码线缆字节。SDK 测试消费此文件。套件开发者不需要手动编写该文件。

### 顶层字段

| 字段 | 类型 | 是否必填 | 合法取值 | 说明 |
|---|---|---|---|---|
| `$schema` | string | 否 | 任意 URI | JSON Schema 引用。 |
| `protocol_version` | string | **是** | 非空字符串 | 与 recipe 的 `protocol_version` 一致。 |
| `generator` | string | 否 | string | 生成该文件的工具标识，例如 `nnrp-conformance-runner`。 |
| `generated_from` | string | 否 | string | 来源 recipe 文件名，例如 `vectors/semantic-vectors.json`。 |
| `vectors` | 对象数组 | **是** | ≥1 项 | 已生成的线缆向量列表。 |

### Vector 对象字段

| 字段 | 类型 | 是否必填 | 说明 |
|---|---|---|---|
| `name` | string | **是** | 与来源 recipe 的 `name` 字段一致的稳定名称。SDK 测试用此名称做断言映射。 |
| `kind` | string | **是** | 向量类别，例如 `header`、`client_hello_metadata`。对应来源 recipe 的 `recipe_type`。 |
| `hex` | string | **是** | 规范化线缆字节的小写十六进制编码，无分隔符。 |
| `bytes` | integer | **是** | 规范化线缆编码的字节长度，必须等于 `len(hex) / 2`。 |
| `description` | string | **是** | 从来源 recipe 复制而来。 |

### 示例（节选）

```json
{
  "protocol_version": "nnrp-1-preview2",
  "generator": "nnrp-conformance-runner",
  "generated_from": "vectors/semantic-vectors.json",
  "vectors": [
    {
      "name": "current.header.frame_submit_ack_required_keyframe",
      "kind": "header",
      "hex": "4e4e5250010003280000003000001000000000070000000b000200007b000000000000000000000000000000",
      "bytes": 40,
      "description": "Preview2 common header golden vector for a FRAME_SUBMIT keyframe with ACK_REQUIRED."
    }
  ]
}
```

---

## 5. Conformance Report（合规报告）

**Schema 文件：** `schemas/report.schema.json`  
**由以下命令生成：** `nnrp-conformance-runner summary`

Report 是一次 conformance 执行的机器可读输出。套件开发者通过它了解覆盖状况；CI 用它对 mandatory 用例做硬约束。

::: tip report 不是 capability manifest
Capability manifest 是实现方手写输入，核心字段是 `implementation_name`、`protocol_version` 和 `supports`。Report 是 runner 基于 protocol manifest、case manifest 与 capability manifest 计算出的输出，不能复用 `example-capabilities.json` 之类的命名。
:::

### 顶层字段

| 字段 | 类型 | 是否必填 | 说明 |
|---|---|---|---|
| `protocol_version` | string | **是** | 与 protocol manifest 的 `protocol_version` 一致。 |
| `implementation_name` | string | **是** | 从 capability manifest 复制而来。 |
| `summary` | object | **是** | 汇总统计（见下文）。 |
| `cases` | 对象数组 | **是** | 各用例的选择结果。 |

### Summary 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `selected_cases` | integer ≥ 0 | 进入执行集的用例数（实现已声明所有所需能力）。CI 对这些用例做硬约束。 |
| `not_claimed_cases` | integer ≥ 0 | 至少有一个所需能力未被声明的用例数。不计为失败。 |
| `informational_cases` | integer ≥ 0 | 状态为 `experimental` 或 `deprecated` 的用例数。仅输出信息，不做约束。 |

### Case 结果字段

| 字段 | 类型 | 合法取值 | 说明 |
|---|---|---|---|
| `id` | string | — | 来自 case manifest 的用例标识符。 |
| `feature` | string | — | 可选的公共能力标签，便于报告阅读与分组。 |
| `status` | string | `mandatory` \| `optional` \| `experimental` \| `deprecated` | 可选的用例状态回显。 |
| `selection` | string | `selected` \| `not_claimed` \| `informational` | Runner 针对给定 capability manifest 对本用例的分类结果。 |

---

## 什么不应被冻结

本页所描述的 JSON 边界是对外冻结的内容。以下内容**不在冻结范围**：

1. `nnrp-conformance-fixtures` 或 `nnrp-conformance-runner` 内部的 Rust 类型布局。
2. SDK adapter 内部的 Python 或 C# 对象树。
3. Runner 执行期间的中间内存状态。

Schema 字段语义只能在新协议版本线或新 `suite_version` 时发生变化。