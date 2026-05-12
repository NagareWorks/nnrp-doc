# NNRP/1-preview3 Session and Operation Model

preview3 explicitly separates connection, session, and operation so bindings stop collapsing them into one fuzzy concept.

## Connection

The connection is the transport-level container. It is responsible for:

1. Packing and unpacking the common header, control-plane messages, and data-plane messages.
2. Hosting multiple sessions instead of assuming a single active session.
3. Acting as the scope boundary for connection-level `FLOW_UPDATE`.

## Session

The session is the default-context container. It is responsible for:

1. Holding default profile, schema, budget window, priority class, and cache requirements.
2. Letting multiple operations share the same default interpretation context.
3. Serving as the unit for session-scope credit and state changes.

`SESSION_OPEN` freezes to 48 bytes of fixed metadata in the first round, while `SESSION_OPEN_ACK` freezes to 56 bytes.

## Operation

The operation is the actual execution unit. It is responsible for:

1. Carrying the payload, schema override, or profile-local hint for one submission.
2. Owning its result stream, terminal semantics, and operation-scope `FLOW_UPDATE`.
3. Mapping cleanly to cancel, pause, resume, and completion state.