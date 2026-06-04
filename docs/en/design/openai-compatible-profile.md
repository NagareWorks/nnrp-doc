# NNRP OpenAI-Compatible API Profile

## 1. Status

This document freezes the first NNRP profile for carrying OpenAI-compatible AI API semantics over
NNRP.

| Field                    | Value                          |
| ------------------------ | ------------------------------ |
| Profile name             | `openai-compatible`            |
| Schema version           | `openai-compatible/1`          |
| Profile family           | `ai-api`                       |
| Primary schema encoding  | JSON                           |
| Streaming event encoding | JSON event objects             |
| Transport dependency     | NNRP session and result stream |

The profile does not clone the OpenAI HTTP transport. It preserves the request and response
semantics that existing AI applications already understand, then maps those semantics onto NNRP
sessions, frame submission, streaming result delivery, cancellation, flow control, and diagnostics.

The profile is the shared contract for:

1. OpenAI-compatible model-serving adapters, starting with vLLM.
2. SDK helpers that expose familiar chat, response, embedding, and tool-call flows.
3. Conformance cases that validate semantic compatibility without hard-coding one server
   implementation.
4. Higher-level agent runtimes that need streaming, cancellation, usage accounting, and structured
   tool events.

## 2. Design Goals

1. Keep application payloads compatible with existing OpenAI-style request bodies where practical.
2. Use NNRP for transport semantics: sessions, flow control, result push, cancellation, cache hints,
   and diagnostics.
3. Avoid making HTTP status codes, SSE framing, or REST endpoint paths part of the protocol
   contract.
4. Support low-code conformance generation from readable request and event recipes.
5. Leave room for model-serving implementations to expose richer diagnostics without breaking
   OpenAI-compatible clients.

## 3. Non-Goals

1. This profile does not define model quality, sampling correctness, tokenizer behavior, or tool
   execution policy.
2. It does not require an implementation to expose every OpenAI API endpoint at once.
3. It does not require NNRP SDKs to mirror the exact class hierarchy or method names of any HTTP
   client library.
4. It does not freeze private adapter internals such as worker pools, batching strategy, GPU
   scheduling, or KV-cache layout.

## 4. Compatibility Levels

Implementations advertise one or more compatibility levels. A higher level includes the lower levels
unless explicitly stated otherwise.

| Level | Name                     | Required operations                | Purpose                                                                     |
| ----- | ------------------------ | ---------------------------------- | --------------------------------------------------------------------------- |
| 1     | Chat baseline            | `chat.completions.create`          | First vLLM adapter target and the minimum profile conformance surface.      |
| 2     | Responses                | `responses.create`                 | Responses API mapping for serving targets that expose compatible semantics. |
| 3     | Discovery and embeddings | `models.list`, `embeddings.create` | Model discovery and embedding workloads.                                    |

Level 1 is the required baseline for the first adapter release. Level 2 is conditional: an adapter
must not claim Level 2 unless its serving target can preserve Responses API streaming and tool-call
semantics. Level 3 operations are optional and may be added independently.

## 5. Operation Mapping

OpenAI-compatible operations map to NNRP frame submissions. The operation name is carried in the
request envelope.

| OpenAI-compatible operation | NNRP operation name            | Requirement                                                       |
| --------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| Chat completions            | `chat.completions.create`      | Level 1 required                                                  |
| Responses                   | `responses.create`             | Level 2 required                                                  |
| Model list                  | `models.list`                  | Level 3 optional                                                  |
| Embeddings                  | `embeddings.create`            | Level 3 optional                                                  |
| Tool call streaming         | Event subset of chat/responses | Required when the selected operation and model support tool calls |

The profile uses semantic operation names rather than HTTP paths. For example,
`/v1/chat/completions` becomes `chat.completions.create`.

## 6. Request Envelope

Each request is submitted as one logical NNRP frame. The request body remains JSON-compatible with
OpenAI-style clients:

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

| Field            | Requirement | Description                                                                                                     |
| ---------------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| `schema_version` | Required    | Must be `openai-compatible/1`.                                                                                  |
| `operation`      | Required    | One of the operation names advertised by the adapter capability document.                                       |
| `request_id`     | Optional    | Client-provided correlation id. When absent, the adapter may derive one from the NNRP frame id.                 |
| `body`           | Required    | OpenAI-compatible request object for the selected operation.                                                    |
| `nnrp`           | Optional    | NNRP-specific policy and diagnostics hints. These fields must not be forwarded into the OpenAI-compatible body. |

The `body` object preserves familiar fields such as `model`, `messages`, `input`, `temperature`,
`top_p`, `max_tokens`, `tools`, `tool_choice`, `metadata`, and `stream` when the target operation
supports them.

## 7. Streaming Response Mapping

HTTP SSE chunks map to NNRP result push events. The stream is ordered per submitted frame.

| Stream phase         | NNRP delivery                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------- |
| First token or delta | `ResultPush` with a JSON event payload                                                   |
| Intermediate delta   | Additional `ResultPush` messages                                                         |
| Tool call delta      | `ResultPush` with a tool-call event object                                               |
| Usage summary        | Final or near-final `ResultPush` event                                                   |
| Completion           | Terminal submit outcome plus a `response.completed` event when a final body is available |
| Failure              | NNRP error plus profile error object where available                                     |

Mandatory Level 1 streaming event types:

| Event type                   | Required fields      | Description                                                                |
| ---------------------------- | -------------------- | -------------------------------------------------------------------------- |
| `response.output_text.delta` | `index`, `delta`     | Incremental text output.                                                   |
| `response.tool_call.delta`   | `index`, `tool_call` | Incremental tool-call data when the selected operation emits tool calls.   |
| `response.usage`             | `usage`              | Usage summary.                                                             |
| `response.completed`         | `body`               | Final OpenAI-compatible response body when available.                      |
| `response.error`             | `error`              | Application-facing OpenAI-compatible error body.                           |
| `response.cancelled`         | `reason`             | Terminal cancellation notification when the adapter observes cancellation. |

Example text delta:

```json
{
  "type": "response.output_text.delta",
  "index": 0,
  "delta": "hello"
}
```

Adapters may include the original OpenAI-compatible streaming chunk in `openai_chunk` for clients
that need exact downstream replay. Consumers must not require `openai_chunk` for normal profile
operation.

## 8. Non-Streaming Response Mapping

A non-streaming request returns one logical result payload. The result payload preserves the
OpenAI-compatible response shape for the selected operation:

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

The NNRP submit outcome owns transport-level success or failure. The profile response body owns
application-level content such as generated text, choices, response items, usage, and finish reason.

## 9. Cancellation and Timeouts

OpenAI-compatible client cancellation maps to NNRP frame cancellation when the submitted frame is
still active.

Timeouts are client policy, not an HTTP timeout clone. A timed-out client may cancel the active
frame and should treat late result pushes for that frame as invalid unless the implementation has
explicitly negotiated recovery behavior.

## 10. Error Mapping

NNRP owns protocol and transport failures. The OpenAI-compatible profile owns application-facing
error objects.

| Failure kind                           | Preferred mapping                                |
| -------------------------------------- | ------------------------------------------------ |
| Malformed NNRP frame                   | NNRP protocol error                              |
| Unsupported profile operation          | NNRP application error with profile error body   |
| Invalid request body                   | Profile error body, terminal submit failure      |
| Model overload or scheduling rejection | Profile error body plus NNRP diagnostic metadata |
| Transport loss                         | NNRP transport/session failure                   |

Profile error bodies preserve the familiar shape:

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

## 11. Usage and Diagnostics

Usage data is reported as profile payload data so existing clients can consume it:

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

NNRP diagnostics carry transport and runtime information that OpenAI-compatible HTTP clients usually
cannot see, such as scheduling hints, queue delay, selected transport, retry reason, cache behavior,
and flow-control pressure.

Diagnostics are extension-friendly. Unknown diagnostic fields must be ignored by clients unless the
client explicitly opts into a stricter adapter-specific schema.

## 12. Tool Calls

Tool calls are represented as structured JSON events. The profile supports incremental tool-call
deltas because agent runtimes need to display and route partial tool arguments.

Minimum event types:

1. `response.tool_call.started`
2. `response.tool_call.delta`
3. `response.tool_call.completed`
4. `response.tool_call.error`

The profile defines the wire shape of tool-call events. It does not execute tools and does not
define the security boundary for tool execution.

## 13. Capability Document

Adapters advertise profile support with a readable JSON capability document:

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

The capability document must be the source of truth for conformance selection and SDK feature
probes.

## 14. Conformance Strategy

Conformance cases use readable recipes, not hard-coded hex fixtures.

Each recipe describes:

1. Profile operation.
2. Request body.
3. Expected event sequence.
4. Expected terminal outcome.
5. Optional diagnostics expectations.
6. Optional negative cases such as invalid body, unsupported model, cancellation, and malformed
   stream order.

The conformance suite can still emit machine-readable vectors, but the source of truth remains
parameterized and reviewable.

## 15. First Implementation Slice

The first implementation slice focuses on a vLLM adapter and Python SDK integration:

1. Level 1 `chat.completions.create` request mapping.
2. Streaming text deltas.
3. Non-streaming completion body.
4. Cancellation.
5. Error body mapping.
6. Usage summary.
7. Tool-call event pass-through when vLLM and the selected model expose tool-call data.
8. Capability document generation for conformance and SDK probes.

Level 2 and Level 3 can be implemented after the Level 1 adapter is stable and benchmarked.
