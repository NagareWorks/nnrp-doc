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