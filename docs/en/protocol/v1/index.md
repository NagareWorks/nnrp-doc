---
prev: false
next:
  text: Quick Start
  link: /en/protocol/v1/quick-start/
---

# NNRP/1

This is the only current public version line. The sidebar keeps the “Preview” label only because the stable release marker is not frozen yet; for readers and integrators, this page is simply the entry for the current `NNRP/1` contract.

If you only remember a few things, start with these four:

1. The public layer is no longer tied to one product shape; `tensor` and `token` are peer standard profiles.
2. Connection, session, and operation are explicit layers, with result pumping and `FLOW_UPDATE` as part of the standard host model.
3. The transport layer is no longer hard-wired to one path; the protocol explicitly supports probing, selection, and migration.
4. The common header still keeps its 40-byte skeleton and self-describing length model for transport-agnostic parsing.

## Current Public Contract

### 1. A profile-neutral public layer

In the current public contract, the public layer is no longer designed around one neural-rendering-specific task shape. `tensor` and `token` are treated as peer profiles, while the common layer focuses on submission, results, flow control, status, and interpretation context.

This changes two things immediately:

1. Profile-specific differences stay inside the profile and schema surface instead of leaking into the common header and control plane.
2. The protocol becomes a reusable application-layer cooperation surface for real-time AI runtimes rather than a private interface of one runtime.

### 2. A multi-layer execution model with explicit flow control

The current version no longer assumes “send one request, wait for one result”. The standard integration model is explicitly split into:

1. connection: transport carrier, common header, and multi-session container.
2. session: default profile, schema, budget window, and credit boundary.
3. operation: one actual submission and one result lifecycle.

At the same time, `FLOW_UPDATE` is no longer treated as an implementation detail. It is the protocol-level surface for backpressure and credit updates. That gives different hosts, servers, and language implementations one shared way to express slowing down, resuming, quota changes, and scoped blocking.

### 3. Transport strategy and session continuity

In modern network conditions, transport choice cannot stay hard-coded. The current public contract puts transport probing, policy declaration, and migration into the protocol itself. The point is not just to add another connection method. The point is to keep the protocol usable under real network constraints.

This capability covers at least three pieces:

1. Clients may run `TRANSPORT_PROBE / TRANSPORT_PROBE_ACK` before the main handshake, using payload sizes close to real traffic for path selection.
2. `CLIENT_HELLO / SERVER_HELLO_ACK` must be able to express `transport_policy`, `preferred_transport_id`, and the final `active_transport_id`.
3. If path quality changes during runtime, the protocol can continue one session across transport bindings through `SESSION_MIGRATE / SESSION_MIGRATE_ACK`.

For the background, on-wire shape, and host-visible behavior, continue with the transport strategy and probing page.

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
</div>
