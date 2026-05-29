# NNRP OpenAI 兼容 Profile 草案

## 1. 定位

本文定义一套用于在 NNRP 上承载 OpenAI 兼容 AI API 语义的 Profile 草案。

这个 Profile 不复刻 OpenAI HTTP 传输层。它保留现有 AI 应用已经熟悉的请求与响应语义，再把这些语义映射到 NNRP 的 session、frame submit、streaming result、cancel、flow control 和 diagnostics 上。

这个 Profile 预期作为以下工作的共享契约：

1. OpenAI 兼容模型服务适配器，包括 vLLM。
2. SDK 中面向 chat、response、embedding 与 tool-call 流程的高层 helper。
3. 不绑定某一个服务端实现的语义一致性测试。
4. 需要流式输出、取消、usage 统计和结构化工具事件的上层 agent runtime。

## 2. 设计目标

1. 在可行范围内保持应用层 payload 与 OpenAI 风格 request body 兼容。
2. 用 NNRP 承载传输语义：session、flow control、result push、cancel、cache hint 和 diagnostics。
3. 不把 HTTP status code、SSE framing 或 REST endpoint path 变成协议契约的一部分。
4. 支持由可读 recipe 生成低代码 conformance case。
5. 允许模型服务实现暴露更丰富的 diagnostics，同时不破坏 OpenAI 兼容 client。

## 3. 非目标

1. 本 Profile 不定义模型质量、采样正确性、tokenizer 行为或工具执行策略。
2. 本 Profile 不要求实现一次性支持所有 OpenAI API endpoint。
3. 本 Profile 不要求 NNRP SDK 复刻任何 HTTP client library 的类层级或方法名。
4. 本 Profile 不冻结 worker pool、batching strategy、GPU scheduling 或 KV-cache layout 等 adapter 私有实现。

## 4. Profile 身份

Profile 身份应保持稳定并与具体实现解耦：

| 字段 | 值 |
| --- | --- |
| Profile name | `openai-compatible` |
| Profile family | `ai-api` |
| Primary schema encoding | JSON |
| Streaming event encoding | JSON event objects |
| Transport dependency | NNRP session and result stream |

实现可以通过 capability document 宣告支持的操作。第一批有价值的 capability 应只包含已经有 conformance case 支撑的操作。

## 5. Operation 映射

OpenAI 兼容操作映射为 NNRP frame submission。操作名通过结构化 submit metadata 或 typed payload envelope 中的约定字段携带。

| OpenAI 兼容操作 | NNRP operation name | 第一阶段是否必需 |
| --- | --- | --- |
| Chat completions | `chat.completions.create` | 是 |
| Responses | `responses.create` | 如果目标 adapter 支持则应支持 |
| Embeddings | `embeddings.create` | 可选 |
| Model list | `models.list` | 可选 |
| Tool call streaming | chat/responses 的事件子集 | Agent 场景需要 |

Profile 应优先使用语义化 operation name，而不是 HTTP path。例如 `/v1/chat/completions` 映射为 `chat.completions.create`。

## 6. Request Envelope

每个请求作为一个逻辑 NNRP frame submit。request body 保持 OpenAI 风格 JSON 兼容：

```json
{
  "operation": "chat.completions.create",
  "body": {
    "model": "example-model",
    "messages": [
      { "role": "user", "content": "Write a short summary." }
    ],
    "stream": true
  }
}
```

当目标 operation 支持时，`body` 应保留常见字段，例如 `model`、`messages`、`input`、`temperature`、`top_p`、`max_tokens`、`tools`、`tool_choice`、`metadata` 和 `stream`。

NNRP 特有关注点不应随意混入 OpenAI 兼容 body，除非它们被明确纳入公共 Profile。transport policy、timeout policy、cache hint 和 diagnostics policy 应优先通过 NNRP metadata 或 capability negotiation 表达。

## 7. 流式响应映射

HTTP SSE chunk 映射为 NNRP result push event。流式事件在单个 submitted frame 内保持有序。

| 流程阶段 | NNRP 交付方式 |
| --- | --- |
| 首个 token 或 delta | 携带 JSON event payload 的 `ResultPush` |
| 中间 delta | 后续 `ResultPush` |
| Tool call delta | 携带 tool-call event object 的 `ResultPush` |
| Usage summary | 终止前或最终 `ResultPush` event |
| Completion | Terminal submit outcome |
| Failure | NNRP error，加可用的 profile error object |

Streaming event object 应保持可读，方便 recipe 化：

```json
{
  "type": "response.output_text.delta",
  "index": 0,
  "delta": "hello"
}
```

事件分类一开始应保持克制。第一批 mandatory event set 应覆盖 text delta、tool-call delta、usage summary、completed result 和 error。

## 8. 非流式响应映射

非流式请求返回一个逻辑 result payload。result payload 应保留所选 operation 的 OpenAI 兼容响应形态。

NNRP submit outcome 负责传输层成功或失败。Profile response body 负责应用层内容，例如生成文本、choices、response items、usage 和 finish reason。

## 9. 取消与超时

OpenAI 兼容 client 的取消行为映射为 NNRP frame cancellation，前提是 submitted frame 仍处于 active 状态。

Timeout 应表达为 client policy，而不是 HTTP timeout 的克隆。超时 client 可以取消 active frame，并且除非实现显式协商了 recovery 行为，否则应把该 frame 后续迟到的 result push 视为无效。

## 10. Error 映射

NNRP 负责协议和传输失败。OpenAI 兼容 Profile 负责面向应用的 error object。

| 失败类型 | 推荐映射 |
| --- | --- |
| Malformed NNRP frame | NNRP protocol error |
| Unsupported profile operation | 携带 profile error body 的 NNRP application error |
| Invalid request body | Profile error body，terminal submit failure |
| Model overload or scheduling rejection | Profile error body，加 NNRP diagnostic metadata |
| Transport loss | NNRP transport/session failure |

Profile error body 应尽量接近现有熟悉形态：

```json
{
  "error": {
    "type": "invalid_request_error",
    "code": "unsupported_model",
    "message": "The requested model is not available."
  }
}
```

## 11. Usage 与 Diagnostics

Usage data 应作为 profile payload data 上报，方便现有 client 消费：

```json
{
  "type": "response.usage",
  "usage": {
    "input_tokens": 12,
    "output_tokens": 32,
    "total_tokens": 44
  }
}
```

NNRP diagnostics 应承载 OpenAI 兼容 HTTP client 通常看不到的传输和运行时信息，例如 scheduling hint、queue delay、selected transport、retry reason、cache behavior 和 flow-control pressure。

## 12. Tool Calls

Tool call 应表达为结构化 JSON event。Profile 应支持增量 tool-call delta，因为 agent runtime 需要展示和路由部分生成中的工具参数。

最小事件类型：

1. Tool call started。
2. Tool call argument delta。
3. Tool call completed。
4. Tool call rejected or failed。

Profile 定义 tool-call event 的 wire shape，但不执行工具，也不定义工具执行的安全边界。

## 13. Conformance 策略

Conformance case 应使用可读 recipe，而不是硬编码 hex fixture。

每个 recipe 应描述：

1. Profile operation。
2. Request body。
3. Expected event sequence。
4. Expected terminal outcome。
5. 可选 diagnostics expectation。
6. 可选 negative case，例如 invalid body、unsupported model、cancellation 和 malformed stream order。

Conformance suite 仍然可以产出机器可读 vector，但源头应保持参数化且可 review。

## 14. 第一阶段实现切片

第一阶段实现切片应聚焦 vLLM 与 Python SDK 集成：

1. `chat.completions.create` request mapping。
2. Streaming text delta。
3. Non-streaming completion body。
4. Cancellation。
5. Error body mapping。
6. Usage summary。
7. 如果目标模型服务栈支持，则提供最小 tool-call event pass-through。

这个切片跑通后，再补充更完整的 responses API 覆盖和 agent-specific event case。

## 15. 待定问题

1. `responses.create` 应在第一版冻结 Profile 中 mandatory，还是等更多 serving target 支持后再纳入。
2. Embedding request 应共享本 Profile，还是拆成更窄的 `openai-compatible-embeddings` 子 Profile。
3. Runtime diagnostic metadata 应标准化到什么程度，哪些留给 implementation-specific extension data。
4. Profile capability negotiation 应作为独立 manifest，还是作为现有 NNRP capability exchange 的字段。
5. chat 和 responses 风格 API 中，哪些 tool-call streaming event name 应强制统一。
