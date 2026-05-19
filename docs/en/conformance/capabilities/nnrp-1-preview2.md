# nnrp-1-preview2 Capability Catalog

<div class="page-note">
This page corresponds to `nnrp-conformance/protocol/nnrp-1-preview2/`. Its tokens come from four case manifests: `l0-wire-vectors.json`, `l1-control-plane.json`, `l1-data-plane.json`, and `l3-transport-smoke.json`.
</div>

## Always-on cases

Preview2 currently has one mandatory protocol-floor feature with no capability token: `header.fixed_shape`. It comes from `l0.header.fixed_shape.golden`, and because `required_capabilities` is empty, every implementation is checked against the fixed 40-byte common-header round-trip contract.

## Capability overview table

| Token | Layers | Status reach | Combination rule | Description |
|---|---|---|---|---|
| `body_region.prelude` | L0 | mandatory | none | Stable encoding layout for the body-region prelude. |
| `cache.lifecycle` | L1 | mandatory | none | Cache-object allocation, acknowledgement, invalidation, and namespace handling. |
| `control.client_hello` | L0 | mandatory | none | CLIENT_HELLO fixed metadata block. |
| `control.session_patch_ack` | L0 | mandatory | none | SESSION_PATCH_ACK fixed metadata block. |
| `flow_update` | L0 / L1 | mandatory | none | FLOW_UPDATE at both wire and semantic layers. |
| `frame_submit.mixed` | L0 / L1 | mandatory | must also claim `payload.tensor` | The mixed-submit FRAME_SUBMIT hot path. |
| `object_reference.cache` | L0 / L1 | mandatory + optional | the L1 optional case also needs `result_push.partial` | Cache object-reference blocks and result-body reference resolution. |
| `payload.tensor` | L0 / L1 | mandatory dependency | usually paired with `frame_submit.mixed`, `result_push.partial`, and `result_push.stale_reuse` | Dependency token for the tensor-profile main path. |
| `payload.typed` | L0 / L1 | mandatory + optional | none | Non-tensor typed payload descriptors and region packing. |
| `result_hint` | L0 / L1 | mandatory | none | RESULT_HINT wire shape and metadata semantics. |
| `result_push.degraded` | L1 | experimental | none | Degraded / fallback result path, currently informational only. |
| `result_push.partial` | L0 / L1 | mandatory + optional | the mandatory result path also needs `result_push.stale_reuse` and `payload.tensor` | Partial-delivery results. |
| `result_push.stale_reuse` | L0 / L1 | mandatory | must also claim `result_push.partial` and `payload.tensor` | Stale-frame reuse semantics. |
| `transport.probe` | L1 / L3 | optional | none | Probe metadata and transport-selection logic. |
| `transport.quic` | L3 | optional | none | QUIC smoke interoperability. |
| `transport.tcp` | L3 | optional | none | TCP smoke interoperability. |

## Detailed explanations

### `body_region.prelude`

Claiming this token means the implementation is ready to publicly guarantee the wire layout of the body-region prelude. Preview2 requires the inline, reference, and typed-payload region prefixes to preserve field order, length encoding, and flag layout without local variation.

### `cache.lifecycle`

This token covers the cache-object lifecycle rather than a single cache message in isolation. Once claimed, the repository accepts the mandatory `CACHE_PUT` → `CACHE_ACK` → `CACHE_INVALIDATE` semantic path together with namespace and object-state handling.

### `control.client_hello`

This token covers the fixed CLIENT_HELLO metadata block. The point is not business-level negotiation policy; the point is a frozen pack / parse contract for version range, bitmaps, cache parameters, target cadence, and related fixed-width fields.

### `control.session_patch_ack`

This token covers the SESSION_PATCH_ACK fixed metadata block, including patch masks, reject reasons, retry timing, and effective configuration fields. The implementation must both parse and re-emit the canonical wire shape.

### `flow_update`

`flow_update` spans both the L0 and L1 contract surface. L0 freezes the packet shape; L1 additionally validates scope, retry-after semantics, credit epoch handling, flags, and framed round-trip behavior.

### `frame_submit.mixed`

This is one of the core Preview2 submit-path tokens, but it never stands alone. The mandatory FRAME_SUBMIT cases only enter `selected` once `payload.tensor` is also claimed, because the path implicitly depends on the tensor descriptor / schema / body layout.

### `object_reference.cache`

This token has two layers. The first is the mandatory L0 object-reference block round-trip. The second is an optional L1 result-body resolution check. Claiming `object_reference.cache` alone selects the L0 mandatory case; claiming it together with `result_push.partial` also opts into the optional composite-body reference-resolution case.

### `payload.tensor`

`payload.tensor` is a dependency capability for the Preview2 hot path rather than a standalone vector page. In the current baseline it mainly exists to complete the `frame_submit.mixed` and `result_push.partial` / `result_push.stale_reuse` combinations, meaning the implementation accepts responsibility for the frozen tensor descriptor, schema, and body layout.

### `payload.typed`

This token covers non-tensor typed payload descriptor and region packing. Preview2 uses it for both mandatory L0 descriptor vectors and optional L1 region/frame preservation checks, which makes it suitable for implementations gradually adding token/audio/video/event style payload paths.

### `result_hint`

This token covers the full RESULT_HINT surface. L0 checks the fixed wire vector; L1 requires reason codes, fixed-width fields, and framed round-trip behavior to remain valid instead of merely surviving a happy-path parser.

### `result_push.degraded`

This is still experimental in Preview2. Claiming it does not create a mandatory gate, but it does move degraded / fallback result behavior into the informational report so SDKs can converge before the public surface is frozen.

### `result_push.partial`

This token means the implementation supports partial-delivery results. In the current baseline, however, the mandatory result path still needs `result_push.stale_reuse` and `payload.tensor` together with it. It also combines with `object_reference.cache` to decide whether the optional composite-body reference-resolution case becomes active.

### `result_push.stale_reuse`

This token isolates stale-frame reuse semantics. The current mandatory case binds it to `result_push.partial` and `payload.tensor` because Preview2's canonical result vector covers the combined partial + stale-reuse path rather than independent result sub-features.

### `transport.probe`

This token shows up in both L1 control-metadata validation and L3 transport-selection smoke logic. Claiming it means the implementation accepts the probe-message wire shape and the selection contract that ranks paths by success, throughput, and RTT.

### `transport.quic`

This token only affects an L3 optional smoke case. Once claimed, the repository is expected to bring up a minimal QUIC path and complete the shortest control plus submit/result interoperability loop.

### `transport.tcp`

This token is parallel to `transport.quic`, but targets TCP. Once claimed, the repository accepts the minimum TCP session bring-up, frame-boundary handling, and smoke-path interoperability checks.