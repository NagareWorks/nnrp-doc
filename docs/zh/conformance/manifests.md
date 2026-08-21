# 清单参考 — 面向测试套件开发者

<div class="page-note">
本页面向维护 conformance 套件的工程师。SDK 作者通常应先阅读 <a href="./sdk-integration">SDK 集成指南</a>。
</div>

一致性测试套件由一组带 JSON Schema 的机器可读文档构成，schema 位于 `nnrp-conformance/schemas/`
目录。人工维护的文件应保持可读、参数化；字节级产物应由工具生成，而不是手写维护。

## 文档类型

| 文档                            | Schema                                   | 维护方        | 用途                                                              |
| ------------------------------- | ---------------------------------------- | ------------- | ----------------------------------------------------------------- |
| Protocol manifest               | `protocol-manifest.schema.json`          | Suite          | 某条协议版本线的根入口。                                          |
| Case manifest                   | `case-manifest.schema.json`              | Suite          | 声明 case、层级、状态和所需 capability token。                    |
| Capability manifest             | `capability-manifest.schema.json`        | SDK            | 声明实现名、目标协议版本线和支持能力 token。                      |
| Semantic vector recipes         | `semantic-vector-recipes.schema.json`    | Suite          | Canonical vector 的人可读来源。                                   |
| Generated vector manifest       | `vector-manifest.schema.json`            | Suite tooling  | SDK 测试消费的已生成字节产物。                                    |
| 一致性测试报告                  | `report.schema.json`                     | Runner         | 针对某份 capability manifest 的 case 选择报告。                   |
| Adapter execution plan          | `adapter-execution-plan.schema.json`     | Runner/action  | 传给 SDK 适配器命令的动态行为用例。                               |
| Adapter case results            | `adapter-case-results.schema.json`       | SDK adapter    | Adapter plan 的机器可读 pass/fail/skip 结果。                     |
| Benchmark execution plan        | `benchmark-execution-plan.schema.json`   | Runner/action  | 传给 SDK benchmark command 的 benchmark 场景。                    |
| Benchmark results               | `benchmark-results.schema.json`          | SDK benchmark  | 延迟、吞吐、分配等指标与证据路径。                                |
| API profile suite manifest      | `api-profile-suite.schema.json`          | Suite          | 某个应用层 API 兼容 profile 的根入口。                            |
| API profile recipe              | `api-profile-recipe.schema.json`         | Suite          | API 级兼容用例的人可读请求与期望来源。                            |
| API profile capability manifest | `api-profile-capabilities.schema.json`   | Adapter        | 声明适配器、profile level、支持的 operation 与可选 API 扩展。     |
| API profile execution plan      | `api-profile-execution-plan.schema.json` | Runner/action  | 针对 adapter capability manifest 选出的 profile recipe 执行计划。 |
| API profile results             | `api-profile-results.schema.json`        | Adapter        | API profile recipe 的机器可读 pass/fail/skip 结果。               |
| Wire conformance suite manifest | `wire-conformance-suite.schema.json`     | Suite          | 线路级端点测试的根入口。                                          |
| Wire conformance scenario       | `wire-conformance-scenario.schema.json`  | Suite          | 帧级客户端、服务端或代理场景的人可读来源。                        |
| Wire conformance target         | `wire-conformance-target.schema.json`    | Implementation | 声明端点模式、帧级传输、主机路由提供程序、能力和执行限制。        |
| Wire conformance plan           | `wire-conformance-plan.schema.json`      | Runner/action  | 针对某个 target 选出的具体线路级场景。                            |
| Wire conformance results        | `wire-conformance-results.schema.json`   | Runner/action  | 线路级场景的机器可读结果与证据引用。                              |

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

## 能力声明（Capability Manifest）

能力声明是实现方维护的输入，只包含身份、协议版本和能力 token。

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
  "protocol_baselines": ["nnrp-1-preview3", "nnrp-1-preview4"],
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

## API Profile 能力声明

适配器提供 API profile capability manifest，用来声明自己支持的 profile level 和 operation
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
  --protocol protocol/nnrp-1-preview4/manifest.json \
  --profile profiles/openai-compatible/1/manifest.json \
  --capabilities conformance/openai-compatible-1.api-capabilities.json \
  --output artifacts/api-profile-plan.json
```

## 线路级一致性测试 Manifest

线路级一致性测试面向真实端点。当 runner 需要直接扮演客户端、服务端或代理，而不是调用 SDK 自己的
适配器命令时，使用这一组文档。

Suite manifest 是某条线路级测试 baseline 的入口：

```json
{
  "$schema": "../../schemas/wire-conformance-suite.schema.json",
  "protocol_version": "nnrp-1-preview4",
  "suite_version": "0.1.0",
  "status": "frozen",
  "scenario_manifests": ["scenarios/runtime-control.json"],
  "modes": ["suite_as_client", "suite_as_server", "suite_as_proxy"],
  "transports": ["tcp", "quic", "ipc", "websocket"]
}
```

Target manifest 由实现仓库维护，用来声明 runner 可以使用哪些模式、帧级传输端点和主机路由提供程序能力：

```json
{
  "$schema": "../../schemas/wire-conformance-target.schema.json",
  "target_name": "nnrp-rs-preview4",
  "protocol_version": "nnrp-1-preview4",
  "suite_version": "0.1.0",
  "wire_conformance": {
    "modes": ["suite_as_client", "suite_as_server", "suite_as_proxy"],
    "transports": [
      { "name": "tcp", "endpoint": "127.0.0.1:19091", "tls": false },
      {
        "name": "quic",
        "endpoint": "127.0.0.1:19092",
        "tls": true,
        "security": {
          "server_name": "localhost",
          "trusted_certificate_der_path": "certs/server.der",
          "certificate_der_path": "certs/server.der",
          "private_key_pkcs8_der_path": "certs/server-key.der"
        }
      }
    ],
    "host_route_providers": [
      {
        "transport": "tcp",
        "provider_id": "nnrp.transport.tcp.native",
        "installed": true,
        "platforms": ["native"],
        "security_modes": ["plain", "tls_server_auth"]
      },
      {
        "transport": "websocket",
        "provider_id": "nnrp.transport.websocket.browser-wasm",
        "installed": true,
        "platforms": ["browser"],
        "security_modes": ["browser_host"]
      }
    ],
    "capabilities": ["control.cancel_abort", "control.trace_context", "host.routes"],
    "limits": {
      "max_frame_bytes": 16777216,
      "max_in_flight": 256
    }
  }
}
```

传输安全规则冻结如下：

- `tls` 为 `true` 时必须提供 `security`，`tls` 为 `false` 时禁止提供。
- QUIC 和 `wss` transport 的 `tls` 为 `true`；明文 TCP、IPC 和 `ws` 为 `false`。
- 所有安全材料路径都相对 target manifest 解析，不依赖当前工作目录。
- `suite_as_client` 和 `suite_as_proxy` 使用 `server_name` 与 `trusted_certificate_der_path` 认证实现侧 server。
- `suite_as_server` 使用 `certificate_der_path` 与 `private_key_pkcs8_der_path` 配置 suite listener；实现侧 client 信任
  `trusted_certificate_der_path`。
- `suite_as_proxy` 中声明的 endpoint 是实现侧 server 的上游地址；临时前端 endpoint 和探测 client 由 suite 自己创建并持有。

### 主机路由提供程序与场景

`host_route_providers` 是实现能力声明，不是路由配置文件。每个条目把稳定的 provider id 绑定到一个
carrier，并声明原生或浏览器平台、支持的安全模式，以及 provider 是否实际安装。已知 provider 可以用
`installed: false` 保留在声明里；强制负向场景随后验证 `local-unavailable`，而不会调用该 provider。

主机路由场景归测试套件所有，并遵守 `wire-conformance-scenario.schema.json`。路由 fixture 明确分成三层：

1. `application_endpoint` 是应用看到的 NNRP 身份，使用 `nnrp://` 或 `nnrps://`，不会暴露实际 carrier。
2. 每条 route 声明 `transport`、稳定的 `provider_id` 和测试套件分配的本地 `locator`。客户端 fixture
   可以包含多个候选 route，服务端 fixture 可以包含一个原子 listener 集合。
3. `security.mode` 和 `security.credential_owner` 描述信任材料的提供方式。场景文件不写入证书、私钥、
   token 或其他密钥字节。

```json
{
  "$schema": "../../schemas/wire-conformance-scenario.schema.json",
  "protocol_version": "nnrp-1-preview4",
  "manifest_name": "host-route-generated",
  "scenarios": [
    {
      "id": "wire.host-route.client.multi-route",
      "mode": "suite_as_server",
      "host_route": {
        "role": "client",
        "platform": "native",
        "application_endpoint": "nnrp://host-route.test",
        "routes": [
          {
            "transport": "tcp",
            "provider_id": "nnrp.transport.tcp.native",
            "locator": "suite://allocate/tcp/client-primary",
            "security": { "mode": "plain", "credential_owner": "none" }
          },
          {
            "transport": "ipc",
            "provider_id": "nnrp.transport.ipc.native",
            "locator": "suite://allocate/ipc/client-secondary",
            "security": { "mode": "plain", "credential_owner": "none" }
          }
        ]
      },
      "status": "mandatory",
      "feature": "host.routes",
      "required_capabilities": ["host.routes"],
      "description": "目标客户端报告两个候选 route，并且只采用一个 carrier。",
      "steps": [{ "action": "connect_routes", "timeout_ms": 2000 }],
      "expect": {
        "terminal": "success",
        "route": { "selected_count": 1, "atomic_rollback": false, "logical_set_closed": false }
      }
    }
  ]
}
```

冻结的主机路由目录覆盖客户端选择与拒绝证据，服务端 bind、bound/accepted transport 证据，原子回滚，
终止性 listener 失败，原生 TCP、QUIC、IPC、WebSocket，浏览器 WSS，已知但未安装的 provider，以及组合
失败的拒绝优先级。低代码生成器输出这些原始 fixture，不会自行发明看起来等价的路由。

Runner 执行链路：

```bash
nnrp-conformance-runner wire-plan \
  --suite wire-conformance/nnrp-1-preview4/manifest.json \
  --target conformance/nnrp-1-preview4.wire-target.json \
  --output artifacts/wire-plan.json \
  --results-path artifacts/wire-results.json \
  --evidence-dir artifacts/wire-evidence

nnrp-conformance-runner wire-run \
  --plan artifacts/wire-plan.json \
  --target conformance/nnrp-1-preview4.wire-target.json \
  --output artifacts/wire-results.json

nnrp-conformance-runner validate-wire-results \
  --plan artifacts/wire-plan.json \
  --results artifacts/wire-results.json
```

Wire results 中的 scenario id 必须与 plan 保持一致，并通过 evidence path 关联帧捕获、终态与传输层诊断信息。

## Adapter 文档

Suite action 会创建 adapter execution plan，并调用 SDK 提供的适配器命令。适配器命令写出
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

公开合约是上面列出的 JSON 边界。内部 Rust 类型布局、SDK 适配器对象树和 runner
运行中的内存状态都不属于冻结面。
