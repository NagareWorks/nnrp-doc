# C# — 枚举

所有枚举类型定义在 `Nnrp.Core` 命名空间中。与 Python SDK 的枚举一一对应，值完全相同（线路兼容）。

## 导入

```csharp
using Nnrp.Core;
```

---

## 线路格式

### `WireFormat : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `Current` | `0` | 当前唯一支持的格式（NNRP/1） |

---

## 消息类型

### `MessageType : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `ClientHello` | `0x01` | 客户端握手 |
| `ServerHelloAck` | `0x02` | 服务端握手应答 |
| `SessionPatch` | `0x03` | 会话参数补丁 |
| `SessionPatchAck` | `0x04` | 会话补丁应答 |
| `Close` | `0x05` | 优雅关闭 |
| `Error` | `0x06` | 协议错误 |
| `FrameSubmit` | `0x10` | 帧提交 |
| `FrameCancel` | `0x11` | 取消帧 |
| `ResultPush` | `0x12` | 推送结果 |
| `ResultDrop` | `0x13` | 丢弃结果通知 |
| `CachePut` | `0x14` | 存储缓存对象 |
| `CacheAck` | `0x15` | 缓存存储结果 |
| `CacheInvalidate` | `0x16` | 缓存失效 |
| `FlowUpdate` | `0x17` | 流控窗口更新 |
| `ResultHint` | `0x18` | 结果提示 |
| `TransportProbe` | `0x19` | 路径探测 |
| `TransportProbeAck` | `0x1A` | 路径探测应答 |
| `SessionMigrate` | `0x1B` | 会话迁移通知 |
| `SessionMigrateAck` | `0x1C` | 会话迁移确认 |
| `Ping` | `0x20` | 保活探测 |
| `Pong` | `0x21` | 保活应答 |
| `Cancel` | `0x30` | 取消操作 |
| `Abort` | `0x31` | 中止操作作用域 |
| `PriorityUpdate` | `0x32` | 更新操作优先级 |
| `Deadline` | `0x33` | 设置操作截止时间 |
| `ExpireAt` | `0x34` | 设置操作过期时间 |
| `Supersede` | `0x35` | 用新操作替换旧操作 |
| `BudgetUpdate` | `0x36` | 更新计算、内存、带宽或 token 预算 |
| `Progress` | `0x37` | 流式进度 |
| `PartialResult` | `0x38` | 流式部分结果 |
| `Backpressure` | `0x39` | 背压和重试提示 |
| `CreditUpdate` | `0x3A` | 更新运行时 credit |
| `CapabilityNegotiation` | `0x3B` | 协商能力、成本和限制 |
| `DegradeProfile` | `0x3C` | 选择降级 profile |
| `RouteHint` | `0x3D` | 路由提示 |
| `ExecutionHint` | `0x3E` | 执行提示 |
| `TraceContext` | `0x3F` | Trace/span 上下文 |
| `ResultDropReason` | `0x40` | 说明结果丢弃原因 |
| `ObjectDeclare` | `0x41` | 声明运行时对象 |
| `ObjectRef` | `0x42` | 引用运行时对象 |
| `ObjectRelease` | `0x43` | 释放运行时对象 |
| `ObjectPatch` | `0x44` | Patch 运行时对象 |
| `ObjectDelta` | `0x45` | 运行时对象增量 |
| `CacheReference` | `0x46` | 引用可复用缓存对象 |
| `CacheMiss` | `0x47` | 报告缓存 miss |
| `ErrorRecoverable` | `0x48` | 可恢复错误 |
| `RetryAfter` | `0x49` | 请求延迟重试 |

---

## 包头标志

### `HeaderFlags : byte`

| 成员 | 位掩码 | 说明 |
|---|---|---|
| `None` | `0x00` | 无标志 |
| `AckRequired` | `0x01` | 需要确认 |
| `CanDrop` | `0x02` | 允许丢弃 |
| `Stale` | `0x04` | 数据已过期 |
| `Eos` | `0x08` | 流结束 |
| `Retransmit` | `0x10` | 重传 |
| `Keyframe` | `0x20` | 关键帧 |

---

## 帧与输入

### `FrameClass : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `Keyframe` | `0` | 完整关键帧 |
| `Delta` | `1` | 增量帧 |
| `Retransmit` | `2` | 重传帧 |
| `Discardable` | `3` | 可丢弃帧 |

### `InputProfile : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `Unspecified` | `0` | 未指定 |
| `ChangedTilesLuma` | `1` | 变化瓦片亮度 |
| `DenseLumaFrame` | `2` | 完整帧亮度 |

### `TileIndexMode : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `DenseRange` | `0` | 密集连续区间 |
| `RawU16` | `1` | 原始 uint16 |
| `DeltaU16` | `2` | 增量 uint16 |
| `Bitset` | `3` | 位图 |

---

## Tensor 数据枚举

### `TensorRole : byte`

Tensor 在推理管道中的角色（由服务端 Profile 定义）。

### `CodecId : byte`

编解码器 ID，具体值由 Profile 协商确定。

### `DTypeId : byte`（对应 `TensorDType`）

| 成员 | 值 | 说明 |
|---|---|---|
| `Fp16` | `0` | FP16 |
| `Fp32` | `1` | FP32 |
| `Fp8E4M3` | `2` | FP8 E4M3 |
| `Fp8E5M2` | `3` | FP8 E5M2 |
| `Int8` | `4` | INT8 |
| `UInt8` | `5` | UINT8 |
| `Int16` | `6` | INT16 |
| `UInt16` | `7` | UINT16 |

### `TensorLayoutId : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `Nhwc` | `0` | NHWC |
| `Nchw` | `1` | NCHW |

### `ScalePolicy : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `None` | `0` | 无缩放 |
| `Linear` | `1` | 线性缩放 |
| `ZeroPoint` | `2` | 带零点缩放 |

---

## 结果枚举

### `ResultStatusCode : ushort`

| 成员 | 说明 |
|---|---|
| `Success` | 处理成功 |
| `Degraded` | 降质处理成功 |
| `Rejected` | 请求被拒绝 |
| `Failed` | 处理失败 |

### `ResultFlags : ushort`

| 成员 | 位掩码 | 说明 |
|---|---|---|
| `None` | `0x0000` | 无标志 |
| `Stale` | `0x0001` | 来自过期数据 |
| `Fallback` | `0x0002` | 降级 fallback |
| `Partial` | `0x0004` | 不完整结果 |

### `BudgetPolicy : byte`

| 成员 | 位掩码 | 说明 |
|---|---|---|
| `None` | `0x00` | 严格模式 |
| `AllowPartial` | `0x01` | 允许部分结果 |
| `AllowStaleReuse` | `0x02` | 允许重用过期缓存 |
| `AllowDegraded` | `0x04` | 允许降质 |
| `AllowDrop` | `0x08` | 允许丢弃 |

### `SubmitMode : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `Inline` | `0` | 内联 |
| `Reference` | `1` | 引用缓存 |
| `Mixed` | `2` | 混合 |

### `ResultClass : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `Complete` | `0` | 完整 |
| `Partial` | `1` | 部分 |
| `StaleReuse` | `2` | 缓存重用 |
| `Degraded` | `3` | 降质 |

---

## 载荷类型

### `PayloadKind : byte`

| 成员 | 位掩码 | 说明 |
|---|---|---|
| `None` | `0x00` | 无 |
| `Tensor` | `0x01` | Tensor |
| `TokenChunk` | `0x02` | Token 流块 |
| `AudioChunk` | `0x04` | 音频块 |
| `VideoChunk` | `0x08` | 视频块 |
| `StructuredEvent` | `0x10` | 结构化事件 |
| `ToolDelta` | `0x20` | Tool 增量 |
| `OpaqueBytes` | `0x40` | 不透明字节 |

---

## 错误枚举

### `ErrorCode : ushort`

| 成员 | 值 | 说明 |
|---|---|---|
| `UnsupportedVersion` | `0x0001` | 不支持的版本 |
| `AuthFailed` | `0x0002` | 认证失败 |
| `InvalidState` | `0x0003` | 非法状态 |
| `MalformedHeader` | `0x0004` | 包头格式错误 |
| `MalformedBody` | `0x0005` | 包体格式错误 |
| `UnsupportedCapability` | `0x0006` | 不支持的能力 |
| `LimitExceeded` | `0x0007` | 超出限制 |
| `FrameExpired` | `0x0008` | 帧已过期 |
| `FrameCancelled` | `0x0009` | 帧已取消 |
| `CacheMiss` | `0x000A` | 缓存未命中 |
| `ServerBusy` | `0x000B` | 服务端繁忙 |
| `InternalError` | `0x000C` | 内部错误 |

---

## 传输与连接枚举

### `TransportId : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `Unspecified` | `0` | 未指定 |
| `Quic` | `1` | QUIC |
| `Tcp` | `2` | TCP |
| `Ipc` | `3` | 本地 IPC |
| `WebSocket` | `4` | WebSocket |

### `TransportPolicy : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `Auto` | `0` | 自动 |
| `PreferQuic` | `1` | 优先 QUIC |
| `PreferTcp` | `2` | 优先 TCP |
| `PreferIpc` | `3` | 优先 IPC |
| `PreferWebSocket` | `4` | 优先 WebSocket |
| `ForceQuic` | `5` | 强制 QUIC |
| `ForceTcp` | `6` | 强制 TCP |
| `ForceIpc` | `7` | 强制 IPC |
| `ForceWebSocket` | `8` | 强制 WebSocket |

### `LossTolerance : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `Strict` | `0` | 不允许丢包 |
| `BestEffort` | `1` | 尽力而为 |
| `LowLatency` | `2` | 低延迟优先 |
| `FireAndForget` | `3` | 高丢包容忍 |

---

## 流控枚举

### `FlowUpdateScopeKind : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `Connection` | `0` | 连接级 |
| `Session` | `1` | 会话级 |
| `Operation` | `2` | 操作级 |

### `FlowUpdateReason : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `Grant` | `0` | 授予配额 |
| `Reduce` | `1` | 降低配额 |
| `Pause` | `2` | 暂停 |
| `Resume` | `3` | 恢复 |
| `Congestion` | `4` | 拥塞 |

### `FlowUpdateBackpressureLevel : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `None` | `0` | 无背压 |
| `Soft` | `1` | 软背压 |
| `Hard` | `2` | 硬背压 |

### `FlowUpdateFlags : byte`

| 成员 | 位掩码 | 说明 |
|---|---|---|
| `None` | `0x00` | 无 |
| `CreditValid` | `0x01` | credit 有效 |
| `RetryAfterValid` | `0x02` | retry_after 有效 |
| `BackgroundOnly` | `0x04` | 仅影响后台操作 |
| `DrainInFlightOnly` | `0x08` | 排空在途后生效 |

---

## 会话补丁枚举

### `SessionPatchField : byte`

| 成员 | 位掩码 | 说明 |
|---|---|---|
| `None` | `0x00` | 无字段 |
| `TargetCadence` | `0x01` | 目标帧率 |
| `QualityTier` | `0x02` | 质量档位 |
| `DegradePolicy` | `0x04` | 降质策略 |
| `ActiveLaneMask` | `0x08` | 活跃视角掩码 |
| `PreferredCodec` | `0x10` | 首选编解码器 |
| `PreferredCompression` | `0x20` | 首选压缩 |
| `ProfilePatch` | `0x40` | 完整 Profile 更新 |

### `SessionPatchAckStatus : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `Accepted` | `0` | 全部接受 |
| `PartiallyApplied` | `1` | 部分接受 |
| `Rejected` | `2` | 拒绝 |

### `SessionPatchRejectReason : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `None` | `0` | 无 |
| `UnsupportedField` | `1` | 不支持的字段 |
| `InvalidRange` | `2` | 值越界 |
| `UnsupportedStrategy` | `3` | 不支持的策略 |
| `InvalidLaneMask` | `4` | 非法视角掩码 |
| `RateLimited` | `5` | 频率受限 |

---

## 缓存枚举

### `CacheObjectKind : ushort`

| 成员 | 值 | 说明 |
|---|---|---|
| `CameraBlock` | `0x0001` | 相机参数块 |
| `TileIndexBlock` | `0x0002` | 瓦片索引块 |
| `TensorSectionTable` | `0x0003` | Tensor 分区表 |
| `CodecTable` | `0x0004` | 编解码辅助表 |
| `ReusableResultObject` | `0x0005` | 可复用结果对象 |
| `PayloadLayoutTemplate` | `0x0006` | 载荷布局模板 |
| `PromptSegment` | `0x0007` | Prompt 段 |
| `ToolSchema` | `0x0008` | Tool Schema |
| `StructuredEventSchema` | `0x0009` | 结构化事件 Schema |

### `CacheAckStatus : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `Accepted` | `0` | 接受 |
| `Rejected` | `1` | 拒绝 |
| `Replaced` | `2` | 替换旧条目 |

### `CacheInvalidateScope : byte`

| 成员 | 值 | 说明 |
|---|---|---|
| `WholeSession` | `0` | 整个会话 |
| `Namespace` | `1` | 命名空间 |
| `ObjectKind` | `2` | 对象类型 |
| `ObjectKey` | `3` | 单个条目 |

### `CachePutFlags : byte`

| 成员 | 位掩码 | 说明 |
|---|---|---|
| `None` | `0x00` | 默认 |
| `Pinned` | `0x01` | 固定 |
| `Reusable` | `0x02` | 跨帧可复用 |

---

## 使用场景指南

### 连接与传输选择

```csharp
var profile = new NnrpClientProfile
{
    TransportPolicy = TransportPolicy.PreferQuic,
    LossTolerance   = LossTolerance.LowLatency,
};
```

::: warning 坑点
- `ForceQuic` 在 TCP-only 防火墙下直接握手失败，生产环境请用 `PreferQuic`。
- `LossTolerance.FireAndForget` 不保证顺序，不要用于帧提交主路径。
:::

### 提交帧与预算策略

```csharp
var req = new NnrpSubmitRequest
{
    FrameId         = frameId,
    TileIds         = changedTiles,
    Sections        = new[] { tensorSection },
    InputProfile    = InputProfile.ChangedTilesLuma,
    SubmitMode      = SubmitMode.Inline,
    BudgetPolicy    = BudgetPolicy.AllowPartial | BudgetPolicy.AllowStaleReuse,
    InferenceBudgetMs = 8,
};
var result = await session.SubmitAsync(req);
```

::: warning 坑点
- `BudgetPolicy` 是位掩码，多值用 `|` 组合，不是逗号分隔。
- `SubmitMode.Reference` 要求提前调用 `session.PutCacheAsync()`，否则服务端返回 `ErrorCode.CacheMiss`。
:::

### 结果处理

```csharp
switch (result.ResultClass)
{
    case ResultClass.Complete:  ApplyFull(result);   break;
    case ResultClass.Partial:   ApplyPartial(result); break;
    case ResultClass.StaleReuse: break; // 复用上帧
    case ResultClass.Degraded:
        Log.Warn("Degraded with policy: {0}", result.AppliedBudgetPolicy);
        break;
}
if (result.ResultFlags.HasFlag(ResultFlags.Fallback))
    metrics.IncrementDegradedFallback();
```

### 错误处理

```csharp
try
{
    await session.SubmitAsync(req);
}
catch (NnrpProtocolException ex)
{
    if (ex.ErrorScope == ErrorScope.Connection)
    {
        // 连接级错误，致命，必须重建连接
        await session.DisposeAsync();
        session = await client.ConnectAsync(host, port);
    }
    else if (ex.ErrorCode == ErrorCode.FrameExpired)
    {
        // 帧级错误，跳过继续
    }
}
```

::: warning 坑点
- `ErrorScope.Connection` 错误不可在同一 Session 上重试。
- 捕获到 `NnrpProtocolException` 后忘记检查 `ErrorScope`，仍向旧 session 发送数据，会导致后续请求全部失败。
:::
