# Python — Header & Packet

Header and packet types are defined in the `nnrp.core` module.

## Import

```python
from nnrp.core import (
    NnrpHeader, NnrpPacket, TensorSectionData,
    HEADER_MAGIC, HEADER_LENGTH,
)
```

---

## Constants

| Name | Type | Value | Description |
|---|---|---|---|
| `HEADER_MAGIC` | `bytes` | `b"NNRP"` | Fixed 4-byte magic prefix for every packet |
| `HEADER_LENGTH` | `int` | `40` | Fixed header byte length |

---

## `NnrpHeader`

Fixed 40-byte packet header (`@dataclass(frozen=True, slots=True)`). Wire format: `struct.Struct("<4sBBBBIIIIIHHQ")`.

### Fields

| Field | Type | Description |
|---|---|---|
| `wire_format` | `WireFormat` | Wire format version (currently `CURRENT=0`) |
| `version_major` | `int` | Protocol major version (currently `1`) |
| `msg_type` | `MessageType` | Message type |
| `flags` | `HeaderFlags` | Header flags |
| `meta_len` | `int` | Metadata byte count |
| `body_len` | `int` | Body byte count |
| `session_id` | `int` | Session ID |
| `frame_id` | `int` | Frame ID |
| `view_id` | `int` | View/viewport ID |
| `route_id` | `int` | Route ID (uint16) |
| `trace_id` | `int` | Trace ID (uint16) |
| `header_len` | `int` | Fixed `HEADER_LENGTH=40` |

### Methods

```python
def pack(self) -> bytes:
    """Serialize header to 40 bytes (including 4-byte magic prefix)."""

@classmethod
def unpack(
    cls,
    payload: bytes,
    *,
    expected_wire_format: WireFormat | None = None,
) -> "NnrpHeader":
    """Parse header from bytes. Raises ValueError if expected_wire_format doesn't match."""
```

---

## `NnrpPacket`

Complete NNRP packet containing header, metadata, and body (`@dataclass(frozen=True, slots=True)`).

### Fields

| Field | Type | Description |
|---|---|---|
| `header` | `NnrpHeader` | Packet header |
| `metadata` | `bytes` | Raw metadata bytes |
| `body` | `bytes` | Raw body bytes |

### Methods

```python
def pack(self) -> bytes:
    """Serialize complete packet to bytes."""

@classmethod
def build(
    cls,
    msg_type: MessageType,
    *,
    wire_format: WireFormat = WireFormat.CURRENT,
    version_major: int = 1,
    flags: HeaderFlags = HeaderFlags.NONE,
    session_id: int = 0,
    frame_id: int = 0,
    view_id: int = 0,
    route_id: int = 0,
    trace_id: int = 0,
    metadata: bytes = b"",
    body: bytes = b"",
) -> "NnrpPacket":
    """Construct and return a new NnrpPacket."""

@classmethod
def unpack(cls, payload: bytes) -> "NnrpPacket":
    """Parse complete packet (header + metadata + body) from bytes."""
```

---

## `TensorSectionData`

Describes a single tensor section (`@dataclass(frozen=True, slots=True)`).

### Fields

| Field | Type | Description |
|---|---|---|
| `role_id` | `int` | Tensor role ID |
| `default_codec_id` | `int` | Default codec ID |
| `dtype_id` | `int` | Data type (see `TensorDType`) |
| `tile_payloads` | `tuple[bytes, ...]` | Raw payload bytes per tile |
| `codec_ids` | `tuple[int, ...]` | Per-tile codec IDs (may be empty) |
| `layout_id` | `int` | Memory layout (see `TensorLayout`) |
| `scale_policy` | `int` | Quantization scale policy (see `ScalePolicy`) |
| `payload_stride_bytes` | `int` | Fixed stride in bytes; `0` means variable |
| `element_count_per_tile` | `int` | Element count per tile |

### Methods

```python
def normalized_tile_payloads(self) -> tuple[bytes, ...]: ...
def normalized_codec_ids(self) -> tuple[int, ...]: ...
```

---

## Example: Build and parse a PING packet

```python
from nnrp.core import NnrpPacket
from nnrp.core.enums import MessageType

packet = NnrpPacket.build(MessageType.PING, session_id=42, frame_id=1)
raw = packet.pack()

restored = NnrpPacket.unpack(raw)
assert restored.header.msg_type is MessageType.PING
assert restored.header.session_id == 42
```
