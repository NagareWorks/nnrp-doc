# SDK Integration Guide — For SDK Authors

<div class="page-note">
This page documents the current formal integration model for SDK repositories. If you are maintaining the suite itself, see <a href="./manifests">Manifests Reference</a>.
</div>

## Integration Rules

When an SDK repository integrates conformance, these boundaries are mandatory:

1. Conformance must run in a **dedicated CI job**, not inside the main unit-test or coverage job.
2. Execution orchestration is owned by the `run-conformance` action provided by `nnrp-conformance`.
3. The SDK repository provides a capability manifest and, when behavior validation is enabled, an
   adapter command.
4. SDK-local pytest, xUnit, or other language-native tests must not replace the suite-owned
   execution plan and result schema.

## Integration Contract

The suite owns baseline selection, canonical vector generation, execution-plan creation, and result
validation. SDK repositories own only their implementation-specific adapter entrypoint and any
evidence files they choose to attach.

| Surface               | Responsibility                                                              | What the suite exchanges with the implementation repository                  |
| --------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| capability selection  | Decide which public cases are selected for this implementation              | capability manifest, conformance report                                      |
| canonical vectors     | Produce deterministic byte-level fixtures from readable recipes             | suite-generated vector manifest                                              |
| adapter execution     | Execute selected dynamic behavior cases and return machine-readable results | execution plan, adapter command, case-result report                          |
| benchmark execution   | Measure selected latency and throughput scenarios                           | benchmark plan, benchmark command, benchmark result report                   |
| API profile execution | Validate an adapter-level OpenAI-compatible API surface                     | API profile capability manifest, profile execution plan, API profile results |

---

## Step 1: Create your capability manifest

Create `conformance/<protocol-version>.capabilities.json` in your repository root, for example
`conformance/nnrp-1-preview3.capabilities.json`. The path is conventional and is passed into the
suite action via `capabilities-path`.

If you do not want to hand-write the JSON, start with the
[Capability Manifest Generator](./capability-manifest-generator) and then cross-check the selected
tokens against the versioned capability catalog.

### Capability Manifest Field Reference

| Field                 | Type            | Required | Valid values             | Description                                                                                                                                        |
| --------------------- | --------------- | -------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$schema`             | string          | no       | URI                      | JSON Schema reference.                                                                                                                             |
| `implementation_name` | string          | **yes**  | non-empty string         | Canonical short name for your implementation, e.g. `nnrp-py` or `nnrp-cs`.                                                                         |
| `protocol_version`    | string          | **yes**  | non-empty string         | Target protocol line. Must exactly match the suite action's `protocol-version`.                                                                    |
| `supports`            | array of string | **yes**  | unique capability tokens | Capabilities your implementation has completed and is willing to claim publicly. Unclaimed capabilities become `not_claimed`, not silently passed. |

### Find capability tokens by version

Capability tokens are now documented in the versioned capability catalog instead of being hard-coded
inside the SDK integration page. That keeps preview2 and preview3 tokens from being mixed together,
and it lets each version explain the exact semantics of the same token name independently.

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

::: tip Combination rules matter Some cases are selected only when multiple tokens are claimed
together. For example, the inline tensor path is selected with `frame_submit.tensor.inline` and
`result_push.basic`. Check the version page directly before editing `supports`. :::

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

::: warning Claim only what is complete Claiming a capability means accepting a hard CI gate for
every `mandatory` case mapped to that token. :::

---

## Step 2: Implement the SDK adapter command

The suite action does not call your test framework directly. It calls an adapter command provided by
your SDK repository. That command must consume the suite-owned execution plan and emit a case-result
report in the shared schema.

### Command contract

Your command must support at least these arguments:

| Environment variable               | Required | Description                                                             |
| ---------------------------------- | -------- | ----------------------------------------------------------------------- |
| `NNRP_CONFORMANCE_ADAPTER_PLAN`    | **yes**  | Absolute path to the suite-generated execution plan JSON.               |
| `NNRP_CONFORMANCE_ADAPTER_RESULTS` | **yes**  | Absolute path where the adapter must write the case-result report JSON. |

The output file must satisfy all of the following:

1. UTF-8 JSON, preferably without BOM.
2. Top-level fields must include `protocol_version`, `implementation_name`, and `results`.
3. Each result entry must include `id` and `outcome`.
4. Result ids must match the execution-plan case ids exactly.

### Recommended command shapes

Python:

```bash
python -m nnrp.tools.adapter_conformance
```

C#:

```powershell
dotnet run --project tools/Nnrp.ConformanceAdapter/Nnrp.ConformanceAdapter.csproj
```

::: tip Do not add embedded conformance tests here The formal integration contract is “suite-owned
plan + adapter command + suite-validated results”. Local unit and integration tests still matter,
but they are not the shared conformance surface. :::

---

## Step 3: Use the suite runner for local debugging

The formal CI path should use the suite action. The commands below are for local debugging and
manual inspection only.

::: tip Replace these with your target baseline Substitute `<protocol-version>`,
`<path-to-protocol-manifest>`, and `<path-to-recipe>` with the version line you are currently
integrating. :::

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
  --recipe <path-to-nnrp-conformance>/protocol/<protocol-version>/vectors/semantic-vectors.json \
  --output /tmp/canonical-vectors.json
```

### `verify-vectors` — confirm canonical determinism

```bash
cargo run \
  --manifest-path <path-to-nnrp-conformance>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  verify-vectors \
  --recipe <path-to-nnrp-conformance>/protocol/<protocol-version>/vectors/semantic-vectors.json \
  --manifest /tmp/canonical-vectors.json
```

### `validate-adapter-results` — validate adapter output

```bash
cargo run \
  --manifest-path <path-to-nnrp-conformance>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  validate-adapter-results \
  --plan /tmp/adapter-plan.json \
  --results /tmp/adapter-results.json
```

### SDK benchmark command

When a suite-owned benchmark plan is enabled, the SDK command consumes
`NNRP_CONFORMANCE_BENCHMARK_PLAN` or `--plan` and writes `NNRP_CONFORMANCE_BENCHMARK_RESULTS` or
`--output`.

Python:

```bash
python -m nnrp.tools.benchmark \
  --plan /tmp/benchmark-plan.json \
  --output /tmp/benchmark-results.json
```

### OpenAI API profile plan

Adapters that expose an OpenAI-compatible NNRP API surface provide a separate API profile capability
manifest. The runner combines it with the OpenAI profile suite manifest and emits recipe-level
cases.

```bash
cargo run \
  --manifest-path <path-to-nnrp-conformance>/Cargo.toml \
  -p nnrp-conformance-runner \
  -- \
  api-profile-plan \
  --protocol <path-to-nnrp-conformance>/protocol/nnrp-1-preview3/manifest.json \
  --profile <path-to-nnrp-conformance>/profiles/openai-compatible/1/manifest.json \
  --capabilities conformance/openai-compatible-1.api-capabilities.json \
  --output /tmp/api-profile-plan.json
```

The adapter command should consume the plan, execute each recipe against its OpenAI-compatible NNRP
surface, and write API profile results with ids copied exactly from the plan.

---

## Step 4: Wire CI through the suite-owned action

### Recommended structure

1. Keep your language-native `test` or `coverage` job focused on repository-local validation.
2. Add a separate `conformance` job.
3. In that job, checkout the suite repository and call `run-conformance`.
4. Pass your adapter command through `adapter-command`.

### Key `run-conformance` inputs

| Input               | Description                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `protocol-version`  | Target protocol line, e.g. `nnrp-1-preview3`.                                                                                                                                                                                              |
| `capabilities-path` | Path to your capability manifest.                                                                                                                                                                                                          |
| `working-directory` | Directory in which the adapter command should run.                                                                                                                                                                                         |
| `artifact-name`     | Artifact name used for reports and generated manifests. The default recommendation is a generic name such as `<repo>-conformance`; only append the version when one workflow intentionally publishes multiple protocol lines side by side. |
| `adapter-command`   | Command that consumes `NNRP_CONFORMANCE_ADAPTER_PLAN` and writes `NNRP_CONFORMANCE_ADAPTER_RESULTS`.                                                                                                                                       |

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
        run: <install the runtime your SDK adapter needs>

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
          adapter-command: <your adapter command>
```

---

## Common errors and resolutions

| Error                                                          | Cause                                                                                             | Resolution                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `protocol version mismatch`                                    | Capability manifest, suite action input, and adapter result use different version strings.        | Align `protocol-version`, the capability manifest's `protocol_version`, and the result report. |
| `adapter-command` exits successfully but no output file exists | The adapter did not write the expected result path.                                               | Ensure the command writes exactly to `NNRP_CONFORMANCE_ADAPTER_RESULTS`.                       |
| JSON parse fails at column 1                                   | The output file contains a BOM or is not valid JSON.                                              | Emit UTF-8 JSON without BOM and return a non-zero exit code on adapter failure.                |
| Result ids do not match                                        | The adapter returned local private ids instead of plan case ids.                                  | Copy the exact `id` values from the execution plan.                                            |
| All cases are `not_claimed`                                    | The capability manifest's `supports` list is empty or mismatched for the chosen protocol version. | Verify `supports` and `protocol_version`.                                                      |
