---
prev:
  text: 核心对象与流程
  link: /zh/core-concepts/
next:
  text: 类型化载荷描述符
  link: /zh/typed-payload-descriptor/
---

# 公共头

NNRP 的公共头是使用者理解协议的第一块稳定骨架。

从公开设计演进来看，NNRP 的公共头模型长期保持两个关键原则：

1. 固定长度，便于快速定位与统一解析。
2. `meta_len + body_len` 自描述长度，便于在可靠字节流上完整拆包。

当前公共头固定为 `40B`。这页会把整体布局、字段总览和逐字段说明放在同一页里，便于连续查阅。

<div class="protocol-diagram">
  <div class="protocol-row">
    <div class="protocol-block tone-a" style="flex: 4 1 0">
      <span class="field-offset">0-3</span>
      <span class="field-name">magic</span>
      <span class="field-size">4B</span>
      <span class="field-tip">ASCII `NNRP`，用于快速识别协议包。</span>
    </div>
    <div class="protocol-block tone-b" style="flex: 1 1 0">
      <span class="field-offset">4</span>
      <span class="field-name">version_major</span>
      <span class="field-size">1B</span>
      <span class="field-tip">主版本号，用于表示大版本兼容边界。</span>
    </div>
    <div class="protocol-block tone-b" style="flex: 1 1 0">
      <span class="field-offset">5</span>
      <span class="field-name">version_stage</span>
      <span class="field-size">1B</span>
      <span class="field-tip">阶段号，用于区分 stable、preview 等阶段口径。</span>
    </div>
    <div class="protocol-block tone-c" style="flex: 1 1 0">
      <span class="field-offset">6</span>
      <span class="field-name">msg_type</span>
      <span class="field-size">1B</span>
      <span class="field-tip">顶层消息类型，决定 fixed metadata 和 body 的解释入口。</span>
    </div>
    <div class="protocol-block tone-c" style="flex: 1 1 0">
      <span class="field-offset">7</span>
      <span class="field-name">header_len</span>
      <span class="field-size">1B</span>
      <span class="field-tip">当前固定为 40，提醒接收方公共头形状未变化。</span>
    </div>
  </div>
  <div class="protocol-row">
    <div class="protocol-block tone-d" style="flex: 4 1 0">
      <span class="field-offset">8-11</span>
      <span class="field-name">flags</span>
      <span class="field-size">4B</span>
      <span class="field-tip">公共标志位，用于承载跨消息的通用状态与保留扩展位。</span>
    </div>
    <div class="protocol-block tone-e" style="flex: 4 1 0">
      <span class="field-offset">12-15</span>
      <span class="field-name">meta_len</span>
      <span class="field-size">4B</span>
      <span class="field-tip">fixed metadata 的逻辑长度，帮助接收方在 transport 无关的情况下拆包。</span>
    </div>
    <div class="protocol-block tone-e" style="flex: 4 1 0">
      <span class="field-offset">16-19</span>
      <span class="field-name">body_len</span>
      <span class="field-size">4B</span>
      <span class="field-tip">body 的逻辑长度，配合 descriptor 和 offset 定位真实载荷。</span>
    </div>
  </div>
  <div class="protocol-row">
    <div class="protocol-block tone-a" style="flex: 4 1 0">
      <span class="field-offset">20-23</span>
      <span class="field-name">session_id</span>
      <span class="field-size">4B</span>
      <span class="field-tip">会话编号。实时协作式场景里，它是默认上下文和流控边界的重要锚点。</span>
    </div>
    <div class="protocol-block tone-b" style="flex: 4 1 0">
      <span class="field-offset">24-27</span>
      <span class="field-name">frame_id</span>
      <span class="field-size">4B</span>
      <span class="field-tip">历史上用于帧或工作单元编号，不同消息会投影到不同 operation 语义。</span>
    </div>
    <div class="protocol-block tone-c" style="flex: 2 1 0">
      <span class="field-offset">28-29</span>
      <span class="field-name">view_id</span>
      <span class="field-size">2B</span>
      <span class="field-tip">逻辑 lane 编号。在渲染类 profile 中可映射为视角，在非渲染场景中可为 0。</span>
    </div>
    <div class="protocol-block tone-d" style="flex: 2 1 0">
      <span class="field-offset">30-31</span>
      <span class="field-name">route_id</span>
      <span class="field-size">2B</span>
      <span class="field-tip">保留给后续租户、调度、路由等扩展，不应被业务侧私自占用。</span>
    </div>
    <div class="protocol-block tone-e" style="flex: 8 1 0">
      <span class="field-offset">32-39</span>
      <span class="field-name">trace_id</span>
      <span class="field-size">8B</span>
      <span class="field-tip">64 位跟踪编号，用于把跨消息、跨组件、跨 runtime 的链路串起来。</span>
    </div>
  </div>
</div>

## 字段总览

| 字段名 | 数据类型 | 偏移 | 大小 | 说明 | 取值范围 |
| --- | --- | --- | --- | --- | --- |
| magic | ASCII[4] | 0 | 4B | 协议魔数，用于快速识别 NNRP 包头 | 固定为 `NNRP` |
| version_major | u8 | 4 | 1B | 主版本号，用于标识大版本兼容边界 | `1-255`，当前公开主线为 `1` |
| version_stage | enum(u8) | 5 | 1B | 版本阶段，区分 preview、stable 等发布口径 | `preview`、`stable` 等阶段枚举，具体编码以版本规范为准 |
| msg_type | enum(u8) | 6 | 1B | 顶层消息类型，决定 fixed metadata 和 body 的解释入口 | 例如 `CLIENT_HELLO`、`SESSION_OPEN`、`RESULT_PUSH`、`FLOW_UPDATE` |
| header_len | u8 | 7 | 1B | 公共头长度，帮助接收方确认头部骨架是否变化 | 当前固定为 `40` |
| flags | bitset(u32) | 8 | 4B | 公共标志位，承载跨消息共享的状态和保留扩展位 | `0x00000000-0xffffffff` |
| meta_len | u32 | 12 | 4B | fixed metadata 的逻辑长度，用于在公共头之后精确切出 metadata 区域 | `0-4294967295` 字节 |
| body_len | u32 | 16 | 4B | body 的逻辑长度，用于在 metadata 之后切出消息主体 | `0-4294967295` 字节 |
| session_id | u32 | 20 | 4B | 会话编号，用于锚定默认上下文、会话级缓存和流控边界 | `0x00000000-0xffffffff` |
| frame_id | u32 | 24 | 4B | 工作单元或帧级编号，用于把一次提交与结果流关联起来 | `0x00000000-0xffffffff` |
| view_id | u16 | 28 | 2B | 逻辑 lane 或视图编号，用于区分并行观察面或子通道 | `0x0000-0xffff` |
| route_id | u16 | 30 | 2B | 路由或调度扩展字段，为后续多租户、策略路由和执行分流保留 | `0x0000-0xffff` |
| trace_id | u64 | 32 | 8B | 跨消息、跨组件和跨 runtime 的链路追踪编号 | `0x0000000000000000-0xffffffffffffffff` |

## 阅读方式

1. 先看 `magic / version_major / version_stage`，建立协议识别与版本边界。
2. 再看 `msg_type / header_len / flags / meta_len / body_len`，理解公共头怎样决定后续解析路径。
3. 最后看 `session_id / frame_id / view_id / route_id / trace_id`，理解上下文、调度和观测锚点。

## magic

| 字段名 | 数据类型 | 偏移 | 大小 | 说明 | 取值范围 |
| --- | --- | --- | --- | --- | --- |
| magic | ASCII[4] | 0 | 4B | 协议魔数，用于快速识别 NNRP 包头 | 固定为 `NNRP` |

接收方应该在最早阶段先检查 `magic`。如果这里不匹配，就不应该继续按 NNRP 的公共头往下解析。

## version_major

| 字段名 | 数据类型 | 偏移 | 大小 | 说明 | 取值范围 |
| --- | --- | --- | --- | --- | --- |
| version_major | u8 | 4 | 1B | 主版本号，用于标识大版本兼容边界 | `1-255`，当前公开主线为 `1` |

`version_major` 主要回答“能不能按这一套公共语义继续解析”。它不是给业务方随手拿来做 feature toggle 的字段。

## version_stage

| 字段名 | 数据类型 | 偏移 | 大小 | 说明 | 取值范围 |
| --- | --- | --- | --- | --- | --- |
| version_stage | enum(u8) | 5 | 1B | 版本阶段，区分 preview、stable 等发布口径 | `preview`、`stable` 等阶段枚举，具体编码以版本规范为准 |

这个字段的作用是表达“同一主版本下当前处在哪个冻结阶段”。它服务于版本口径，而不是替代 capability 协商。

## msg_type

| 字段名 | 数据类型 | 偏移 | 大小 | 说明 | 取值范围 |
| --- | --- | --- | --- | --- | --- |
| msg_type | enum(u8) | 6 | 1B | 顶层消息类型，决定 fixed metadata 和 body 的解释入口 | 例如 `CLIENT_HELLO`、`SESSION_OPEN`、`RESULT_PUSH`、`FLOW_UPDATE` |

如果说 `magic` 决定“是不是 NNRP”，那么 `msg_type` 决定“接下来按哪一类消息继续解释”。它是后续字段布局的第一个分叉点。

## header_len

| 字段名 | 数据类型 | 偏移 | 大小 | 说明 | 取值范围 |
| --- | --- | --- | --- | --- | --- |
| header_len | u8 | 7 | 1B | 公共头长度，帮助接收方确认头部骨架是否变化 | 当前固定为 `40` |

当前公开文档里公共头固定为 `40B`。如果未来需要扩展公共头形状，这个字段会是接收方发现变化的第一道护栏。

## flags

| 字段名 | 数据类型 | 偏移 | 大小 | 说明 | 取值范围 |
| --- | --- | --- | --- | --- | --- |
| flags | bitset(u32) | 8 | 4B | 公共标志位，承载跨消息共享的状态和保留扩展位 | `0x00000000-0xffffffff` |

`flags` 适合承载横跨多个消息族都需要快速判断的布尔语义，但不适合把 profile 私有状态塞进来，否则公共层会再次被业务语义拖胖。

## meta_len

| 字段名 | 数据类型 | 偏移 | 大小 | 说明 | 取值范围 |
| --- | --- | --- | --- | --- | --- |
| meta_len | u32 | 12 | 4B | fixed metadata 的逻辑长度，用于在公共头之后精确切出 metadata 区域 | `0-4294967295` 字节 |

`meta_len` 与 transport 无关，它告诉接收方需要从字节流里为 metadata 留出多大的一段连续区域。

## body_len

| 字段名 | 数据类型 | 偏移 | 大小 | 说明 | 取值范围 |
| --- | --- | --- | --- | --- | --- |
| body_len | u32 | 16 | 4B | body 的逻辑长度，用于在 metadata 之后切出消息主体 | `0-4294967295` 字节 |

`body_len` 让协议在 QUIC、TCP+TLS 这类可靠字节流绑定上都能使用统一拆包逻辑，而不必为每种 transport 重写应用层 framing。

## session_id

| 字段名 | 数据类型 | 偏移 | 大小 | 说明 | 取值范围 |
| --- | --- | --- | --- | --- | --- |
| session_id | u32 | 20 | 4B | 会话编号，用于锚定默认上下文、会话级缓存和流控边界 | `0x00000000-0xffffffff` |

不同 `msg_type` 对 `session_id` 的要求可能不同，但它长期承担“默认上下文锚点”的职责，不是可有可无的业务附加字段。

## frame_id

| 字段名 | 数据类型 | 偏移 | 大小 | 说明 | 取值范围 |
| --- | --- | --- | --- | --- | --- |
| frame_id | u32 | 24 | 4B | 工作单元或帧级编号，用于把一次提交与结果流关联起来 | `0x00000000-0xffffffff` |

它叫 `frame_id`，但不意味着协议只能服务于渲染帧。更准确地说，它是历史上保留下来的稳定工作单元锚点。

## view_id

| 字段名 | 数据类型 | 偏移 | 大小 | 说明 | 取值范围 |
| --- | --- | --- | --- | --- | --- |
| view_id | u16 | 28 | 2B | 逻辑 lane 或视图编号，用于区分并行观察面或子通道 | `0x0000-0xffff` |

在渲染语义里它可以映射为 camera 或视角；在非渲染语义里它也可以只是一个逻辑 lane，甚至取 `0` 表示未区分子视图。

## route_id

| 字段名 | 数据类型 | 偏移 | 大小 | 说明 | 取值范围 |
| --- | --- | --- | --- | --- | --- |
| route_id | u16 | 30 | 2B | 路由或调度扩展字段，为后续多租户、策略路由和执行分流保留 | `0x0000-0xffff` |

如果当前实现还没有公开启用复杂路由策略，也不意味着这个字段可以被业务方私自重解释。它属于协议保留扩展位。

## trace_id

| 字段名 | 数据类型 | 偏移 | 大小 | 说明 | 取值范围 |
| --- | --- | --- | --- | --- | --- |
| trace_id | u64 | 32 | 8B | 跨消息、跨组件和跨 runtime 的链路追踪编号 | `0x0000000000000000-0xffffffffffffffff` |

`trace_id` 的价值不在业务语义，而在可观测性。它让 host、gateway、runtime、缓存层可以把同一条交互链路串成一条完整追踪线。

<div class="page-note">
  这一层讲的是公共头长期稳定骨架，不等于某个 preview 页面里的所有 metadata 和 descriptor 明细。要核对某个版本到底冻结了什么，请回到对应版本页。
</div>