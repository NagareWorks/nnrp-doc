# Rust 冻结 API

Rust SDK 应冻结一组与共享 SDK 契约一致的 crate 级控制面接口。

## 核心能力面

1. Client builder 或配置入口。
2. 会话生命周期操作。
3. 操作提交、流式接收和取消。
4. 缓存与 Schema 生命周期操作。
5. 稳定的错误枚举与关闭语义。

## Rust 侧约束

1. 所有权和借用规则需要在公开类型里表达清楚。
2. 异步 stream 或 channel 式接收流程应保持显式。
3. 公开 crate、feature flag 和结果类型在 Preview3 集成窗口内应保持稳定。