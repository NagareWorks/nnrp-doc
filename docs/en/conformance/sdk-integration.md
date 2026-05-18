# SDK Integration Guide — For SDK Authors

<div class="page-note">
This page documents the current integration model only: conformance is owned by the suite repository, while SDK repositories provide a capability manifest and an exporter command. If you are maintaining the suite itself, see <a href="./manifests">Manifests Reference</a>.
</div>

## Integration Rules

When an SDK repository integrates conformance, these boundaries are mandatory:

1. Conformance must run in a **dedicated CI job**, not inside the main unit-test or coverage job.
2. Execution orchestration is owned by the `run-conformance` action provided by `nnrp-conformance`.
3. The SDK repository only provides two inputs: a capability manifest and a command that exports the SDK's vector manifest.
4. SDK-local pytest, xUnit, or other language-native tests must no longer read suite-generated temporary vector manifests as the formal integration path.

---

## Step 1: Create your capability manifest

Create `conformance/nnrp-1-preview2.capabilities.json` in your repository root, or the equivalent file for your target protocol line. The path is conventional and is passed into the suite action via `capabilities-path`.

### Capability Manifest Field Reference

| Field | Type | Required | Valid values | Description |
|---|---|---|---|---|
| `$schema` | string | no | URI | JSON Schema reference. |
| `implementation_name` | string | **yes** | non-empty string | Canonical short name for your implementation, e.g. `nnrp-py` or `nnrp-cs`. |
| `protocol_version` | string | **yes** | non-empty string | Target protocol line. Must exactly match the suite action's `protocol-version`. |
| `supports` | array of string | **yes** | unique capability tokens | Capabilities your implementation has completed and is willing to claim publicly. Unclaimed capabilities become `not_claimed`, not silently passed. |

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
    <tr><td><code>frame_submit.mixed</code></td><td>L0 / L1</td><td>Encode and decode FRAME_SUBMIT in mixed submit mode.</td></tr>
    <tr><td><code>object_reference.cache</code></td><td>L0</td><td>Pack and parse the object-reference block used for cache-backed body regions.</td></tr>
    <tr><td><code>payload.tensor</code></td><td>L0 / L1</td><td>Encode and decode tensor profile payloads including descriptor, schema, and body layout.</td></tr>
    <tr><td><code>payload.typed</code></td><td>L0 / L1</td><td>Encode and decode typed payload descriptors.</td></tr>
    <tr><td><code>result_hint</code></td><td>L0 / L1</td><td>Round-trip the RESULT_HINT packet including hint metadata.</td></tr>
    <tr><td><code>result_push.degraded</code></td><td>L1</td><td>Encode and decode RESULT_PUSH in degraded mode.</td></tr>
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
Claiming a capability means accepting a hard CI gate for every `mandatory` case mapped to that token.
:::

---

## Step 2: Implement the SDK vector exporter command

The suite action does not call your test framework directly. It calls an exporter command provided by your SDK repository. That command must use your real SDK encoding implementation and emit a JSON manifest in the shared vector schema.

### Command contract

Your command must support at least these arguments:

| Argument | Required | Description |
|---|---|---|
| `--protocol-version` | **yes** | Target protocol line to export. Unsupported versions must fail immediately. |
| `--output` | **yes** | Output file path. The suite action passes `NNRP_CONFORMANCE_SDK_VECTOR_OUTPUT`; your command must write the manifest there. |

The output file must satisfy all of the following:

1. UTF-8 JSON, preferably without BOM.
2. Top-level fields must include at least `protocol_version`, `generator`, and `vectors`.
3. Each vector entry must include at least `name`, `kind`, `hex`, and `bytes`; `description` is optional.
4. Vector names must match the canonical recipe's stable names exactly.

### Recommended command shapes

Python:

```bash
python -m nnrp.tools.conformance --protocol-version nnrp-1-preview2 --output "$NNRP_CONFORMANCE_SDK_VECTOR_OUTPUT"
```

C#:

```powershell
dotnet run --project tools/Nnrp.ConformanceExporter/Nnrp.ConformanceExporter.csproj -- --protocol-version nnrp-1-preview2 --output $env:NNRP_CONFORMANCE_SDK_VECTOR_OUTPUT
```

::: tip Do not add embedded conformance tests here
The formal integration contract is now “exporter command + suite action”, not “pytest/xUnit reads a temporary manifest and re-checks it”. Local unit and integration tests still matter, but they are not the shared conformance surface.
:::

---

## Step 3: Use the suite runner for local debugging

The formal CI path should use the suite action. The commands below are for local debugging and manual inspection only.

### `summary` — inspect the execution plan

```bash
cargo run \
  --manifest-path <path-to-nnrp-conformance>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  summary \
  --protocol <path-to-nnrp-conformance>/protocol/nnrp-1-preview2/manifest.json \
  --capabilities conformance/nnrp-1-preview2.capabilities.json
```

### `generate-vectors` — produce the canonical vector manifest

```bash
cargo run \
  --manifest-path <path-to-nnrp-conformance>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  generate-vectors \
  --recipe <path-to-nnrp-conformance>/protocol/nnrp-1-preview2/vectors/semantic-vectors.json \
  --output /tmp/canonical-vectors.json
```

### `verify-vectors` — confirm canonical determinism

```bash
cargo run \
  --manifest-path <path-to-nnrp-conformance>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  verify-vectors \
  --recipe <path-to-nnrp-conformance>/protocol/nnrp-1-preview2/vectors/semantic-vectors.json \
  --manifest /tmp/canonical-vectors.json
```

### `compare-vector-manifests` — compare SDK output against canonical output

```bash
cargo run \
  --manifest-path <path-to-nnrp-conformance>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  compare-vector-manifests \
  --expected /tmp/canonical-vectors.json \
  --actual /tmp/sdk-vectors.json
```

---

## Step 4: Wire CI through the suite-owned action

### Recommended structure

1. Keep your language-native `test` or `coverage` job focused on repository-local validation.
2. Add a separate `conformance` job.
3. In that job, checkout the suite repository and call `run-conformance`.
4. Pass your exporter command through `sdk-vector-command`.

### Key `run-conformance` inputs

| Input | Description |
|---|---|
| `protocol-version` | Target protocol line, e.g. `nnrp-1-preview2`. |
| `capabilities-path` | Path to your capability manifest. |
| `working-directory` | Directory in which the exporter command should run. |
| `artifact-name` | Artifact name used for reports and generated manifests. |
| `sdk-vector-command` | Command that exports your SDK vector manifest. The suite action provides `NNRP_CONFORMANCE_SDK_VECTOR_OUTPUT`. |

### GitHub Actions example

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Run tests
        run: <your language-native test command>

  conformance:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Checkout nnrp-conformance action
        uses: actions/checkout@v4
        with:
          repository: <your-org>/nnrp-conformance
          path: nnrp-conformance-action

      - name: Setup language runtime
        run: <install the runtime your SDK exporter needs>

      - name: Run suite-owned conformance action
        uses: ./nnrp-conformance-action/.github/actions/run-conformance
        with:
          protocol-version: nnrp-1-preview2
          capabilities-path: conformance/nnrp-1-preview2.capabilities.json
          working-directory: .
          artifact-name: <repo>-conformance-preview2
          sdk-vector-command: <your exporter command>
```

---

## Common errors and resolutions

| Error | Cause | Resolution |
|---|---|---|
| `protocol version mismatch` | Capability manifest, suite action input, and exporter command use different version strings. | Align `protocol-version`, the capability manifest's `protocol_version`, and the exporter's argument. |
| `sdk-vector-command` exits successfully but no output file exists | The exporter ignored the `--output` path. | Ensure the command writes exactly to the path given by `NNRP_CONFORMANCE_SDK_VECTOR_OUTPUT`. |
| JSON parse fails at column 1 | The output file contains a BOM or is not valid JSON. | Emit UTF-8 JSON without BOM and return a non-zero exit code on exporter failure. |
| Vector names do not match | The SDK exporter uses local private names instead of canonical recipe names. | Export the exact stable `name` values from the canonical recipe. |
| All cases are `not_claimed` | The capability manifest's `supports` list is empty or mismatched for the chosen protocol version. | Verify `supports` and `protocol_version`. |
