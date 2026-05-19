# nnrp-1-preview3 Capability Catalog

<div class="page-note">
This page corresponds to `nnrp-conformance/protocol/nnrp-1-preview3/mandatory-core.json`. Compared with Preview2, the current Preview3 baseline is more tightly focused on the mandatory core, so there are fewer tokens and each token maps more directly to a public protocol surface.
</div>

## Always-on cases

Preview3 currently has two mandatory protocol-floor checks with no capability token: `header.roundtrip.basic` and `header.invalid_length.reject`. They require a stable common-header round-trip and correct rejection of packets whose declared length does not match the actual payload length.

## Capability overview table

| Token | Layers | Status reach | Combination rule | Description |
|---|---|---|---|---|
| `handshake.basic` | L1 | mandatory | none | Minimum handshake and capability negotiation flow. |
| `session.open_close` | L1 | mandatory | none | Session open, maintain, and close state machine. |
| `frame_submit.tensor.inline` | L1 | mandatory | must also claim `result_push.basic` | Minimum inline tensor submit path. |
| `result_push.basic` | L1 | mandatory | must also claim `frame_submit.tensor.inline` | Result return compatible with the minimum submit path. |
| `transport.quic` | L3 | optional | none | Preview3 minimum QUIC interoperability transport. |
| `transport.tcp` | L3 | optional | none | Preview3 minimum TCP interoperability transport. |
| `flow_update` | L1 | experimental | none | Flow-control semantics not yet frozen into the mandatory core. |

## Detailed explanations

### `handshake.basic`

This is the entry token for the Preview3 mandatory core. Claiming it means the implementation accepts a public CI contract for the minimum handshake, version confirmation, and capability-negotiation path rather than proving only that it can connect to itself.

### `session.open_close`

This token is about the state machine, not a single message type. The implementation must open a session, maintain protocol state, and close the session without violating the currently frozen Preview3 transition boundaries.

### `frame_submit.tensor.inline`

This is the current minimum data-plane submit capability in Preview3. It requires the implementation to accept an inline tensor submit packet and complete the round-trip in the same public semantic frame as the result path. Because that loop inherently depends on a result return, it is paired with `result_push.basic`.

### `result_push.basic`

This token means the implementation can return the minimum result packet shape. In the current baseline it is not validated independently from submit; the minimum submit/result path only becomes `selected` when `frame_submit.tensor.inline` is also claimed.

### `transport.quic`

Once claimed, this token activates the Preview3 QUIC optional smoke case. It covers the minimum interoperable bring-up rather than advanced transport optimizations; the goal is first to prove that different implementations can establish the same public path successfully.

### `transport.tcp`

This token mirrors `transport.quic`, but targets TCP. It remains optional today and is suitable for implementations that first deliver a minimal TCP path and want the extra coverage explicitly.

### `flow_update`

Preview3 flow-control semantics have not yet been folded into the mandatory core, so this token is still experimental. Claiming it does not create a hard gate yet, but it moves related behavior into the informational report so semantic drift can be observed before the surface is frozen.