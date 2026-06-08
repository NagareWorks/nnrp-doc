# Capability Manifest Generators

<div class="page-note">
This page provides purely client-side low-code generators for conformance manifest scaffolding. They remove the friction of hand-writing JSON, but they do not decide which capabilities an implementation or adapter is allowed to claim publicly.
</div>

## Protocol capability manifest

Use this generator for SDK repositories. Choose a protocol line, enter your implementation name,
tick the protocol capabilities you have completed, and copy the generated JSON. After that, review
the [Capability Catalog](./capabilities/) for token semantics and combination rules.

The catalog is built from versioned protocol and case manifests. It emits only the SDK-owned
capability manifest shape: `implementation_name`, `protocol_version`, and `supports`. It does not
generate adapter plans, benchmark plans, or case definitions.

<CapabilityManifestGenerator />

## OpenAI API profile capability manifest

Use this generator for adapters that expose an OpenAI-compatible NNRP API surface, such as the vLLM
NNRP adapter. It generates the adapter-owned manifest used by the API profile runner: `adapter`,
`profile`, `schema_version`, `compatibility_levels`, `operations`, and `extensions`.

The catalog is built from `profiles/openai-compatible/1/manifest.json` and its declarative recipe
manifests. The generated file is used together with the profile suite manifest to select
recipe-level tests.

<ApiProfileManifestGenerator />

## Wire-level conformance target manifest

Use this generator when the conformance runner must test a real endpoint directly instead of
calling an SDK-owned adapter. The generated target manifest declares runner modes, transport
endpoints, selected wire scenarios, and execution limits.

This is intentionally separate from the SDK capability manifest and the OpenAI API profile
manifest. Adapter manifests are useful for recipe selection, but wire-level conformance must be
able to act as a client, server, or proxy and exchange protocol frames directly.

<WireConformanceManifestGenerator />
