---
prev: false
next:
  text: Quick Start
  link: /en/protocol/v1/quick-start/
---

# NNRP/1

This is the only current public version line. The sidebar keeps the “Preview” label only because the stable release marker is not frozen yet; for readers and integrators, this page is simply the entry for the current `NNRP/1` contract.

If you only remember a few things, start with these four:

1. `tensor` and `token` are peer standard profiles. The public layer no longer bakes in fields for any single use case.
2. Connection, session, and operation are three distinct layers. A real-time interaction is not "one request, one response"—it is a continuous submit loop, a result loop, and a control-message path running in parallel.
3. The transport layer is not hard-wired. The protocol supports path probing before the handshake and session migration at runtime, without dropping the connection.
4. The common header is fixed at 40 bytes with self-describing length fields, so the same parsing logic works over QUIC, TCP+TLS, or any other byte-stream transport.

## Current Public Contract

### 1. A payload-agnostic public layer

The public layer handles submission, results, flow control, and interpretation context—things that are common to all real-time AI tasks. `tensor`- and `token`-specific fields live inside their respective profiles and schemas, not in the common header. That means adding a new profile does not require touching the public layer.

### 2. A three-layer execution model with explicit flow control

Connection, session, and operation each have a clear scope: the connection is the transport container, the session holds context and default parameters, and the operation is the lifecycle of one submitted task.

Flow control is part of the protocol: `FLOW_UPDATE` can target the connection level, a session, or a single operation, and it explicitly tells the host to slow down, pause, or resume—rather than each implementation guessing from timeouts.

### 3. Transport strategy and session continuity

The protocol does not lock to one transport. Hosts can probe multiple path candidates (QUIC, TCP+TLS, etc.) before committing to a connection, and can migrate a live session to a different transport path later without tearing down the session.

More details on the transport strategy and probing page.

<div class="version-switch">
	<a href="/nnrp-doc/en/protocol/v1/quick-start/">
		<strong>Quick Start</strong>
		Follow the recommended minimal integration path for the current public version.
	</a>
	<a href="/nnrp-doc/en/protocol/v1/operation-model/">
		<strong>Session and Operation Model</strong>
		See how connection, session, and operation are separated and why the model is not synchronous request-response.
	</a>
	<a href="/nnrp-doc/en/protocol/v1/transport-strategy">
		<strong>Transport Strategy and Probing</strong>
		Understand why the protocol must support transport probing, dynamic path selection, and session migration.
	</a>
	<a href="/nnrp-doc/en/protocol/v1/cache-and-lease/">
		<strong>Cache Capabilities and Leases</strong>
		See why cache objects, object references, and lease contracts need to stay in the public protocol surface.
	</a>
	<a href="/nnrp-doc/en/protocol/v1/schema-registry/">
		<strong>Schema / Profile Registry</strong>
		See why type-system extension should go through a registry rather than keep inflating public enums.
	</a>
	<a href="/nnrp-doc/en/protocol/v1/flow-control-and-priority/">
		<strong>Flow Control and Priority</strong>
		See why backpressure, credit, and scheduling preference cannot stay hidden inside private local logic.
	</a>
</div>
