# 标准 Profiles

Profile 是 NNRP 的核心抽象之一。它的作用不是“多起几个名字”，而是把公共层和业务语义层明确拆开。

公共层负责：

1. 消息骨架。
2. 长度模型。
3. session / operation / flow-control 等通用语义。

Profile 负责：

1. 告诉接收方“这一类 payload 属于什么语义家族”。
2. 配合 schema 决定具体解释方式。
3. 避免某个单一业务场景把公共头越拉越胖。

## 当前公开的标准方向

当前公开方向下，`tensor`、`token` 和 preview4 运行时控制 profiles 是标准 profile 的主要方向。

<div class="doc-grid">
  <div class="doc-card">
    <h3>Tensor Profile</h3>
    <p>面向数值块、区域化载荷、实时增强渲染和一部分媒体处理场景。</p>
  </div>
  <div class="doc-card">
    <h3>Token Profile</h3>
    <p>面向离散 token、流式文本、AI NPC 对话、代理协作和工具调用结果流。</p>
  </div>
  <div class="doc-card">
    <h3>运行时控制 Profiles</h3>
    <p>面向取消、deadline、部分结果、背压、运行时对象、缓存引用、路由提示和 trace context。</p>
  </div>
</div>

## 阅读方式

1. 先看 [Tensor Profile 概览](/zh/profiles/tensor/)，再进入它的
   `Descriptor 公共头 / Schema 与 Body / Payload Frame` 子页。
2. 再看 [Token Profile 概览](/zh/profiles/token/)，按同样顺序阅读。
3. 实现 preview4 控制帧、运行时对象、缓存引用或线路级一致性测试前，先读
   [运行时控制 Profiles](/zh/profiles/runtime-control/)。它的子页已经拆出冻结取值注册表、控制帧
   metadata、对象与缓存 metadata。
4. 如果要看跨 profile 共用的 descriptor 字段，先读
   [类型化载荷描述符](/zh/typed-payload-descriptor/)。
5. 如果要判断某个字段是不是公共承诺，回到 [公共头](/zh/common-header/) 或对应版本页核对冻结范围。
