# NNRP OpenAI 兼容 API Profile

## 1. 状态

本文冻结第一版用于在 NNRP 上承载 OpenAI 兼容 AI API 语义的 Profile。

| 字段                     | 值                             |
| ------------------------ | ------------------------------ |
| Profile name             | `openai-compatible`            |
| Schema version           | `openai-compatible/1`          |
| Profile family           | `ai-api`                       |
| Primary schema encoding  | JSON                           |
| Streaming event encoding | JSON event objects             |
| Transport dependency     | NNRP session and result stream |

这个 Profile 不复刻 OpenAI HTTP 传输层。它保留现有 AI
应用已经熟悉的请求与响应语义，再把这些语义映射到 NNRP 的 session、frame submit、streaming
result、cancel、flow control 和 diagnostics 上。

这个 Profile 是以下工作的共享契约：

1. OpenAI 兼容模型服务适配器，首个目标是 vLLM。
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
4. 本 Profile 不冻结 worker pool、batching strategy、GPU scheduling 或 KV-cache layout 等 adapter
   私有实现。

## 4. 兼容级别

实现可以声明一个或多个兼容级别。更高等级默认包含更低等级，除非文档显式说明例外。

| 等级 | 名称                     | 必需操作                           | 用途                                                           |
| ---- | ------------------------ | ---------------------------------- | -------------------------------------------------------------- |
| 1    | Chat baseline            | `chat.completions.create`          | 首个 vLLM adapter 目标，也是最小 Profile conformance surface。 |
| 2    | Responses                | `responses.create`                 | 面向支持 Responses API 语义的 serving target。                 |
| 3    | Discovery and embeddings | `models.list`、`embeddings.create` | 模型发现与 embedding workload。                                |

Level 1 是首个 adapter release 的必需基线。Level 2 是条件能力：adapter 只有在 serving target 能保留
Responses API 的 streaming 与 tool-call 语义时才能声明 Level 2。Level 3 操作可选，并且可以独立增加。

## 5. Operation 映射

OpenAI 兼容操作映射为 NNRP frame submission。操作名由 request envelope 携带。

| OpenAI 兼容操作     | NNRP operation name       | 要求                                         |
| ------------------- | ------------------------- | -------------------------------------------- |
| Chat completions    | `chat.completions.create` | Level 1 必需                                 |
| Responses           | `responses.create`        | Level 2 必需                                 |
| Model list          | `models.list`             | Level 3 可选                                 |
| Embeddings          | `embeddings.create`       | Level 3 可选                                 |
| Tool call streaming | chat/responses 的事件子集 | 当所选 operation 与模型支持 tool call 时必需 |

Profile 使用语义化 operation name，而不是 HTTP path。例如 `/v1/chat/completions` 映射为
`chat.completions.create`。

## 6. Request Envelope

每个请求作为一个逻辑 NNRP frame submit。request body 保持 OpenAI 风格 JSON 兼容：

```json
{
  "schema_version": "openai-compatible/1",
  "operation": "chat.completions.create",
  "request_id": "req_01jz7w7rb4m9c8d6aw4e0h9m3f",
  "body": {
    "model": "example-model",
    "messages": [
      { "role": "user", "content": "Write a short summary." }
    ],
    "stream": true
  },
  "nnrp": {
    "timeout_ms": 30000,
    "diagnostics": true
  }
}
```

| 字段             | 要求 | 说明                                                                        |
| ---------------- | ---- | --------------------------------------------------------------------------- |
| `schema_version` | 必需 | 必须是 `openai-compatible/1`。                                              |
| `operation`      | 必需 | 必须是 adapter capability document 中声明的 operation name。                |
| `request_id`     | 可选 | Client 提供的关联 id。缺省时，adapter 可以从 NNRP frame id 派生。           |
| `body`           | 必需 | 所选 operation 对应的 OpenAI 兼容 request object。                          |
| `nnrp`           | 可选 | NNRP 特有 policy 与 diagnostics hint。这些字段不得转发进 OpenAI 兼容 body。 |

当目标 operation 支持时，`body` 保留常见字段，例如
`model`、`messages`、`input`、`temperature`、`top_p`、`max_tokens`、`tools`、`tool_choice`、`metadata`
和 `stream`。

## 7. 流式响应映射

HTTP SSE chunk 映射为 NNRP result push event。流式事件在单个 submitted frame 内保持有序。

| 流程阶段            | NNRP 交付方式                                                                   |
| ------------------- | ------------------------------------------------------------------------------- |
| 首个 token 或 delta | 携带 JSON event payload 的 `ResultPush`                                         |
| 中间 delta          | 后续 `ResultPush`                                                               |
| Tool call delta     | 携带 tool-call event object 的 `ResultPush`                                     |
| Usage summary       | 终止前或最终 `ResultPush` event                                                 |
| Completion          | Terminal submit outcome；如果存在最终 body，同时发送 `response.completed` event |
| Failure             | NNRP error，加可用的 profile error object                                       |

Level 1 必需 streaming event type：

| Event type                     | 必需字段                                                   | 说明                                     |
| ------------------------------ | ---------------------------------------------------------- | ---------------------------------------- |
| `response.output_text.delta`   | `index`、`delta`                                           | 增量文本输出。                           |
| `response.tool_call.started`   | `type`、`index`、`item_id`、`call_id`、`name`              | 开始一个工具调用。                       |
| `response.tool_call.delta`     | `type`、`index`、`item_id`、`call_id`、`arguments_delta`   | 追加参数文本。                           |
| `response.tool_call.completed` | `type`、`index`、`item_id`、`call_id`、`name`、`arguments` | 完成一个工具调用。                       |
| `response.tool_call.error`     | `type`、`index`、`item_id`、`call_id`、`error`             | 以错误终止一个工具调用。                 |
| `response.usage`               | `usage`                                                    | Usage summary。                          |
| `response.completed`           | `body`                                                     | 存在最终 OpenAI 兼容响应 body 时发送。   |
| `response.error`               | `error`                                                    | 面向应用的 OpenAI 兼容 error body。      |
| `response.cancelled`           | `reason`                                                   | Adapter 观测到取消时发送的终止取消通知。 |

Text delta 示例：

```json
{
  "type": "response.output_text.delta",
  "index": 0,
  "delta": "hello"
}
```

Adapter 可以在 `openai_chunk` 中附带原始 OpenAI 兼容 streaming chunk，方便需要精确下游重放的
client。普通 Profile 消费者不得依赖 `openai_chunk`。

## 8. 非流式响应映射

非流式请求返回一个逻辑 result payload。result payload 保留所选 operation 的 OpenAI 兼容响应形态：

```json
{
  "type": "response.completed",
  "body": {
    "id": "chatcmpl_example",
    "object": "chat.completion",
    "choices": [
      {
        "index": 0,
        "message": { "role": "assistant", "content": "hello" },
        "finish_reason": "stop"
      }
    ],
    "usage": {
      "prompt_tokens": 12,
      "completion_tokens": 1,
      "total_tokens": 13
    }
  }
}
```

NNRP submit outcome 负责传输层成功或失败。Profile response body
负责应用层内容，例如生成文本、choices、response items、usage 和 finish reason。

## 9. 取消与超时

OpenAI 兼容 client 的取消行为映射为 NNRP frame cancellation，前提是 submitted frame 仍处于 active
状态。

Timeout 是 client policy，而不是 HTTP timeout 的克隆。超时 client 可以取消 active
frame，并且除非实现显式协商了 recovery 行为，否则应把该 frame 后续迟到的 result push 视为无效。

## 10. Error 映射

NNRP 负责协议和传输失败。OpenAI 兼容 Profile 负责面向应用的 error object。

| 失败类型                               | 推荐映射                                          |
| -------------------------------------- | ------------------------------------------------- |
| Malformed NNRP frame                   | NNRP protocol error                               |
| Unsupported profile operation          | 携带 profile error body 的 NNRP application error |
| Invalid request body                   | Profile error body，terminal submit failure       |
| Model overload or scheduling rejection | Profile error body，加 NNRP diagnostic metadata   |
| Transport loss                         | NNRP transport/session failure                    |

Profile error body 保留现有熟悉形态：

```json
{
  "type": "response.error",
  "error": {
    "type": "invalid_request_error",
    "code": "unsupported_model",
    "message": "The requested model is not available."
  }
}
```

## 11. Usage 与 Diagnostics

Usage data 作为 profile payload data 上报，方便现有 client 消费：

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

NNRP diagnostics 承载 OpenAI 兼容 HTTP client 通常看不到的传输和运行时信息，例如 scheduling
hint、queue delay、selected transport、retry reason、cache behavior 和 flow-control pressure。

Diagnostics 支持扩展。除非 client 显式选择更严格的 adapter-specific schema，否则未知 diagnostic
字段必须被忽略。

## 12. Tool Calls

Tool call 表达为结构化 JSON event。Profile 支持增量 tool-call delta，因为 agent runtime
需要展示和路由部分生成中的工具参数。

规范字段与顺序契约位于 [`openai-compatible-1.json`](/contracts/openai-compatible-1.json)。`item_id`
标识 output item， `call_id` 则是在四类事件之间关联同一次工具调用的稳定身份；`index` 是 output
sequence 中的非负位置。

同一 `call_id` 必须先且只出现一次 `started`。之后可以出现零个或多个 `delta`，其 `arguments_delta`
按事件顺序拼接。每个工具调用必须且只能由一个 `completed` 或 `error` 终止。 不同 `call_id`
的事件可以交错，但同一调用内部顺序保持稳定。`completed` 携带完整函数 `name` 与 拼接后的 JSON
参数字符串；`error` 使用与 `response.error` 相同的 profile error shape。 `openai_chunk` 只作为可选
replay 证据，消费者不得依赖它解释事件。

这四类事件对于包含它们的 NNRP operation 都是非终态，通过有序 `PARTIAL_RESULT` 帧传输；operation
本身仍然只能通过 NNRP 终态结果结束一次。Profile 只定义这些事件形态，不执行工具，也不定义工具执行的
安全边界。

## 13. Capability Document

Adapter 使用可读 JSON capability document 声明 Profile 支持能力：

```json
{
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
  "models": [
    {
      "id": "example-model",
      "owned_by": "adapter"
    }
  ]
}
```

Capability document 必须作为一致性测试选择和 SDK feature probe 的事实源。

## 14. 一致性测试策略

一致性测试 case 使用可读 recipe，而不是硬编码 hex fixture。

每个 recipe 描述：

1. Profile operation。
2. Request body。
3. Expected event sequence。
4. Expected terminal outcome。
5. 可选 diagnostics expectation。
6. 可选 negative case，例如 invalid body、unsupported model、cancellation 和 malformed stream
   order。

一致性测试套件仍然可以产出机器可读 vector，但源头应保持参数化且可 review。

## 15. 第一阶段实现切片

第一阶段实现切片聚焦 vLLM adapter 与 Python SDK 集成：

1. Level 1 `chat.completions.create` request mapping。
2. Streaming text delta。
3. Non-streaming completion body。
4. Cancellation。
5. Error body mapping。
6. Usage summary。
7. 当 vLLM 与所选模型暴露 tool-call data 时，透传 tool-call event。
8. 为 conformance 与 SDK probe 生成 capability document。

Level 2 与 Level 3 可以在 Level 1 adapter 稳定并完成 benchmark 后再实现。
