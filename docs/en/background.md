# Background and Intro

NNRP stands for `Neural Network Runtime Protocol`.

It is an application-layer protocol for real-time AI runtime cooperation. The core problem it solves: how a host (game engine, application, agent framework, etc.) submits work to an AI runtime, receives results, and manages flow control, caching, and payload interpretation—without every product having to invent its own private interface.

## Why NNRP exists

NNRP started from a concrete engineering goal: allowing lightweight, lower-performance devices to participate in higher-quality visual generation and real-time enhancement.

The protocol was originally designed by one engineer with strengths in cloud systems, AI models, and backend engineering, together with two engineers focused on game development and rendering. The earliest vision was:

1. Decouple higher-quality neural rendering capabilities from local hardware pressure.
2. Build a shared real-time protocol foundation for AR, immersive interaction, and longer-term virtual-world experiences.
3. Avoid re-inventing private “submit + result + flow control + interpretation” interfaces for every host, engine, and transport path.

As the design evolved, the protocol clearly grew beyond neural rendering alone. It can also serve real-time model requests, streaming results, multimodal runtime orchestration, and any scenario that needs explicit session, operation, and backpressure semantics.

## What NNRP is trying to solve

In short:

1. **Unified submission interface** — hosts are not tied to any one runtime's private RPC. They use a consistent protocol regardless of the implementation underneath.
2. **Streaming results** — results are not limited to one-request-one-response. The protocol naturally expresses incremental output, partial results, drops, rollbacks, and completion.
3. **Extensible payload interpretation** — what a payload means is described by profiles and schemas, not hard-coded into the public header for each business case.
4. **Explicit flow control** — rate limits and backpressure are not hidden inside local retry logic; the protocol itself expresses slow down, pause, and resume.
5. **Consistent implementations** — all NNRP/1 implementations should follow one protocol baseline rather than each building a "close enough" interpretation.

## What it is not

- Not a specialized protocol with hard-coded fields only for neural rendering.
- Not an interface designed only for offline batch jobs or one-shot synchronous inference.
- Not a replacement for existing application-layer protocols such as HTTP, WebSocket, or WebRTC, and not a transport-layer protocol either.

More precisely, NNRP is a **domain-level application-layer protocol** for AI model and runtime cooperation. It stabilizes AI runtime semantics such as submission, results, flow control, caching, payload interpretation, and operation lifecycle; the bytes underneath can run over QUIC, TCP+TLS, WebSocket, WebTransport, or another suitable transport binding.

<div class="page-note">
	For users, the most important mental model is that NNRP is a shared protocol skeleton for real-time AI runtime cooperation. The version pages build on top of that skeleton to describe the current public field boundaries, flow constraints, and frozen scope.
</div>
