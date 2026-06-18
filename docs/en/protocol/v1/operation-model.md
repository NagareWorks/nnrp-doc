---
prev:
  text: Quick Start
  link: /en/protocol/v1/quick-start/
next:
  text: Transport Strategy and Probing
  link: /en/protocol/v1/transport-strategy/
---

# NNRP/1 Session and Operation Model

The current public version explicitly separates connection, session, and operation so each layer has a clear responsibility.

## Connection

The connection is the frame-carrier container. It handles message framing (packing, unpacking, byte-stream I/O) and hosts multiple sessions simultaneously. Connection-level `FLOW_UPDATE` applies to all sessions on that connection.

## Session

The session is the default-context container. It is responsible for:

1. Holding default profile, schema, budget window, priority class, and cache requirements.
2. Letting multiple operations share the same default interpretation context.
3. Serving as the unit for session-scope credit and state changes.

`SESSION_OPEN` is currently frozen to 48 bytes of fixed metadata, while `SESSION_OPEN_ACK` is 56 bytes. Their job is to establish default context, not to hide the first operation payload.

## Operation

The operation is the actual execution unit. It is responsible for:

1. Carrying the payload, schema override, or profile-local hint for one submission.
2. Owning its result stream, terminal semantics, and operation-scope `FLOW_UPDATE`.
3. Mapping cleanly to cancel, pause, resume, and completion state.

If you need the simplest host-side mapping:

1. One connection maps to one I/O loop.
2. One session maps to one set of default parameters and credit windows.
3. One operation maps to one user task, one inference, or one frame-level unit of work.
