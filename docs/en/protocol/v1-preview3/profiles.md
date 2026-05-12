# NNRP/1-preview3 Standard Profiles

preview3 makes the public layer profile-neutral. The first frozen standard profiles are `tensor` and `token`, treated as peers instead of forcing token or event semantics to masquerade as tensor add-ons.

| Profile | Targets | Minimal public semantics |
| --- | --- | --- |
| `tensor` | Numeric blocks and region-oriented payloads | shape/layout/dtype entry points, optional `partial / degraded / stale_reuse` |
| `token` | Discrete tokens or token chunks | sequence ranges, incremental output, completion state, stop-reason surface |

Key first-round boundaries:

1. `tensor` still allows coverage semantics, but coverage is no longer a mandatory public concept for every profile.
2. `token` uses `partial` to mean “this chunk is consumable while the sequence is still incomplete”.
3. Logits, candidate distributions, and runtime-private sampling state do not become public mandatory fields.