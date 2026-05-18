# Manifests Reference — For Suite Authors

<div class="page-note">
This page is for people who maintain the conformance suite: writing protocol manifests, case manifests, semantic vector recipe files, and understanding the generated vector format. If you are an NNRP SDK developer integrating the suite into your own project, see <a href="./sdk-integration">SDK Integration Guide</a> instead.
</div>

The conformance suite is built around five JSON document types. Each type has a canonical JSON Schema located in `schemas/` inside the `nnrp-conformance` repository. This page documents every field, its valid values, and its semantics.

## 1. Protocol Manifest

**Schema:** `schemas/protocol-manifest.schema.json`  
**Example:** `protocol/nnrp-1-preview2/manifest.json`

The protocol manifest is the root entry point for one versioned baseline. The runner loads this file first and uses it to locate all other artifacts for that baseline.

### Field Reference

| Field | Type | Required | Valid values | Description |
|---|---|---|---|---|
| `$schema` | string | no | any URI | JSON Schema reference for IDE validation. Omit if not needed. |
| `protocol_version` | string | **yes** | non-empty string | Identifies the protocol version line, e.g. `nnrp-1-preview2`, `nnrp-1-preview3`. Must match the `protocol_version` in every referenced case manifest and in every capability manifest used against it. Version mismatch causes an immediate runner error. |
| `suite_version` | string | **yes** | non-empty string | Version of the conformance baseline itself (semver recommended, e.g. `0.1.0`). Bumped when a baseline changes its mandatory case set. |
| `status` | string | **yes** | `draft` \| `frozen` \| `deprecated` | Lifecycle state. `draft` baselines are under active development. `frozen` baselines accept no new mandatory cases. `deprecated` baselines are retained for reference only and should not be used in active CI. |
| `case_manifests` | array of string | **yes** | relative paths (≥1 item) | Paths to case manifest files relative to the directory containing this manifest. The runner loads all listed manifests. At least one entry is required. |
| `vector_recipe_manifests` | array of string | no | relative paths | Paths to semantic vector recipe files. These are human-authored source files used to generate canonical wire vectors deterministically. An empty array `[]` means no recipe-based generation is set up. |
| `vector_manifests` | array of string | **yes** | relative paths | Paths to pre-generated golden vector manifests. May be an empty array if all vectors are produced from `vector_recipe_manifests`. |
| `report_schema` | string | **yes** | relative path | Path to the JSON Schema file that describes the report output format for this baseline. |

### Example

```json
{
  "$schema": "../../schemas/protocol-manifest.schema.json",
  "protocol_version": "nnrp-1-preview2",
  "suite_version": "0.1.0",
  "status": "draft",
  "case_manifests": [
    "cases/l0-wire-vectors.json",
    "cases/l1-control-plane.json",
    "cases/l1-data-plane.json",
    "cases/l3-transport-smoke.json"
  ],
  "vector_recipe_manifests": [
    "vectors/semantic-vectors.json"
  ],
  "vector_manifests": [],
  "report_schema": "../../schemas/report.schema.json"
}
```

::: tip On `vector_recipe_manifests` vs `vector_manifests`
`vector_recipe_manifests` points to semantic recipe files that the runner can generate vectors from on demand. `vector_manifests` points to pre-generated artifacts. For preview2, all vectors are generated from recipes. For a frozen production baseline, you might pre-generate and check in the artifacts, leaving `vector_recipe_manifests` empty.
:::

---

## 2. Case Manifest

**Schema:** `schemas/case-manifest.schema.json`  
**Examples:** `protocol/nnrp-1-preview2/cases/l0-wire-vectors.json`, `l1-control-plane.json`, etc.

A case manifest groups a set of conformance cases that belong to the same layer or feature area. One baseline may reference multiple case manifests. Each must declare the same `protocol_version` as the protocol manifest.

### Top-level Fields

| Field | Type | Required | Valid values | Description |
|---|---|---|---|---|
| `$schema` | string | no | any URI | JSON Schema reference. |
| `protocol_version` | string | **yes** | non-empty string | Must exactly match the `protocol_version` in the parent protocol manifest. |
| `manifest_name` | string | **yes** | non-empty string | A short identifier for this case group, e.g. `l0-wire-vectors`. Used in runner output to label which case file a case came from. |
| `cases` | array of object | **yes** | ≥0 items | The list of conformance case definitions. |

### Case Object Fields

Each element of `cases` defines one conformance test.

| Field | Type | Required | Valid values | Description |
|---|---|---|---|---|
| `id` | string | **yes** | non-empty, stable string | A globally unique, stable identifier for this case, e.g. `l0.header.fixed_shape.golden`. IDs must not change after a baseline is published. Convention: `<layer>.<feature>.<variant>`. |
| `layer` | string | **yes** | `L0` \| `L1` \| `L2` \| `L3` \| `L4` | Protocol layer this case validates. `L0` = wire encoding; `L1` = control/data plane semantics; `L2` = session semantics; `L3` = transport semantics; `L4` = full end-to-end flows. |
| `status` | string | **yes** | `mandatory` \| `optional` \| `experimental` \| `deprecated` | Case lifecycle status. `mandatory` cases are hard-gated in CI for any implementation that claims the required capabilities. `optional` cases are selected when capabilities are claimed but do not block CI on failure. `experimental` and `deprecated` cases appear in informational output only. |
| `feature` | string | **yes** | non-empty string | The public capability label this case represents, e.g. `header.fixed_shape`, `control.client_hello`. Serves as the human-readable grouping label in reports. |
| `required_capabilities` | array of string | **yes** | capability strings (may be empty) | The capability tokens an implementation must claim in its capability manifest before this case enters the `selected` execution set. An empty array `[]` means the case always runs, regardless of capability declarations. |
| `description` | string | **yes** | non-empty string | A human-readable description of what this case validates. Written from the perspective of a reader who has not seen the implementation. |

### Example

```json
{
  "$schema": "../../../schemas/case-manifest.schema.json",
  "protocol_version": "nnrp-1-preview2",
  "manifest_name": "l0-wire-vectors",
  "cases": [
    {
      "id": "l0.header.fixed_shape.golden",
      "layer": "L0",
      "status": "mandatory",
      "feature": "header.fixed_shape",
      "required_capabilities": [],
      "description": "Parse and re-emit the fixed 40-byte Preview2 common header without changing any frozen fields."
    },
    {
      "id": "l0.control.client_hello.golden",
      "layer": "L0",
      "status": "mandatory",
      "feature": "control.client_hello",
      "required_capabilities": ["control.client_hello"],
      "description": "Pack and parse the Preview2 CLIENT_HELLO fixed metadata golden vector."
    },
    {
      "id": "l0.result_push.metadata.golden",
      "layer": "L0",
      "status": "mandatory",
      "feature": "result_push.partial_stale",
      "required_capabilities": [
        "result_push.partial",
        "result_push.stale_reuse",
        "payload.tensor"
      ],
      "description": "Encode and decode the Preview2 RESULT_PUSH metadata golden vector for partial stale-reuse results."
    }
  ]
}
```

::: warning On `required_capabilities` and case selection
A case with `required_capabilities: []` is selected for **every** implementation regardless of what it declares. Use this only for universal wire-format cases (e.g. the common header), never for feature-specific cases. If a capability is required to parse the payload, list it explicitly.
:::

---

## 3. Semantic Vector Recipe Manifest

**Schema:** `schemas/preview2-vector-recipes.schema.json`  
**Example:** `protocol/nnrp-1-preview2/vectors/semantic-vectors.json`

The semantic vector recipe manifest is a human-authored source file that describes how to generate canonical wire vectors deterministically. The runner reads this file and produces a `vector-manifest.json` artifact. The generated artifact is then consumed by SDK tests.

This design means no binary or hex payloads are checked in to the repository. The source of truth is the human-readable recipe.

### Top-level Fields

| Field | Type | Required | Valid values | Description |
|---|---|---|---|---|
| `$schema` | string | no | any URI | JSON Schema reference. |
| `protocol_version` | string | **yes** | `nnrp-1-preview2` | Must be exactly `nnrp-1-preview2`. This schema is version-specific. |
| `vectors` | array of object | **yes** | ≥1 items | List of vector recipe entries. |

### Recipe Object Fields

Each vector recipe entry describes how to build one canonical wire sample. Fields vary by `recipe_type`; the three mandatory fields are common to all types.

| Field | Type | Required | Description |
|---|---|---|---|
| `recipe_type` | string | **yes** | Selects the builder function. Valid values and the additional fields they require are documented below. |
| `name` | string | **yes** | The stable name used to identify this vector in reports and SDK test assertions. Convention: `<scope>.<category>.<identifier>`. |
| `description` | string | **yes** | Human-readable description of what this vector represents. |

#### `recipe_type: "header"`

Builds a standalone common header golden vector.

| Additional field | Type | Description |
|---|---|---|
| `version_major` | integer | `version_major` byte value. Currently `1`. |
| `wire_format` | integer | `wire_format` byte value. Currently `0`. |
| `message_type` | string | Message type name, e.g. `frame_submit`, `result_push`. |
| `flags` | array of string | Flag names to set, e.g. `["ack_required", "keyframe"]`. |
| `meta_len` | integer | Declared metadata length in bytes. |
| `body_len` | integer | Declared body length in bytes. |
| `session_id` | integer (u32) | Session identifier. |
| `frame_id` | integer (u32) | Frame identifier. |
| `view_id` | integer (u16) | View / lane identifier. |
| `route_id` | integer (u16) | Route identifier. |
| `trace_id` | integer (u64) | Trace identifier. |

#### `recipe_type: "client_hello_metadata"`

Builds the CLIENT_HELLO fixed-metadata golden vector.

| Additional field | Type | Description |
|---|---|---|
| `min_version_major` / `max_version_major` | integer | Version negotiation range. |
| `supported_wire_format_bitmap` | integer | Bitmap of supported wire formats. |
| `supported_profile_bitmap` | integer | Bitmap of supported payload profiles. |
| `supported_payload_kind_bitmap` | array of string | Supported payload kind names, e.g. `["tensor"]`. |
| `supported_codec_bitmap` | integer | Codec support bitmap. |
| `supported_compression_bitmap` | integer | Compression support bitmap. |
| `supported_dtype_bitmap` | integer | Dtype support bitmap. |
| `supported_layout_bitmap` | integer | Memory layout support bitmap. |
| `cache_digest_bitmap` | integer | Cache digest algorithm bitmap. |
| `cache_object_bitmap` | integer | Supported cache object types bitmap. |
| `cache_namespace_count` | integer | Declared number of cache namespaces. |
| `max_lane_count` | integer | Maximum concurrent lane count. |
| `max_cache_entries` | integer | Maximum cache entry count. |
| `max_cache_bytes` | integer | Maximum total cache size in bytes. |
| `target_cadence_x100` | integer | Target frame cadence × 100, e.g. `6000` = 60 fps. |
| `latency_budget_ms` | integer | Latency budget in milliseconds. |
| `quality_tier` | integer | Requested quality tier. |
| `degrade_policy` | integer | Degradation policy selector. |
| `requested_session_id` | integer | Requested session ID (0 = server-assigned). |
| `auth_bytes` | integer | Authentication payload length in bytes. |
| `control_extension_bytes` | integer | Control extension payload length in bytes. |

### Example (excerpt)

```json
{
  "$schema": "../../../schemas/preview2-vector-recipes.schema.json",
  "protocol_version": "nnrp-1-preview2",
  "vectors": [
    {
      "recipe_type": "header",
      "name": "current.header.frame_submit_ack_required_keyframe",
      "description": "Preview2 common header golden vector for a FRAME_SUBMIT keyframe with ACK_REQUIRED.",
      "version_major": 1,
      "wire_format": 0,
      "message_type": "frame_submit",
      "flags": ["ack_required", "keyframe"],
      "meta_len": 48,
      "body_len": 4096,
      "session_id": 7,
      "frame_id": 11,
      "view_id": 2,
      "route_id": 0,
      "trace_id": 123456789
    },
    {
      "recipe_type": "client_hello_metadata",
      "name": "current.metadata.client_hello",
      "description": "Preview2 CLIENT_HELLO fixed metadata golden vector.",
      "min_version_major": 1,
      "max_version_major": 1,
      "supported_wire_format_bitmap": 1,
      "supported_profile_bitmap": 1,
      "supported_payload_kind_bitmap": ["tensor"],
      "supported_codec_bitmap": 7,
      "supported_compression_bitmap": 3,
      "supported_dtype_bitmap": 31,
      "supported_layout_bitmap": 3,
      "cache_digest_bitmap": 1,
      "cache_object_bitmap": 7,
      "cache_namespace_count": 4,
      "max_lane_count": 2,
      "max_cache_entries": 256,
      "max_cache_bytes": 8388608,
      "target_cadence_x100": 6000,
      "latency_budget_ms": 100,
      "quality_tier": 2,
      "degrade_policy": 2,
      "requested_session_id": 0,
      "auth_bytes": 96,
      "control_extension_bytes": 0
    }
  ]
}
```

---

## 4. Generated Vector Manifest

**Schema:** `schemas/vector-manifest.schema.json`  
**Produced by:** `nnrp-conformance-runner generate-preview2-vectors`

This is the **output** artifact produced by the runner from a semantic recipe manifest. It contains the actual hex-encoded wire bytes. SDK tests consume this file. Suite authors do not write it manually.

### Top-level Fields

| Field | Type | Required | Valid values | Description |
|---|---|---|---|---|
| `$schema` | string | no | any URI | JSON Schema reference. |
| `protocol_version` | string | **yes** | non-empty string | Matches the recipe's `protocol_version`. |
| `generator` | string | no | string | Identifies the tool that produced this file, e.g. `nnrp-conformance-runner`. |
| `generated_from` | string | no | string | Names the source recipe file, e.g. `vectors/semantic-vectors.json`. |
| `vectors` | array of object | **yes** | ≥1 items | The generated wire vectors. |

### Vector Object Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **yes** | The stable name matching the `name` in the source recipe. Used by SDK tests for assertion mapping. |
| `kind` | string | **yes** | Vector category, e.g. `header`, `client_hello_metadata`. Corresponds to `recipe_type` in the source recipe. |
| `hex` | string | **yes** | Lower-case hex encoding of the canonical wire bytes, no separators. |
| `bytes` | integer | **yes** | Byte length of the canonical wire encoding, must equal `len(hex) / 2`. |
| `description` | string | **yes** | Copied from the source recipe. |

### Example (excerpt)

```json
{
  "protocol_version": "nnrp-1-preview2",
  "generator": "nnrp-conformance-runner",
  "generated_from": "vectors/semantic-vectors.json",
  "vectors": [
    {
      "name": "current.header.frame_submit_ack_required_keyframe",
      "kind": "header",
      "hex": "4e4e5250010003280000003000001000000000070000000b000200007b000000000000000000000000000000",
      "bytes": 40,
      "description": "Preview2 common header golden vector for a FRAME_SUBMIT keyframe with ACK_REQUIRED."
    }
  ]
}
```

---

## 5. Conformance Report

**Schema:** `schemas/report.schema.json`  
**Produced by:** `nnrp-conformance-runner summary`

The report is the machine-readable output of one conformance execution. Suite authors use it to understand coverage; CI uses it to gate mandatory cases.

### Top-level Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `protocol_version` | string | **yes** | Matches the protocol manifest's `protocol_version`. |
| `implementation_name` | string | **yes** | Copied from the capability manifest. |
| `summary` | object | **yes** | Aggregate counts (see below). |
| `cases` | array of object | **yes** | Per-case selection results. |

### Summary Fields

| Field | Type | Description |
|---|---|---|
| `selected_cases` | integer ≥ 0 | Cases that entered the execution set (implementation claimed all required capabilities). These are hard-gated in CI. |
| `not_claimed_cases` | integer ≥ 0 | Cases where at least one required capability was not claimed. These are never counted as failures. |
| `informational_cases` | integer ≥ 0 | Cases with `experimental` or `deprecated` status. Output only; not gated. |

### Case Result Fields

| Field | Type | Valid values | Description |
|---|---|---|---|
| `id` | string | — | The case identifier from the case manifest. |
| `selection` | string | `selected` \| `not_claimed` \| `informational` | How the runner classified this case for the given capability manifest. |

---

## What the runner does not freeze

The JSON boundary described on this page is what is frozen publicly. The following are intentionally **not** frozen:

1. Internal Rust type layouts in `nnrp-conformance-fixtures` or `nnrp-conformance-runner`.
2. Internal Python or C# object trees inside SDK adapters.
3. Intermediate in-memory state during runner execution.

Schema field semantics may only change on a new protocol version line or a new `suite_version`.