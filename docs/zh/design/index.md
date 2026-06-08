# 协议设计

这里汇总 NNRP 的版本化设计文档：

1. `NNRP/1-preview1`
2. `NNRP/1-preview2`
3. `NNRP/1-preview3`
4. `NNRP 协议一致性测试套件设计`
5. `NNRP OpenAI 兼容 API Profile`
6. `vLLM NNRP Adapter 设计`
7. `NNRP/1-preview4`

这些文档按版本保存，用于回溯协议边界、冻结记录与实现背景。

索引说明：

1. `v1-preview1` 主要记录最小可运行协议骨架。
2. `v1-preview2` 主要记录 preview2 阶段在 typed payload、多传输绑定和 richer data plane
   上的设计冻结；其中代码层发包身份冻结为 `NNRP/1.0`。
3. `v1-preview3` 主要记录 profile-neutral 公共层与多 session 模型。
4. `conformance-suite` 记录跨版本协议一致性测试套件的定位、版本策略、分层结构和实现边界。
5. `openai-compatible-profile` 记录如何在 NNRP session、submit、result stream、cancel 和 diagnostics
   上承载 OpenAI 兼容 AI API 语义。
6. `vllm-nnrp-adapter` 记录首个 vLLM adapter 架构，包括 `openai-compatible/1` Profile
   的实现边界、API Profile conformance 和 benchmark gate；它的定位是 NNRP compatibility
   infrastructure，而不是 vLLM 性能加速器。
7. `v1-preview4` 记录 runtime object、控制帧与 wire-level conformance 方向，面向调度、部分
   artifact、deadline 和重对象传递占主导的协议边界。
