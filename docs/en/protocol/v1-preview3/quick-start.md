# NNRP/1-preview3 Quick Start

From a host-integration perspective, the minimal working path is:

1. Establish a reliable byte-stream connection and complete `CLIENT_HELLO / SERVER_HELLO_ACK`.
2. Create a session with `SESSION_OPEN / SESSION_OPEN_ACK`, including the default profile, schema, and budget window.
3. Send `FRAME_SUBMIT` or another submit-class message to create an operation inside that session.
4. Run a result pump in parallel and keep receiving `RESULT_PUSH / RESULT_DROP / RESULT_HINT / FLOW_UPDATE`.
5. Adjust your sending behavior according to result state and `FLOW_UPDATE`.

The three most common mistakes are:

1. Treating NNRP as synchronous request-response instead of `submit pump + result pump + control path`.
2. Treating a session as if it were the operation itself.
3. Skipping schema/profile binding and directly decoding payloads through language-specific private assumptions.