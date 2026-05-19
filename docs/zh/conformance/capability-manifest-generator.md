# Capability Manifest 生成器

<div class="page-note">
本页提供一个纯前端的低代码生成器，帮助你快速拼出 capability manifest 骨架。它适合用来减少手写 JSON 的摩擦，但不会替你决定哪些 token 可以被对外声明。
</div>

使用方式很直接：先选协议版本，再填写实现名，勾选已经完成且愿意对外承诺的能力，下方预览区就会实时生成 JSON。复制之后，建议仍然回到 [能力列表](./capabilities/) 复核 token 语义与组合要求。

<CapabilityManifestGenerator />