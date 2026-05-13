---
prev:
  text: NNRP/1
  link: /en/protocol/v1/
next:
  text: Session and Operation Model
  link: /en/protocol/v1/operation-model/
---

# NNRP/1 Quick Start

From a host-integration perspective, the minimal working path is:

1. Establish a reliable byte-stream connection and complete `CLIENT_HELLO / SERVER_HELLO_ACK`.
2. Create a session with `SESSION_OPEN / SESSION_OPEN_ACK`, including the default profile, schema, and budget window.
3. Send `FRAME_SUBMIT` or another submit-class message to create an operation inside that session.
4. Run a result pump in parallel and keep receiving `RESULT_PUSH / RESULT_DROP / RESULT_HINT / FLOW_UPDATE`.
5. Adjust your sending behavior according to result state and `FLOW_UPDATE`.

The three most common mistakes are:

1. **Treating NNRP as synchronous**: the correct integration runs three paths in parallel—a loop that sends work, a loop that reads results, and a path that processes `FLOW_UPDATE` and other control messages.
2. **Confusing session and operation**: a session is a persistent context container (like a conversation), an operation is a single task inside it. Sessions are opened once; operations are submitted many times.
3. **Skipping profile/schema binding**: payload field layouts are defined by the profile and schema, not by any language runtime's private conventions. Guessing at byte offsets is unreliable.

Minimum host requirements:

1. Keep a send loop and a result-reading loop that run independently without blocking each other.
2. Record each session's `profile_id / schema_id / schema_version` so schema mismatches are easy to diagnose.
3. Handle the four visible result types: `partial` (intermediate, safe to display), `terminal` (final frame), `drop` (discarded), `degraded` (lower-quality output).
4. Apply `FLOW_UPDATE` at the right scope—connection-level updates affect all sessions, session-level ones affect only that session.