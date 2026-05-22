# Use Cases and Boundaries

For users, the key question is not “what could this protocol theoretically do”, but “which scenarios fit it today, and which ones do not”.

## Better-fit scenarios today

### Real-time enhanced rendering

This is one of the most natural current fits for NNRP:

1. The host already has its own real-time render loop.
2. The AI runtime complements, reconstructs, or enhances selected visual outputs.
3. Both sides need to exchange small-to-medium payloads while explicitly managing latency, drops, fallbacks, and partial results.

### AI audio and video

Streaming audio/video processing, clip-based enhancement, subtitle or speaker events, and multimodal synchronization benefit from NNRP because:

1. Results can stream back incrementally.
2. Payload interpretation can live in profiles and schemas instead of one monolithic public shape.
3. Backpressure and credit stay visible to the host.

### AI NPCs and interactive agents

These scenarios often need token streams, structured events, tool calls, and persistent context. NNRP fits because:

1. The public layer is no longer tied to tensor-only rendering semantics.
2. A session can represent a longer-lived interaction context.
3. Results can combine incremental outputs, control signals, and structured events.

### AI-assisted navigation and spatial intelligence

This is not about traditional navigation services alone. It is about AI-heavy navigation and spatial-intelligence loops where:

1. The host continuously uploads position, local environment state, sensor summaries, or task context.
2. The runtime continuously returns route suggestions, spatial understanding, replanning, risk hints, or multimodal interaction events.
3. The protocol needs explicit sessions, incremental results, cache objects, and flow-control state.

### AI coding and multi-agent collaboration

NNRP is a good fit here because:

1. It allows long-lived context to stay at the session layer.
2. It allows one task to be split into multiple operations.
3. It allows collaboration to progress through streamed results, structured events, and control messages instead of one oversized RPC exchange.

One high-value direction is to use NNRP inside an AI coding-agent orchestrator. The orchestrator can run as a local service and expose an OpenRouter-style interface to IDEs, CLIs, or automation systems. The caller asks for a coding-agent capability; the local service chooses models, decomposes the task, schedules subagents, validates patches, and streams results back.

This makes the NNRP story concrete:

1. The orchestration model can be configured independently, for example using a stronger reasoning model for planning, review, and final decisions.
2. Subagents can bind different models to different capabilities, such as repository reading, semantic search, diff proposal, or test repair.
3. A non-AI diff checker, formatter, test runner, and coverage gate can act as a physical validation layer so hallucinated patches do not silently enter the final output.
4. Agent-to-agent communication can support both common gRPC / A2A paths and an NNRP path, making it possible to compare the effect of long-lived connections, multiple sessions, multiple operations, flow control, cancellation, recovery, and cache semantics.
5. A JavaScript / TypeScript SDK is a natural fit for this demo because many coding agents, IDE extensions, and local developer tools already live in the Node.js / TypeScript ecosystem.

For that reason, this is better treated as a comparison-oriented demo after preview3 is fully implemented: run the same coding tasks once over generic RPC / A2A and once over NNRP, then compare latency, repeated transfer, cancellation response, context reuse, patch correctness, and local validation overhead.

## High-value but still more future-facing

### Neural rendering in the cloud

This remains one of the highest-value narratives around NNRP, but for now it is better treated as a future-facing direction rather than the most practical first deployment target.

The reasons are straightforward:

1. Current uplink and downlink payloads are still large.
2. Existing open models are generally not yet as lightweight and real-time efficient as solutions like DLSS.
3. Protocol readiness alone does not remove the model and compute-cost constraints.

## Cases where NNRP is not the first choice

NNRP is usually not the best first pick when:

1. Requests are low frequency and synchronous responses are enough.
2. You do not need sessions, operations, streaming results, or flow-control semantics.
3. Plain HTTP/JSON already expresses the workload cleanly.

In those cases, HTTP or a simpler RPC model is usually the more direct choice.
