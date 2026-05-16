# SDK 总览

SDK 视图和协议设计页刻意分开。

1. 协议页定义线上的报文契约、描述符、状态机与版本边界。
2. SDK 页定义应用真正调用的冻结控制面，覆盖 Python、C# 和 Rust。
3. 语言相关的部署、打包和宿主接入说明只放在这里，不回流到协议页叙事。

## 冻结范围

进入 Preview3 时，三门语言 SDK 应共享同一组控制面能力边界。

1. 连接建立与能力协商。
2. 会话打开、补丁、关闭与迁移。
3. 操作提交、接收与取消。
4. 流控更新与背压处理。
5. 缓存与 Schema 的安装和失效。
6. 稳定的错误模型与生命周期保证。

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
</div>