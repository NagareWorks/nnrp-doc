# SDK 总览

SDK 视图和协议设计页刻意分开。

1. 协议页定义线上的报文契约、描述符、状态机与版本边界。
2. SDK 页定义应用真正调用的冻结控制面，覆盖 Python、C#、Rust 和 JavaScript/TypeScript。
3. 语言相关的部署、打包和宿主接入说明只放在这里，不回流到协议页叙事。

## 冻结范围

Preview4 的四门现有语言 SDK 共享同一组控制面与宿主 route 契约。

1. 与 carrier 无关的应用 endpoint、按 carrier 隔离的 route set 与确定性选择。
2. 原子 server listener set 与 accepted session 的 active transport 标识。
3. 连接建立与能力协商。
4. 会话打开、补丁、关闭与迁移。
5. 操作提交、接收与取消。
6. 流控更新与背压处理。
7. Runtime object、cache reference、Schema 操作与生命周期保证。

## 语言入口

<div class="sdk-link-grid">
  <a class="sdk-link-card" href="/nnrp-doc/zh/sdk/python/">
    <strong>Python</strong>
    <p>查看 Python 的冻结 API 面和部署接入说明。</p>
  </a>
  <a class="sdk-link-card" href="/nnrp-doc/zh/sdk/csharp/">
    <strong>C#</strong>
    <p>查看 C# 的冻结 API 面和部署接入说明。</p>
  </a>
  <a class="sdk-link-card" href="/nnrp-doc/zh/sdk/rust/">
    <strong>Rust</strong>
    <p>查看 Rust 的冻结 API 面和部署接入说明。</p>
  </a>
  <a class="sdk-link-card" href="/nnrp-doc/zh/sdk/javascript/">
    <strong>JavaScript/TypeScript</strong>
    <p>查看 Deno 编写、Node-compatible 后端与浏览器 WASM SDK 的冻结 API 面。</p>
  </a>
</div>
