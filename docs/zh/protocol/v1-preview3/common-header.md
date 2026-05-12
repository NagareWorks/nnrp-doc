# NNRP/1-preview3 公共头

preview3 继续沿用 preview2 已冻结的 40 字节公共头，并保留 `meta_len + body_len` 的自描述长度模型。

公共头字段为：

1. `magic`
2. `version_major`
3. `version_stage`
4. `msg_type`
5. `header_len`
6. `flags`
7. `meta_len`
8. `body_len`
9. `session_id`
10. `frame_id`
11. `view_id`
12. `route_id`
13. `trace_id`

<div class="bit-diagram">
  <div class="bit-row">
    <div class="bit-cell tone-a" style="flex: 1 1 0">magic</div>
    <div class="bit-cell tone-b" style="flex: 1 1 0">version_major</div>
    <div class="bit-cell tone-b" style="flex: 1 1 0">version_stage</div>
    <div class="bit-cell tone-c" style="flex: 1 1 0">msg_type</div>
    <div class="bit-cell tone-c" style="flex: 1 1 0">header_len</div>
    <div class="bit-cell tone-d" style="flex: 1 1 0">flags</div>
    <div class="bit-cell tone-e" style="flex: 2 1 0">meta_len</div>
    <div class="bit-cell tone-e" style="flex: 2 1 0">body_len</div>
  </div>
  <div class="bit-row">
    <div class="bit-cell tone-a" style="flex: 2 1 0">session_id</div>
    <div class="bit-cell tone-b" style="flex: 2 1 0">frame_id</div>
    <div class="bit-cell tone-c" style="flex: 2 1 0">view_id</div>
    <div class="bit-cell tone-d" style="flex: 2 1 0">route_id</div>
    <div class="bit-cell tone-e" style="flex: 4 1 0">trace_id</div>
  </div>
</div>

<p class="layout-note">这张图表达的是“公共头由哪些逻辑区块组成”，不是按比特位精确缩放的线框图。真正的字段类型与字节序请以开发者设计文档为准。</p>

使用者需要真正关心的只有三点：

1. `header_len` 固定为 `40`，所以任何扩展都不应偷偷改公共头字节形状。
2. `meta_len` 与 `body_len` 让接收方可以在 transport 无关的可靠字节流上完整拆包。
3. `session_id` 是 preview3 多 session 模型的关键锚点，不能继续被绑定层当成可选装饰字段。