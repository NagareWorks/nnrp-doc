---
prev:
  text: 运行时控制帧 Metadata
  link: /zh/profiles/runtime-control/control-frames/
next:
  text: SDK
  link: /zh/sdk/
---

# 运行时对象与缓存 Metadata

本页定义 `runtime.object` 和 `cache.reference` 帧的固定
metadata。多取值字段统一使用[运行时控制取值注册表](./value-registries)。

## Object Descriptor Metadata

用于 `OBJECT_DECLARE`。

| Offset | 字段                   | 类型  | 必填 | 含义                                      |
| ------ | ---------------------- | ----- | ---- | ----------------------------------------- |
| `0`    | `object_id`            | `u64` | 是   | 运行时对象身份。                          |
| `8`    | `object_kind`          | `u16` | 是   | 见取值注册表里的 `object_kind`。          |
| `10`   | `producer_role`        | `u8`  | 是   | 见取值注册表里的 role codes。             |
| `11`   | `consumer_role`        | `u8`  | 是   | 见取值注册表里的 role codes。             |
| `12`   | `session_id`           | `u32` | 是   | 所属 session。                            |
| `16`   | `byte_size`            | `u64` | 是   | 对象大小。                                |
| `24`   | `compute_cost_units`   | `u32` | 否   | 协商成本模型下的计算单元。                |
| `28`   | `memory_location_hint` | `u16` | 否   | 见取值注册表里的 `memory_location_hint`。 |
| `30`   | `ownership_hint`       | `u16` | 是   | 见取值注册表里的 `ownership_hint`。       |
| `32`   | `lifetime_hint_ms`     | `u32` | 否   | 建议生命周期。                            |
| `36`   | `metadata_bytes`       | `u32` | 否   | 可选对象 metadata body 长度。             |
| `40`   | `reserved`             | `u64` | 是   | 必须为零。                                |

## Object Reference Metadata

用于 `OBJECT_REF`。

| Offset | 字段             | 类型  | 必填 | 含义                          |
| ------ | ---------------- | ----- | ---- | ----------------------------- |
| `0`    | `object_id`      | `u64` | 是   | 被引用对象。                  |
| `8`    | `operation_id`   | `u64` | 否   | 使用该对象的 operation。      |
| `16`   | `object_version` | `u64` | 否   | 版本或 generation。           |
| `24`   | `offset`         | `u64` | 否   | 被引用字节或区域 offset。     |
| `32`   | `length`         | `u64` | 否   | 被引用字节或区域长度。        |
| `40`   | `flags`          | `u32` | 是   | 见取值注册表里的 flag masks。 |
| `44`   | `metadata_bytes` | `u32` | 否   | 可选引用 metadata body 长度。 |

## Object Release Metadata

用于 `OBJECT_RELEASE`。

| Offset | 字段               | 类型  | 必填 | 含义                                |
| ------ | ------------------ | ----- | ---- | ----------------------------------- |
| `0`    | `object_id`        | `u64` | 是   | 被释放对象。                        |
| `8`    | `operation_id`     | `u64` | 否   | 不再需要该对象的 operation。        |
| `16`   | `release_reason`   | `u16` | 是   | 见取值注册表里的 `release_reason`。 |
| `18`   | `source_role`      | `u8`  | 是   | 见取值注册表里的 role codes。       |
| `19`   | `flags`            | `u8`  | 是   | 见取值注册表里的 flag masks。       |
| `20`   | `diagnostic_bytes` | `u32` | 否   | 可选诊断 body 长度。                |
| `24`   | `reserved`         | `u64` | 是   | 必须为零。                          |

## Object Delta Metadata

用于 `OBJECT_PATCH` 和 `OBJECT_DELTA`。

| Offset | 字段             | 类型  | 必填 | 含义                            |
| ------ | ---------------- | ----- | ---- | ------------------------------- |
| `0`    | `object_id`      | `u64` | 是   | 被 patch 的对象。               |
| `8`    | `delta_sequence` | `u64` | 是   | 该对象内单调递增 delta 序号。   |
| `16`   | `region_offset`  | `u64` | 否   | 区域 offset。                   |
| `24`   | `region_bytes`   | `u32` | 否   | 区域长度。                      |
| `28`   | `delta_bytes`    | `u32` | 是   | Delta payload 长度。            |
| `32`   | `flags`          | `u32` | 是   | 见取值注册表里的 flag masks。   |
| `36`   | `metadata_bytes` | `u32` | 否   | 可选 delta metadata body 长度。 |

## Cache Reference Metadata

用于 `CACHE_REFERENCE`。

| Offset | 字段                 | 类型  | 必填 | 含义                             |
| ------ | -------------------- | ----- | ---- | -------------------------------- |
| `0`    | `cache_key_hi`       | `u64` | 是   | 缓存身份高 64 位。               |
| `8`    | `cache_key_lo`       | `u64` | 是   | 缓存身份低 64 位。               |
| `16`   | `profile_id`         | `u16` | 是   | 定义解释方式的 profile。         |
| `18`   | `reuse_scope`        | `u16` | 是   | 见取值注册表里的 `reuse_scope`。 |
| `20`   | `lease_id`           | `u64` | 否   | Lease anchor。                   |
| `28`   | `producer_trace_id`  | `u64` | 否   | Producer trace ID。              |
| `36`   | `expiration_hint_ms` | `u32` | 否   | 过期提示。                       |
| `40`   | `metadata_bytes`     | `u32` | 否   | 可选 metadata body 长度。        |
| `44`   | `flags`              | `u32` | 是   | 见取值注册表里的 flag masks。    |

## Cache Miss Metadata

用于 `CACHE_MISS`。

| Offset | 字段               | 类型  | 必填 | 含义                             |
| ------ | ------------------ | ----- | ---- | -------------------------------- |
| `0`    | `cache_key_hi`     | `u64` | 是   | 缓存身份高 64 位。               |
| `8`    | `cache_key_lo`     | `u64` | 是   | 缓存身份低 64 位。               |
| `16`   | `miss_reason`      | `u16` | 是   | 见取值注册表里的 `miss_reason`。 |
| `18`   | `profile_id`       | `u16` | 否   | 拒绝解释的 profile。             |
| `20`   | `diagnostic_bytes` | `u32` | 否   | 可选诊断 body 长度。             |
| `24`   | `reserved`         | `u64` | 是   | 必须为零。                       |

## 一致性测试要求

线路级一致性测试必须通过直接交换 NNRP 帧验证这些 profile。SDK adapter manifest
可以帮助生成场景，但不能替代真实客户端/服务端线路检查。
