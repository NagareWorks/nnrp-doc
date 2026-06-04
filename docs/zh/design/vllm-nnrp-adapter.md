# vLLM NNRP Adapter 设计

## 1. 定位

vLLM NNRP adapter 是冻结后的 `openai-compatible/1` API Profile 的第一个具体实现目标。

这个 adapter 不创建另一个 OpenAI HTTP server。它把 vLLM 的 OpenAI 兼容 serving surface 绑定到 NNRP
session、frame submit、result stream、cancel、diagnostics 和 profile-level conformance 上。

Adapter 必须保留三条边界：

1. **NNRP runtime 边界**：NNRP 负责 session lifecycle、flow control、cancellation、result push、
   transport probing 和 diagnostics delivery。
2. **OpenAI 兼容 API 边界**：冻结后的 `openai-compatible/1` Profile 负责 request envelope、
   operation name、streaming event shape、error body、usage event 和 capability document。
3. **vLLM backend 边界**：vLLM 负责 model loading、token generation、batching、scheduling、model
   policy、tokenizer behavior 和 backend-specific limit。

## 2. 支持版本线

第一条支持线如下：

| 字段                       | 值                                       |
| -------------------------- | ---------------------------------------- |
| 声明的 vLLM 范围           | `vllm>=0.18.0,<0.23`                     |
| 第一条 lower-bound CI 目标 | `0.18.1`                                 |
| 当前线 CI 目标             | 当前 adapter release 支持的最新稳定 vLLM |
| Profile baseline           | `openai-compatible/1` Level 1            |

`0.18.0` 保留在声明范围内，因为它是当前选择的支持线起点。`0.18.1` 是首个 lower-bound CI
目标，因为它是这条线的第一个 patch 版本。

## 3. 实现切片

第一版只实现 Level 1：

1. `chat.completions.create` request envelope。
2. Streaming text delta。
3. Non-streaming completion body。
4. Cancellation 和 timeout 映射。
5. OpenAI 兼容 error body。
6. Usage summary event。
7. 当 vLLM 与所选模型暴露 tool-call data 时，透传 tool-call event。
8. 为 SDK feature probe 和 conformance selection 生成 capability document。

Level 2 `responses.create` 与 Level 3 `models.list` / `embeddings.create` 是后续能力。只有在 adapter
具备真实行为和对应 conformance recipe 后，才能声明这些 capability。

## 4. 模块设计

| 模块           | 职责                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| `profile`      | 冻结 Profile 常量、request envelope validation、event builder、capability document helper。                     |
| `adapter`      | Profile-level async request handler，把 backend response 映射成 profile event。                                 |
| `vllm_backend` | vLLM serving-object wrapper、method probing、streaming chunk normalization 和 backend error mapping。           |
| `nnrp_server`  | NNRP server/session binding、frame submit handling、result push emission、cancellation 和 diagnostics routing。 |
| `conformance`  | 面向 suite-owned API profile recipe 的 adapter command entry point。                                            |
| `benchmark`    | Throughput、latency、cancellation 和 backend overhead measurement。                                             |

Adapter package 应把 vLLM 保持为 optional runtime extra。普通 lint、type check、package build 和
profile mapping test 必须能在不安装 GPU serving 环境的情况下运行。

## 5. 请求流程

1. NNRP client 提交一个携带 `openai-compatible/1` request envelope 的 frame。
2. NNRP server binding 校验 envelope，并打开 adapter operation context。
3. Profile adapter 根据 capability document 检查 operation support。
4. vLLM backend wrapper 调用所选 vLLM serving method。
5. Streaming chunk 被转换成 profile event。
6. NNRP runtime 以有序 result payload 推送这些 event。
7. Completion、cancellation 或 error state 关闭 operation context。

Adapter 不得把 NNRP 特有 policy 偷塞进 OpenAI 兼容 `body`
object。Timeout、diagnostics、cache、transport 和 cancellation policy 应保留在 envelope 或 NNRP
runtime metadata 中。

## 6. Streaming Event 映射

| vLLM / OpenAI 兼容 chunk             | Profile event                |
| ------------------------------------ | ---------------------------- |
| `choices[].delta.content`            | `response.output_text.delta` |
| `choices[].delta.tool_calls[]`       | `response.tool_call.delta`   |
| `usage`                              | `response.usage`             |
| final non-streaming body             | `response.completed`         |
| invalid request or backend rejection | `response.error`             |
| observed cancellation                | `response.cancelled`         |

Adapter 可以在 `openai_chunk` 中附带原始 OpenAI 兼容 streaming chunk，但普通消费者不得依赖这个字段。

## 7. Cancellation 与 Diagnostics

Cancellation 从 NNRP frame cancellation 映射到 active vLLM request path。如果 vLLM 无法立刻
abort，adapter 仍然必须停止为已取消的 NNRP operation 继续发送迟到 result event。

Diagnostics 应包含：

1. selected model id
2. selected operation
3. 可用时的 queue delay
4. backend error family
5. cancellation reason
6. 可用时的 selected transport 和 NNRP session identifiers

Diagnostics 支持扩展。除非 client 显式选择 adapter-specific schema，否则未知 diagnostic
字段必须被忽略。

## 8. API Profile Conformance

OpenAI 兼容 provider 经常扩展或调整 OpenAI HTTP API。因此 adapter conformance layer 验证的是冻结后的
NNRP API Profile 语义，而不是完整复刻 OpenAI HTTP 行为。

Conformance 形态与 SDK adapter conformance 类似：adapter 通过 manifest 声明 capability，suite 根据
capability 选择可读 recipe。

### 8.1 Capability Manifest

每个 adapter 提供一个 manifest：

```json
{
  "adapter": "vllm-nnrp-adapter",
  "profile": "openai-compatible",
  "schema_version": "openai-compatible/1",
  "compatibility_levels": [1],
  "operations": [
    {
      "name": "chat.completions.create",
      "streaming": true,
      "non_streaming": true,
      "tool_calls": true
    }
  ],
  "extensions": [
    {
      "name": "vllm.diagnostics",
      "critical": false
    }
  ]
}
```

对于不实现此 Profile 的仓库，这个 manifest 是可选的。对于希望 conformance suite 运行 OpenAI NNRP API
测试的仓库，这个 manifest 是必需的。

### 8.2 Recipe Source

Recipe 是参数化且可读的：

```json
{
  "id": "openai-compatible.chat.streaming-text",
  "profile": "openai-compatible",
  "schema_version": "openai-compatible/1",
  "operation": "chat.completions.create",
  "request": {
    "body": {
      "model": "${MODEL_ID}",
      "messages": [
        { "role": "user", "content": "Say hello." }
      ],
      "stream": true
    }
  },
  "expect": {
    "events": [
      { "type": "response.output_text.delta" },
      { "type": "response.usage", "optional": true },
      { "type": "response.completed", "optional": true }
    ],
    "terminal": "success"
  }
}
```

Suite 可以把 recipe 编译成机器可执行 plan，但 recipe 本身仍然是事实源。

### 8.3 Extension Rules

允许 provider-specific field，但必须遵守：

1. 标准 request 和 event 字段保持 Profile 定义的含义。
2. Extension field 在 manifest 中声明。
3. Non-critical extension field 可被 client 和测试忽略。
4. Critical extension 需要显式 test selection。
5. Extension behavior 不得成为 Level 1 baseline 成功的必要条件。

这样既给 provider 留出模型特化空间，也不允许 custom field 污染共享 Profile 契约。

### 8.4 Required Level 1 Cases

Level 1 conformance 应覆盖：

1. valid streaming chat request
2. valid non-streaming chat request
3. invalid body rejection
4. unsupported operation rejection
5. usage summary shape
6. text delta event ordering
7. advertised tool-call delta pass-through
8. cancellation behavior
9. backend error mapping
10. capability document validation

## 9. Benchmark 策略

Benchmark 必须把 adapter overhead 与模型生成耗时拆开。

| Benchmark                 | 用途                                                            |
| ------------------------- | --------------------------------------------------------------- |
| Profile mapper throughput | 测量不含 vLLM generation 的 request/event mapping overhead。    |
| Streaming event latency   | 测量 backend chunk 到 NNRP result push 的 p50/p95 delay。       |
| Cancellation latency      | 测量 cancellation request 到 adapter stop-emitting 的 latency。 |
| End-to-end vLLM smoke     | 确认真实 vLLM 集成仍然输出 Profile event sequence。             |

首版发布前必须记录 baseline 结果。

## 10. Release Gate

Adapter 只有满足以下条件才可以发布：

1. Level 1 adapter behavior 已实现。
2. API profile conformance recipe 通过。
3. Benchmark baseline 已记录。
4. vLLM lower-bound 与 current-line smoke test 已记录。
5. README 与安装文档说明 vLLM 版本线和 optional dependency model。
