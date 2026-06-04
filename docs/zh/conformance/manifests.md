# Manifest 参考 — 面向测试套件开发者

<div class="page-note">
本页面向维护 conformance 套件的工程师。SDK 作者通常应先阅读 <a href="./sdk-integration">SDK 集成指南</a>。
</div>

Conformance 套件由一组带 JSON Schema 的机器可读文档构成，schema 位于 `nnrp-conformance/schemas/`
目录。人工维护的文件应保持可读、参数化；字节级产物应由工具生成，而不是手写维护。

## 文档类型

| 文档                            | Schema                                   | 维护方        | 用途                                                              |
| ------------------------------- | ---------------------------------------- | ------------- | ----------------------------------------------------------------- |
| Protocol manifest               | `protocol-manifest.schema.json`          | Suite         | 某条协议版本线的根入口。                                          |
| Case manifest                   | `case-manifest.schema.json`              | Suite         | 声明 case、层级、状态和所需 capability token。                    |
| Capability manifest             | `capability-manifest.schema.json`        | SDK           | 声明实现名、目标协议版本线和支持能力 token。                      |
| Semantic vector recipes         | `semantic-vector-recipes.schema.json`    | Suite         | Canonical vector 的人可读来源。                                   |
| Generated vector manifest       | `vector-manifest.schema.json`            | Suite tooling | SDK 测试消费的已生成字节产物。                                    |
| Conformance report              | `report.schema.json`                     | Runner        | 针对某份 capability manifest 的 case 选择报告。                   |
| Adapter execution plan          | `adapter-execution-plan.schema.json`     | Runner/action | 传给 SDK adapter command 的动态行为用例。                         |
| Adapter case results            | `adapter-case-results.schema.json`       | SDK adapter   | Adapter plan 的机器可读 pass/fail/skip 结果。                     |
| Benchmark execution plan        | `benchmark-execution-plan.schema.json`   | Runner/action | 传给 SDK benchmark command 的 benchmark 场景。                    |
| Benchmark results               | `benchmark-results.schema.json`          | SDK benchmark | 延迟、吞吐、分配等指标与证据路径。                                |
| API profile suite manifest      | `api-profile-suite.schema.json`          | Suite         | 某个应用层 API 兼容 profile 的根入口。                            |
| API profile recipe              | `api-profile-recipe.schema.json`         | Suite         | API 级兼容用例的人可读请求与期望来源。                            |
| API profile capability manifest | `api-profile-capabilities.schema.json`   | Adapter       | 声明 adapter、profile level、支持的 operation 与可选 API 扩展。   |
| API profile execution plan      | `api-profile-execution-plan.schema.json` | Runner/action | 针对 adapter capability manifest 选出的 profile recipe 执行计划。 |
| API profile results             | `api-profile-results.schema.json`        | Adapter       | API profile recipe 的机器可读 pass/fail/skip 结果。               |

## Protocol Manifest

**示例：** `protocol/nnrp-1-preview3/manifest.json`

Protocol manifest 是版本化 baseline 的根入口，绑定协议版本线、suite 版本、生命周期状态、case
manifest、向量 recipe、生成向量 manifest 和 report schema。

```json
{
  "$schema": "../../schemas/protocol-manifest.schema.json",
  "protocol_version": "nnrp-1-preview3",
  "suite_version": "0.1.0",
  "status": "draft",
  "case_manifests": [
    "cases/mandatory-core.json",
    "cases/l0-wire-vectors.json",
    "cases/l0-wire-errors.json",
    "cases/l1-control-plane.json",
    "cases/l1-session-container.json",
    "cases/l1-data-plane.json",
    "cases/l1-schema-cache.json",
    "cases/l2-binding-driver.json"
  ],
  "vector_recipe_manifests": [
    "vectors/semantic-vectors.json"
  ],
  "vector_manifests": [],
  "report_schema": "../../schemas/report.schema.json"
}
```

Protocol manifest、case manifest、capability manifest、adapter plan 和结果文档中的版本字段必须一致。

## Case Manifest

**示例：** `protocol/nnrp-1-preview3/cases/mandatory-core.json`

Case manifest 按层级或功能区域组织测试用例。`required_capabilities: []`
的用例会对所有实现无条件选择；特性专属用例必须列出用于选择它的 token。

```json
{
  "$schema": "../../../schemas/case-manifest.schema.json",
  "protocol_version": "nnrp-1-preview3",
  "manifest_name": "mandatory-core",
  "cases": [
    {
      "id": "l0.header.roundtrip.basic",
      "layer": "L0",
      "status": "mandatory",
      "feature": "header.roundtrip.basic",
      "required_capabilities": [],
      "description": "Round-trip the current common header without changing frozen fields."
    },
    {
      "id": "l1.handshake.basic",
      "layer": "L1",
      "status": "mandatory",
      "feature": "handshake.basic",
      "required_capabilities": ["handshake.basic"],
      "description": "Complete the minimum client/server handshake and capability negotiation."
    }
  ]
}
```

## Semantic Vector Recipe

**示例：** `protocol/nnrp-1-preview3/vectors/semantic-vectors.json`

Recipe 文件是 canonical vector 的人工维护来源。它们使用 message type、flags、length、session
id、frame id 和 trace id 等可读字段描述意图。不要在 source recipe 里手工维护大段十六进制字符串。

```json
{
  "$schema": "../../../schemas/semantic-vector-recipes.schema.json",
  "protocol_version": "nnrp-1-preview3",
  "vectors": [
    {
      "recipe_type": "header",
      "name": "current.header.ping_can_drop",
      "description": "Common header for a PING frame that may be dropped.",
      "version_major": 1,
      "wire_format": 0,
      "message_type": "ping",
      "flags": ["can_drop"],
      "meta_len": 0,
      "body_len": 0,
      "session_id": 7,
      "frame_id": 11,
      "view_id": 0,
      "route_id": 0,
      "trace_id": 19
    }
  ]
}
```

生成的 vector manifest 包含编码后的字节，由以下命令产生：

```bash
nnrp-conformance-runner generate-vectors \
  --recipe protocol/nnrp-1-preview3/vectors/semantic-vectors.json \
  --output /tmp/canonical-vectors.json
```

使用 `verify-vectors` 校验生成字节是否保持确定性。

## Capability Manifest

Capability manifest 是实现方维护的输入，只包含身份、协议版本和能力 token。

```json
{
  "$schema": "../../schemas/capability-manifest.schema.json",
  "implementation_name": "nnrp-py",
  "protocol_version": "nnrp-1-preview3",
  "supports": [
    "handshake.basic",
    "session.open_close",
    "frame_submit.tensor.inline",
    "result_push.basic"
  ]
}
```

本站的低代码生成器会读取版本化 case manifest 并输出这种结构，但它不会替实现决定哪些 token 可以声明。

## API Profile Suite Manifest

**示例：** `profiles/openai-compatible/1/manifest.json`

API profile suite manifest 把应用层兼容 profile 从线缆协议 baseline
中单独冻结出来。OpenAI-compatible profile 会绑定 profile 名、schema 版本、兼容等级、可运行的协议
baseline，以及定义测试面的声明式 recipe manifest。

```json
{
  "$schema": "../../../schemas/api-profile-suite.schema.json",
  "profile": "openai-compatible",
  "schema_version": "openai-compatible/1",
  "level": 1,
  "protocol_baselines": ["nnrp-1-preview3"],
  "recipe_manifests": [
    "recipes/chat-streaming-text.json",
    "recipes/chat-non-streaming.json"
  ]
}
```

这个文档是 profile 自己的入口，不是 SDK capability manifest，也不是 protocol case manifest。

## API Profile Recipe

API profile recipe 是可读的请求与期望文件。它不维护硬编码字节 fixture，而是用 operation
名称、请求体、期望事件和终止结果描述 API 行为。

```json
{
  "$schema": "../../../../schemas/api-profile-recipe.schema.json",
  "id": "openai-compatible.chat.streaming-text",
  "profile": "openai-compatible",
  "schema_version": "openai-compatible/1",
  "operation": "chat.completions.create",
  "required_capabilities": [
    "api.level1",
    "api.chat.completions.create",
    "api.streaming"
  ],
  "status": "mandatory",
  "request": {
    "body": {
      "model": "${MODEL_ID}",
      "messages": [{ "role": "user", "content": "Say hello." }],
      "stream": true
    }
  },
  "expect": {
    "events": [{ "type": "response.output_text.delta", "min_count": 1 }],
    "terminal": "success"
  }
}
```

## API Profile Capability Manifest

Adapter 提供 API profile capability manifest，用来声明自己支持的 profile level 和 operation
特性。本站低代码生成器可以从 profile suite manifest 与 recipe 目录生成这种结构。

```json
{
  "$schema": "../../schemas/api-profile-capabilities.schema.json",
  "adapter": "vllm-nnrp-adapter",
  "profile": "openai-compatible",
  "schema_version": "openai-compatible/1",
  "compatibility_levels": [1],
  "operations": [
    {
      "name": "chat.completions.create",
      "streaming": true,
      "non_streaming": true,
      "tool_calls": true,
      "cancellation": true
    }
  ],
  "extensions": []
}
```

## API Profile Execution Plan

Runner 会把 profile suite manifest 和 adapter capability manifest 合并，输出 recipe execution
plan。Plan 内包含 `coverage_matrix`，方便 CI 展示每个 recipe 为什么被选择、跳过或未声明。

```bash
nnrp-conformance-runner api-profile-plan \
  --protocol protocol/nnrp-1-preview3/manifest.json \
  --profile profiles/openai-compatible/1/manifest.json \
  --capabilities conformance/openai-compatible-1.api-capabilities.json \
  --output artifacts/api-profile-plan.json
```

## Adapter 文档

Suite action 会创建 adapter execution plan，并调用 SDK 提供的 adapter command。Adapter command 写出
adapter case results。关键约束是结果里的 `id` 必须和 plan 里的 case id 完全一致。

Python SDK adapter command：

```bash
python -m nnrp.tools.adapter_conformance
```

## Benchmark 文档

Benchmark execution plan 使用 `category`、`feature`、`required_capabilities` 和 `workload`
描述场景。SDK benchmark command 写出的结果包含 environment 区块，以及
`p50_us`、`p95_us`、`throughput_ops_per_sec`、`cpu_percent`、`peak_memory_bytes`、`gc_alloc_bytes`
等指标。

Python SDK benchmark command：

```bash
python -m nnrp.tools.benchmark \
  --plan benchmark-plan.json \
  --output artifacts/benchmark-results.json
```

## Runner 不冻结什么

公开合约是上面列出的 JSON 边界。内部 Rust 类型布局、SDK adapter 对象树和 runner
运行中的内存状态都不属于冻结面。
