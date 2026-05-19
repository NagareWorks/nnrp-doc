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

Create `conformance/<protocol-version>.capabilities.json` in your repository root, for example `conformance/nnrp-1-preview3.capabilities.json`. The path is conventional and is passed into the suite action via `capabilities-path`.

If you do not want to hand-write the JSON, start with the [Capability Manifest Generator](./capability-manifest-generator) and then cross-check the selected tokens against the versioned capability catalog.

### Capability Manifest Field Reference

| Field | Type | Required | Valid values | Description |
|---|---|---|---|---|
| `$schema` | string | no | URI | JSON Schema reference. |
| `implementation_name` | string | **yes** | non-empty string | Canonical short name for your implementation, e.g. `nnrp-py` or `nnrp-cs`. |
| `protocol_version` | string | **yes** | non-empty string | Target protocol line. Must exactly match the suite action's `protocol-version`. |
| `supports` | array of string | **yes** | unique capability tokens | Capabilities your implementation has completed and is willing to claim publicly. Unclaimed capabilities become `not_claimed`, not silently passed. |

### Find capability tokens by version

Capability tokens are now documented in the versioned capability catalog instead of being hard-coded inside the SDK integration page. That keeps preview2 and preview3 tokens from being mixed together, and it lets each version explain the exact semantics of the same token name independently.

<div class="doc-grid">
  <div class="doc-card">
    <h3><a href="./capabilities/">Catalog Overview</a></h3>
    <p>Start here for the rules behind capability tokens, `supports`, and always-on cases with no token.</p>
  </div>
  <div class="doc-card">
    <h3><a href="./capabilities/nnrp-1-preview2">nnrp-1-preview2</a></h3>
    <p>Full preview2 token table with combination rules, related cases, and detailed explanations.</p>
  </div>
  <div class="doc-card">
    <h3><a href="./capabilities/nnrp-1-preview3">nnrp-1-preview3</a></h3>
    <p>Preview3 capability catalog covering the current mandatory core plus optional and experimental tokens.</p>
  </div>
</div>

::: tip Combination rules matter
Some cases are selected only when multiple tokens are claimed together. For example, the preview2 primary result path depends on `result_push.partial`, `result_push.stale_reuse`, and `payload.tensor` at the same time. Check the version page directly before editing `supports`.
:::

### Example capability manifest

```json
{
  "$schema": "../../schemas/capability-manifest.schema.json",
  "implementation_name": "nnrp-py",
  "protocol_version": "nnrp-1-preview3",
  "supports": [
    "handshake.basic",
    "session.open_close",
    "frame_submit.tensor.inline",
    "result_push.basic"
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
python -m nnrp.tools.conformance --protocol-version "<protocol-version>" --output "$NNRP_CONFORMANCE_SDK_VECTOR_OUTPUT"
```

C#:

```powershell
dotnet run --project tools/Nnrp.ConformanceExporter/Nnrp.ConformanceExporter.csproj -- --protocol-version <protocol-version> --output $env:NNRP_CONFORMANCE_SDK_VECTOR_OUTPUT
```

::: tip Do not add embedded conformance tests here
The formal integration contract is now “exporter command + suite action”, not “pytest/xUnit reads a temporary manifest and re-checks it”. Local unit and integration tests still matter, but they are not the shared conformance surface.
:::

---

## Step 3: Use the suite runner for local debugging

The formal CI path should use the suite action. The commands below are for local debugging and manual inspection only.

::: tip Replace these with your target baseline
Substitute `<protocol-version>`, `<path-to-protocol-manifest>`, and `<path-to-recipe>` with the version line you are currently integrating. If you want a concrete recipe-backed example from the current repository, preview2 still provides `protocol/nnrp-1-preview2/vectors/semantic-vectors.json`.
:::

### `summary` — inspect the execution plan

```bash
cargo run \
  --manifest-path <path-to-nnrp-conformance>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  summary \
  --protocol <path-to-protocol-manifest> \
  --capabilities conformance/<protocol-version>.capabilities.json
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
| `artifact-name` | Artifact name used for reports and generated manifests. The default recommendation is a generic name such as `<repo>-conformance`; only append the version when one workflow intentionally publishes multiple protocol lines side by side. |
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

      - name: Resolve conformance baseline
        id: conformance-baseline
        shell: bash
        run: |
          capabilities_path="$(find conformance -maxdepth 1 -name '*.capabilities.json' | head -n 1)"
          test -n "$capabilities_path"
          protocol_version="$(basename "$capabilities_path" .capabilities.json)"
          echo "protocol_version=$protocol_version" >> "$GITHUB_OUTPUT"
          echo "capabilities_path=$capabilities_path" >> "$GITHUB_OUTPUT"

      - name: Run suite-owned conformance action
        uses: ./nnrp-conformance-action/.github/actions/run-conformance
        with:
          protocol-version: ${{ steps.conformance-baseline.outputs.protocol_version }}
          capabilities-path: ${{ steps.conformance-baseline.outputs.capabilities_path }}
          working-directory: .
          artifact-name: <repo>-conformance
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
