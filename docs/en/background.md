# Background and Intro

NNRP stands for `Neural Network Runtime Protocol`.

It is not meant to be a temporary private interface for one SDK or one model format. It is an application-layer protocol surface for real-time AI runtime cooperation: how a host submits work, how a runtime returns results, and how both sides express flow control, status, caching, and payload interpretation in a stable way.

## Why NNRP exists

NNRP started from a concrete engineering goal: allowing lightweight, lower-performance devices to participate in higher-quality visual generation and real-time enhancement.

The protocol was originally designed by one engineer with strengths in cloud systems, AI models, and backend engineering, together with two engineers focused on game development and rendering. The earliest vision was:

1. Decouple higher-quality neural rendering capabilities from local hardware pressure.
2. Build a shared real-time protocol foundation for AR, immersive interaction, and longer-term virtual-world experiences.
3. Avoid re-inventing private “submit + result + flow control + interpretation” interfaces for every host, engine, and transport path.

As the design evolved, the protocol clearly grew beyond neural rendering alone. It can also serve real-time model requests, streaming results, multimodal runtime orchestration, and any scenario that needs explicit session, operation, and backpressure semantics.

## What NNRP is trying to solve

At a global level, NNRP addresses five recurring problems:

1. Giving hosts a unified way to submit real-time work instead of binding them to runtime-private RPC shapes.
2. Letting results stay incremental instead of collapsing everything into synchronous request-response.
3. Keeping payload interpretation out of the public layer by using profiles and schemas.
4. Making credit, backpressure, and flow control explicit instead of hiding them in SDK-private retry logic.
5. Keeping Python, C#, Rust, and future language bindings aligned to one protocol baseline.

## What it is not

NNRP is not:

1. A specialized protocol with hard-coded fields only for neural rendering.
2. An interface layer that only fits offline batch processing or one-shot synchronous inference.
3. A transport protocol that replaces HTTP, WebSocket, or WebRTC themselves.

More precisely, NNRP is a transport-agnostic application-layer protocol surface. It focuses on message shape, semantic boundaries, state machines, and interpretation rules; it can be bound to different reliable byte-stream carriers.

<div class="page-note">
	For users, the most important mental model is that NNRP is a shared protocol skeleton for real-time AI runtime cooperation. The version pages build on top of that skeleton to describe the current public field boundaries, flow constraints, and frozen scope.
</div>