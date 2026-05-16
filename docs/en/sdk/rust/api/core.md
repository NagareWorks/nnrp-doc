# Rust — Core Crate

The `nnrp-core` crate provides the minimal stable protocol primitives shared by all other Rust crates and FFI bindings.

## Dependency

```toml
[dependencies]
nnrp-core = { path = "../nnrp-core" }
```

---

## Constants

| Constant | Type | Value | Description |
|---|---|---|---|
| `CURRENT_WIRE_FORMAT` | `u8` | `0` | Current wire format version number |

---

## `ProtocolVersion`

The current NNRP protocol version.

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct ProtocolVersion {
    /// Protocol major version (currently `1`)
    pub major: u8,
    /// Wire format version (currently `CURRENT_WIRE_FORMAT = 0`)
    pub wire_format: u8,
}

impl ProtocolVersion {
    /// Current protocol version: major=1, wire_format=0
    pub const CURRENT: Self = Self { major: 1, wire_format: CURRENT_WIRE_FORMAT };

    /// Returns `Ok(Self)` if wire_format == CURRENT_WIRE_FORMAT, else `Err(NnrpError::UnsupportedWireFormat { wire_format })`
    pub fn try_new(major: u8, wire_format: u8) -> Result<Self, NnrpError>;
}
```

---

## `NnrpError`

Protocol error type (`thiserror` derived).

```rust
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum NnrpError {
    #[error("unsupported wire format: {wire_format}")]
    UnsupportedWireFormat { wire_format: u8 },
}
```

> Preview3 will extend this enum with additional error variants for session, transport, and cache errors.

---

## Preview3 Expansion Plan

The following types are planned for `nnrp-core` in Preview3:

- `NnrpHeader` — fixed 40-byte packet header (aligned with Python/C# wire format)
- `MessageType` — message type enum
- `HeaderFlags` — header flag bitfield
- Complete enum set (FrameClass, ErrorCode, TransportId, etc.)
- Packet serialization/deserialization traits
