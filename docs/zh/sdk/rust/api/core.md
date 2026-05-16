# Rust — 核心类型

`nnrp-core` crate 提供协议基础类型。当前版本（0.1.0）仅包含协议版本与错误类型；完整线路类型计划在 Preview3 实现。

## Cargo.toml

```toml
[dependencies]
nnrp-core = "0.1"
```

---

## 常量

### `CURRENT_WIRE_FORMAT: u8`

当前线路格式版本号，固定为 `0`（NNRP/1）。

```rust
pub const CURRENT_WIRE_FORMAT: u8 = 0;
```

---

## `ProtocolVersion`

协议版本描述符（`#[derive(Debug, Clone, Copy, PartialEq, Eq)]`）。

```rust
pub struct ProtocolVersion {
    pub major: u8,
    pub wire_format: u8,
}
```

### 常量

```rust
impl ProtocolVersion {
    /// 当前协议版本（major=1, wire_format=0）
    pub const CURRENT: Self = Self {
        major: 1,
        wire_format: CURRENT_WIRE_FORMAT,
    };
}
```

### 方法

```rust
impl ProtocolVersion {
    /// 验证并构造 ProtocolVersion。
    /// 若 wire_format 不是已知值，返回 Err(NnrpError::UnsupportedWireFormat)。
    pub fn try_new(major: u8, wire_format: u8) -> Result<Self, NnrpError>;
}
```

---

## `NnrpError`

协议错误枚举（`#[derive(Debug, thiserror::Error)]`）。

```rust
#[derive(Debug, thiserror::Error)]
pub enum NnrpError {
    #[error("unsupported wire format: {0}")]
    UnsupportedWireFormat(u8),
}
```

> **Preview3 扩展计划**：`NnrpError` 将增加完整线路类型错误变体，包括 `MalformedHeader`、`MalformedBody`、`UnsupportedVersion`、`AuthFailed` 等，与 Python/C# SDK 枚举对齐。

---

## Preview3 规划（`nnrp-core` 完整线路类型）

以下类型计划在 Preview3 发布，当前版本尚未实现：

```rust
// 计划类型（尚未实现）
pub struct NnrpHeader { /* 对应 Python NnrpHeader */ }
pub struct NnrpPacket { /* 完整数据包 */ }
pub enum MessageType { ClientHello = 0x01, ... }
pub struct FrameSubmitMetadata { /* 帧提交元数据 */ }
pub struct ResultPushMetadata { /* 结果推送元数据 */ }
// ... 完整协议类型
```

---

## 与 Python/C# 的互操作说明

`ProtocolVersion::CURRENT` 与 Python `WireFormat.CURRENT=0` / C# `WireFormat.Current=0` 完全对应。所有 SDK 在握手阶段均使用相同的线路格式常量，保证跨语言互通。
