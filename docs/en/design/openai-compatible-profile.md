# NNRP OpenAI-Compatible Profile Draft

## 1. Positioning

This document defines a draft profile for carrying OpenAI-compatible AI API semantics over NNRP.

The profile does not clone the OpenAI HTTP transport. It preserves the request and response semantics that existing AI applications already understand, then maps those semantics onto NNRP sessions, frame submission, streaming result delivery, cancellation, flow control, and diagnostics.

The profile is intended to become the shared contract for:

1. OpenAI-compatible model serving adapters, including vLLM.
2. SDK helpers that expose familiar chat, response, embedding, and tool-call flows.
3. Conformance cases that validate semantic compatibility without hard-coding one server implementation.
4. Higher-level agent runtimes that need streaming, cancellation, usage accounting, and structured tool events.

## 2. Design Goals

1. Keep application payloads compatible with existing OpenAI-style request bodies where practical.
2. Use NNRP for transport semantics: sessions, flow control, result push, cancellation, cache hints, and diagnostics.
3. Avoid making HTTP status codes, SSE framing, or REST endpoint paths part of the protocol contract.
4. Support low-code conformance generation from readable request and event recipes.
5. Leave room for model-serving implementations to expose richer diagnostics without breaking OpenAI-compatible clients.

## 3. Non-Goals

1. This profile does not define model quality, sampling correctness, tokenizer behavior, or tool execution policy.
2. It does not require an implementation to expose every OpenAI API endpoint at once.
3. It does not require NNRP SDKs to mirror the exact class hierarchy or method names of any HTTP client library.
4. It does not freeze private adapter internals such as worker pools, batching strategy, GPU scheduling, or KV-cache layout.

## 4. Profile Identity

The profile identity should be stable and implementation-neutral:

| Field | Value |
| --- | --- |
| Profile name | `openai-compatible` |
| Profile family | `ai-api` |
| Primary schema encoding | JSON |
| Streaming event encoding | JSON event objects |
| Transport dependency | NNRP session and result stream |

An implementation may advertise supported operations with a capability document. The first useful capability set should include only the operations that are actually backed by conformance cases.

## 5. Operation Mapping

OpenAI-compatible operations map to NNRP frame submissions. The operation name is carried as structured submit metadata or as a well-known field in the typed payload envelope.

| OpenAI-compatible operation | NNRP operation name | Required in first profile cut |
| --- | --- | --- |
| Chat completions | `chat.completions.create` | Yes |
| Responses | `responses.create` | Yes, if the adapter target supports it |
| Embeddings | `embeddings.create` | Optional |
| Model list | `models.list` | Optional |
| Tool call streaming | Event subset of chat/responses | Yes for agent scenarios |

The profile should prefer semantic operation names over HTTP paths. For example, `/v1/chat/completions` becomes `chat.completions.create`.

## 6. Request Envelope

Each request is submitted as a single logical NNRP frame. The request body remains JSON-compatible with OpenAI-style clients:

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

The `body` object should preserve familiar fields such as `model`, `messages`, `input`, `temperature`, `top_p`, `max_tokens`, `tools`, `tool_choice`, `metadata`, and `stream` when the target operation supports them.

NNRP-specific concerns should not be mixed into the OpenAI-compatible body unless they are intentionally part of the public profile. Prefer NNRP metadata or capability negotiation for transport policy, timeout policy, cache hints, and diagnostics policy.

## 7. Streaming Response Mapping

HTTP SSE chunks map to NNRP result push events. The stream is ordered per submitted frame.

| Stream phase | NNRP delivery |
| --- | --- |
| First token or delta | `ResultPush` with a JSON event payload |
| Intermediate delta | Additional `ResultPush` messages |
| Tool call delta | `ResultPush` with a tool-call event object |
| Usage summary | Final or near-final `ResultPush` event |
| Completion | Terminal submit outcome |
| Failure | NNRP error plus profile error object where available |

Streaming event objects should be readable and recipe-friendly:

```json
{
  "type": "response.output_text.delta",
  "index": 0,
  "delta": "hello"
}
```

The exact event taxonomy should be kept small at first. The first mandatory event set should cover text deltas, tool-call deltas, usage summaries, completed results, and errors.

## 8. Non-Streaming Response Mapping

A non-streaming request returns one logical result payload. The result payload should preserve the OpenAI-compatible response shape for the selected operation.

The NNRP submit outcome owns transport-level success or failure. The profile response body owns application-level content such as generated text, choices, response items, usage, and finish reason.

## 9. Cancellation and Timeouts

OpenAI-compatible client cancellation maps to NNRP frame cancellation when the submitted frame is still active.

Timeouts should be expressed as client policy, not as an HTTP timeout clone. A timed-out client may cancel the active frame and should treat late result pushes for that frame as invalid unless the implementation has explicitly negotiated recovery behavior.

## 10. Error Mapping

NNRP owns protocol and transport failures. The OpenAI-compatible profile owns application-facing error objects.

| Failure kind | Preferred mapping |
| --- | --- |
| Malformed NNRP frame | NNRP protocol error |
| Unsupported profile operation | NNRP application error with profile error body |
| Invalid request body | Profile error body, terminal submit failure |
| Model overload or scheduling rejection | Profile error body plus NNRP diagnostic metadata |
| Transport loss | NNRP transport/session failure |

Profile error bodies should remain close to the familiar shape:

```json
{
  "error": {
    "type": "invalid_request_error",
    "code": "unsupported_model",
    "message": "The requested model is not available."
  }
}
```

## 11. Usage and Diagnostics

Usage data should be reported as profile payload data so existing clients can consume it:

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

NNRP diagnostics should carry transport and runtime information that OpenAI-compatible HTTP clients usually cannot see, such as scheduling hints, queue delay, selected transport, retry reason, cache behavior, and flow-control pressure.

## 12. Tool Calls

Tool calls should be represented as structured JSON events. The profile should support incremental tool-call deltas because agent runtimes need to display and route partial tool arguments.

Minimum event types:

1. Tool call started.
2. Tool call argument delta.
3. Tool call completed.
4. Tool call rejected or failed.

The profile defines the wire shape of tool-call events. It does not execute tools and does not define the security boundary for tool execution.

## 13. Conformance Strategy

Conformance cases should be readable recipes, not hard-coded hex fixtures.

Each recipe should describe:

1. Profile operation.
2. Request body.
3. Expected event sequence.
4. Expected terminal outcome.
5. Optional diagnostics expectations.
6. Optional negative cases such as invalid body, unsupported model, cancellation, and malformed stream order.

The conformance suite can still emit machine-readable vectors, but the source of truth should remain parameterized and reviewable.

## 14. First Implementation Slice

The first implementation slice should focus on vLLM and Python SDK integration:

1. `chat.completions.create` request mapping.
2. Streaming text deltas.
3. Non-streaming completion body.
4. Cancellation.
5. Error body mapping.
6. Usage summary.
7. Minimal tool-call event pass-through if supported by the target model serving stack.

After that slice is runnable, the profile can add broader responses API coverage and agent-specific event cases.

## 15. Open Questions

1. Whether `responses.create` should be mandatory in the first frozen profile or remain optional until more serving targets support it.
2. Whether embedding requests should share this profile or use a narrower `openai-compatible-embeddings` sub-profile.
3. How much runtime diagnostic metadata should be standardized versus left as implementation-specific extension data.
4. Whether profile capability negotiation should be a standalone manifest or a field inside the existing NNRP capability exchange.
5. Which event names should be mandatory for tool-call streaming across chat and responses style APIs.
