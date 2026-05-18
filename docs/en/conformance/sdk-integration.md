# SDK Integration Guide — For SDK Authors

<div class="page-note">
This page is for engineers who have an NNRP SDK implementation and want to wire it up against the shared conformance suite. If you are maintaining the conformance suite itself (writing case manifests, protocol manifests, vector recipes), see <a href="./manifests">Manifests Reference</a> instead.
</div>

## What you need to do

Integrating conformance into an SDK repository involves four steps:

1. **Create a capability manifest** in your repository declaring which protocol capabilities you currently support.
2. **Run the conformance runner** with your capability manifest to get a coverage report.
3. **Add the preview2 vector test** that verifies your wire encoding against the generated golden vectors.
4. **Wire both into CI** so that coverage and vector correctness are gated on every push.

The remainder of this page gives exact instructions for each step.

---

## Step 1: Create your capability manifest

Create a file at `conformance/nnrp-1-preview2.capabilities.json` (or `nnrp-1-preview3`, depending on your target) in your repository root. The path is conventional but the runner accepts any path via `--capabilities`.

### Capability Manifest Field Reference

| Field | Type | Required | Valid values | Description |
|---|---|---|---|---|
| `$schema` | string | no | URI | JSON Schema reference. |
| `implementation_name` | string | **yes** | non-empty string | The canonical short name for your implementation. Used in all report output and CI logs. Convention: use the public package or repository name, e.g. `nnrp-py`, `nnrp-cs`. Do not use a version suffix here; `protocol_version` carries that. |
| `protocol_version` | string | **yes** | non-empty string | The protocol version line you are targeting. Must exactly match the `protocol_version` in the runner's `--protocol` argument. E.g. `nnrp-1-preview2`. Any mismatch is an immediate runner error. |
| `supports` | array of string | **yes** | unique capability tokens | Declares which protocol capabilities your implementation has completed and is willing to claim publicly. Each token must match a known capability string for the targeted protocol version. Unknown tokens are accepted but do not activate any cases. |

### Valid capability tokens for `nnrp-1-preview2`

The following tokens are defined in the preview2 case manifests. Only tokens you claim become hard-gated in CI.

<table class="protocol-table">
  <thead>
    <tr>
      <th>Token</th>
      <th>Layer</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>body_region.prelude</code></td><td>L0</td><td>Encode and decode the body-region prelude layout covering inline, reference, and typed payload regions.</td></tr>
    <tr><td><code>cache.lifecycle</code></td><td>L1</td><td>Full cache entry lifecycle: allocate, pin, release, and namespace management.</td></tr>
    <tr><td><code>control.client_hello</code></td><td>L0 / L1</td><td>Pack and parse the CLIENT_HELLO fixed metadata block.</td></tr>
    <tr><td><code>control.session_patch_ack</code></td><td>L0 / L1</td><td>Pack and parse the SESSION_PATCH_ACK fixed metadata block.</td></tr>
    <tr><td><code>flow_update</code></td><td>L0 / L1</td><td>Round-trip the FLOW_UPDATE packet including credit delta encoding.</td></tr>
    <tr><td><code>frame_submit.mixed</code></td><td>L0 / L1</td><td>Encode and decode FRAME_SUBMIT in mixed submit mode (inline + reference regions).</td></tr>
    <tr><td><code>object_reference.cache</code></td><td>L0</td><td>Pack and parse the object-reference block used for cache-backed body regions.</td></tr>
    <tr><td><code>payload.tensor</code></td><td>L0 / L1</td><td>Encode and decode tensor profile payloads including descriptor, schema, and body layout.</td></tr>
    <tr><td><code>payload.typed</code></td><td>L0 / L1</td><td>Encode and decode typed payload descriptors (non-tensor profile).</td></tr>
    <tr><td><code>result_hint</code></td><td>L0 / L1</td><td>Round-trip the RESULT_HINT packet including hint metadata.</td></tr>
    <tr><td><code>result_push.degraded</code></td><td>L1</td><td>Encode and decode RESULT_PUSH in degraded (fallback) mode.</td></tr>
    <tr><td><code>result_push.partial</code></td><td>L1</td><td>Encode and decode RESULT_PUSH in partial delivery mode.</td></tr>
    <tr><td><code>result_push.stale_reuse</code></td><td>L1</td><td>Encode and decode RESULT_PUSH with stale-frame reuse semantics.</td></tr>
    <tr><td><code>transport.probe</code></td><td>L3</td><td>Implement the transport probe handshake and probe result handling.</td></tr>
    <tr><td><code>transport.quic</code></td><td>L3</td><td>QUIC transport adapter with stream multiplexing and 0-RTT paths.</td></tr>
    <tr><td><code>transport.tcp</code></td><td>L3</td><td>TCP transport adapter with framing and reconnect handling.</td></tr>
  </tbody>
</table>

### Example capability manifest

```json
{
  "$schema": "../../schemas/capability-manifest.schema.json",
  "implementation_name": "nnrp-py",
  "protocol_version": "nnrp-1-preview2",
  "supports": [
    "body_region.prelude",
    "cache.lifecycle",
    "control.client_hello",
    "control.session_patch_ack",
    "flow_update",
    "frame_submit.mixed",
    "object_reference.cache",
    "payload.tensor",
    "payload.typed",
    "result_hint",
    "result_push.degraded",
    "result_push.partial",
    "result_push.stale_reuse",
    "transport.probe",
    "transport.quic",
    "transport.tcp"
  ]
}
```

::: warning Claim only what is complete
Do not list capabilities you have not fully implemented. Claiming a capability means accepting a hard CI gate for every `mandatory` case associated with that token. Partial or in-progress capabilities should be added once the implementation is stable.
:::

---

## Step 2: Run the conformance runner locally

The conformance runner is a Rust CLI in `nnrp-conformance`. You need the repository checked out locally. Set the `NNRP_CONFORMANCE_ROOT` environment variable to the checkout path, or pass paths explicitly.

### `summary` — execution plan and coverage report

```bash
cargo run \
  --manifest-path <path-to-nnrp-conformance>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  summary \
  --protocol <path-to-nnrp-conformance>/protocol/nnrp-1-preview2/manifest.json \
  --capabilities conformance/nnrp-1-preview2.capabilities.json
```

Output is a JSON execution plan printed to stdout. It lists each case under one of three categories:

| Category | Meaning |
|---|---|
| `selected` | Your implementation claimed all required capabilities. This case is hard-gated in CI. |
| `not_claimed` | At least one required capability was not declared. Not a failure; not yet in scope. |
| `informational` | `experimental` or `deprecated` case. Printed for awareness only. |

### `generate-preview2-vectors` — produce golden vector artifact

Generate the canonical wire vector manifest from the semantic recipe file. Run this before running vector-verification tests.

```bash
cargo run \
  --manifest-path <path-to-nnrp-conformance>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  generate-preview2-vectors \
  --semantic <path-to-nnrp-conformance>/protocol/nnrp-1-preview2/vectors/semantic-vectors.json \
  --output /tmp/preview2-golden-vectors.json
```

The output file (`/tmp/preview2-golden-vectors.json`) is the vector manifest your SDK test reads via the `NNRP_CONFORMANCE_VECTOR_MANIFEST` environment variable.

### `verify-preview2-vectors` — re-run determinism check

Verifies that re-generating from the same recipe produces an identical manifest. Use this to confirm your local environment is in a valid state before filing a bug report.

```bash
cargo run \
  --manifest-path <path-to-nnrp-conformance>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  verify-preview2-vectors \
  --semantic <path-to-nnrp-conformance>/protocol/nnrp-1-preview2/vectors/semantic-vectors.json \
  --manifest /tmp/preview2-golden-vectors.json
```

---

## Step 3: Implement the vector round-trip test

Your SDK must include a test that:

1. Reads the generated vector manifest from `NNRP_CONFORMANCE_VECTOR_MANIFEST`.
2. Regenerates each vector using your own implementation (pack / serialize / encode, depending on the SDK).
3. Asserts that your output hex matches the manifest's hex for every named vector.

The test must **skip gracefully** when `NNRP_CONFORMANCE_VECTOR_MANIFEST` is not set, so that local development without the conformance repo checked out still works.

### Python example

```python
import json
import os
from pathlib import Path
import pytest

def test_preview2_conformance_vectors_match_generated_manifest() -> None:
    manifest_path_value = os.environ.get("NNRP_CONFORMANCE_VECTOR_MANIFEST")
    if not manifest_path_value:
        pytest.skip("NNRP_CONFORMANCE_VECTOR_MANIFEST is not configured")

    manifest_path = Path(manifest_path_value)
    assert manifest_path.is_file(), f"manifest not found: {manifest_path}"

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["protocol_version"] == "nnrp-1-preview2"

    expected = {
        e["name"]: {"kind": e["kind"], "hex": e["hex"], "bytes": e["bytes"]}
        for e in manifest["vectors"]
    }
    actual = {
        v.name: {"kind": v.kind, "hex": v.hex_payload, "bytes": v.byte_length}
        for v in your_sdk.export_golden_vectors()
    }

    assert set(actual) == set(expected)
    for name, exp in expected.items():
        assert actual[name] == exp, f"vector mismatch: {name}"
```

### C# example

```csharp
[Fact]
public void Preview2ConformanceVectorsRoundTrip()
{
    var manifestPath = Environment.GetEnvironmentVariable("NNRP_CONFORMANCE_VECTOR_MANIFEST");
    if (string.IsNullOrEmpty(manifestPath)) return; // skip

    var manifest = JsonSerializer.Deserialize<VectorManifest>(File.ReadAllText(manifestPath));
    Assert.Equal("nnrp-1-preview2", manifest.ProtocolVersion);

    var expected = manifest.Vectors.ToDictionary(v => v.Name);
    var actual = YourSdk.ExportGoldenVectors().ToDictionary(v => v.Name);

    Assert.Equal(expected.Keys.Order(), actual.Keys.Order());
    foreach (var (name, exp) in expected)
    {
        Assert.Equal(exp.Hex, actual[name].Hex);
        Assert.Equal(exp.Bytes, actual[name].Bytes);
    }
}
```

---

## Step 4: Wire both into CI

### Environment variable

Your CI job must set:

| Variable | Value | Purpose |
|---|---|---|
| `NNRP_CONFORMANCE_VECTOR_MANIFEST` | A temp path, e.g. `${{ runner.temp }}/preview2-golden-vectors.json` | Points to the generated vector manifest artifact. The vector test reads this. |

### Required steps (in order)

1. **Checkout your implementation repository**
2. **Checkout `nnrp-conformance`** as a sibling (e.g. `path: nnrp-conformance`)
3. **Setup Rust toolchain** (needed for `cargo run`)
4. **Generate vectors** from the semantic recipe
5. **Run conformance summary** to produce the coverage report
6. **Run your test suite** (including the vector round-trip test)

### GitHub Actions example

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      NNRP_CONFORMANCE_VECTOR_MANIFEST: ${{ runner.temp }}/preview2-golden-vectors.json

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Checkout nnrp-conformance
        uses: actions/checkout@v4
        with:
          repository: NagareWorks/nnrp-conformance
          path: nnrp-conformance

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      # Step 4: generate vectors
      - name: Generate preview2 conformance vectors
        run: >-
          cargo run
          --manifest-path nnrp-conformance/Cargo.toml
          -p nnrp-conformance-runner
          --
          generate-preview2-vectors
          --semantic nnrp-conformance/protocol/nnrp-1-preview2/vectors/semantic-vectors.json
          --output ${{ runner.temp }}/preview2-golden-vectors.json

      # Step 5: coverage report
      - name: Preview2 conformance summary
        run: >-
          cargo run
          --manifest-path nnrp-conformance/Cargo.toml
          -p nnrp-conformance-runner
          --
          summary
          --protocol nnrp-conformance/protocol/nnrp-1-preview2/manifest.json
          --capabilities conformance/nnrp-1-preview2.capabilities.json

      # Step 6: test suite (vector test reads NNRP_CONFORMANCE_VECTOR_MANIFEST)
      - name: Run tests
        run: <your language's test command>
```

::: tip Step ordering matters
`generate-preview2-vectors` must complete before any test that reads `NNRP_CONFORMANCE_VECTOR_MANIFEST`. If the file does not exist when the test runs, the test will either fail with a file-not-found error or skip, depending on your implementation.
:::

---

## Common errors and resolutions

| Error | Cause | Resolution |
|---|---|---|
| `protocol version mismatch: expected nnrp-1-preview2, got nnrp-1-preview3` | `protocol_version` in your capability manifest does not match the `--protocol` argument. | Align both to the same version string. |
| Test skipped silently | `NNRP_CONFORMANCE_VECTOR_MANIFEST` is not set or is empty. | Verify the env var is exported to the test process. On GitHub Actions, confirm it is set at the `job` or `step` level, not just in a sibling job. |
| Vector name mismatch | Your SDK's export function returns different names than the manifest. | Ensure your export function uses stable, matching names from the recipe's `name` field. |
| `manifest not found: /tmp/preview2-golden-vectors.json` | Vector generation step did not run or failed silently. | Check the `generate-preview2-vectors` step's exit code and output. |
| All cases `not_claimed` | Capability manifest `supports` array is empty or `protocol_version` mismatches. | Verify both fields in your capability manifest file. |
