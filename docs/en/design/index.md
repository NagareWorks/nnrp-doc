# Protocol Design

The site keeps the following versioned design documents:

1. `NNRP/1-preview1`
2. `NNRP/1-preview2`
3. `NNRP/1-preview3`
4. `NNRP Protocol Conformance Suite Design`
5. `NNRP OpenAI-Compatible API Profile`
6. `vLLM NNRP Adapter Design`

Index notes:

1. `v1-preview1` captures the minimal runnable protocol skeleton.
2. `v1-preview2` captures the preview2-stage design freeze for the richer data plane, typed
   payloads, and multi-transport binding. The emitted code-level wire identity frozen there is
   `NNRP/1.0`.
3. `v1-preview3` captures the profile-neutral public layer and the multi-session model.
4. `conformance-suite` defines the positioning, versioning strategy, test layering, and
   implementation boundary of the cross-version protocol conformance suite.
5. `openai-compatible-profile` defines the frozen API profile for carrying OpenAI-compatible AI API
   semantics over NNRP sessions, submissions, result streams, cancellation, and diagnostics.
6. `vllm-nnrp-adapter` defines the first adapter architecture for implementing the
   `openai-compatible/1` profile against vLLM, including API profile conformance and benchmark
   gates.
