# Python — 客户端

客户端 API 定义在 `nnrp.client` 包中。

## 导入

```python
from nnrp.client import (
    # 配置
    ClientProfile, ClientDialPolicy, resolve_client_hello_transport_policy,
    # 会话
    ClientSession, ClientControlBootstrapSession,
    # 传输
    ClientTransportBootstrap, ClientTransportPlan,
    # 迁移
    MigrationOutcome, MigrationTriggerMonitor,
    MigrationTriggerPolicy, MigrationTriggerSnapshot,
    # 数据
    PathHealthSample, Result, ResultRouter,
    SubmitRequest, TypedPayload,
    # 探测
    TransportProbeResult, TransportProbeSummary, TransportProbeSelection,
    # 函数
    bootstrap_client_transport, build_client_hello_packet,
    connect_client_control, connect_client_control_with_probe,
    connect_client_session, connect_client_session_with_probe,
    probe_client_transport, plan_client_transport,
)
```

---

## 配置类型

### `ClientProfile`

客户端全局配置（`@dataclass`，可变）。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `max_views` | `int` | `1` | 最大并发视角数 |
| `enable_cache` | `bool` | `True` | 是否启用服务端缓存协商 |
| `max_cache_entries` | `int` | `256` | 最大缓存条目数 |
| `max_cache_bytes` | `int` | `8388608` | 最大缓存字节数（8 MB） |

### `ClientDialPolicy`

连接时的传输策略（`@dataclass(frozen=True)`）。

| 字段 | 类型 | 说明 |
|---|---|---|
| `selected_transport_id` | `TransportId` | 当前实际选择的传输类型 |
| `forced_transport_id` | `TransportId` | 强制指定的传输类型（`UNSPECIFIED` = 不强制） |

```python
def to_client_hello_transport_policy(self) -> ClientHelloTransportPolicyExtension | None:
    """转换为握手时携带的传输策略扩展（若无偏好则返回 None）。"""
```

### `resolve_client_hello_transport_policy`

```python
def resolve_client_hello_transport_policy(
    *,
    selected_transport_id: TransportId,
    forced_transport_id: TransportId,
) -> ClientHelloTransportPolicyExtension | None:
    """根据选择的传输类型和强制策略，生成握手扩展。"""
```

---

## 会话类型

### `ClientSession`

已建立连接的客户端会话，提供帧提交与结果接收循环。

```python
async def submit(
    self,
    request: SubmitRequest,
    *,
    timeout: float | None = None,
) -> Result:
    """提交一帧并等待结果。"""

async def submit_nowait(
    self,
    request: SubmitRequest,
) -> None:
    """提交一帧，不等待结果（需配合 receive_result 轮询）。"""

async def receive_result(
    self,
    *,
    timeout: float | None = None,
) -> Result:
    """等待并接收下一个结果。"""

async def patch_session(
    self,
    patch_fields: SessionPatchField,
    *,
    target_cadence: int = 0,
    quality_tier: int = 0,
    active_lane_mask: int = 0xFF,
    preferred_codec: int = 0,
    preferred_compression: int = 0,
) -> SessionPatchAckMetadata:
    """发送会话补丁请求并等待服务端应答。"""

async def close(self) -> None:
    """发送 CLOSE 消息并关闭连接。"""
```

**方法参数说明**

| 方法 | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `submit` | `request`: [`SubmitRequest`](#submitrequest)；`timeout`: 等待超时秒数（`None` = 永不超时） | `Result` | 提交帧并阻塞等待结果；超时则抛出 `asyncio.TimeoutError` |
| `submit_nowait` | `request`: [`SubmitRequest`](#submitrequest) | `None` | 提交帧立即返回，结果须通过 `receive_result` 轮询获取 |
| `receive_result` | `timeout`: 超时秒数（`None` = 永不超时） | `Result` | 等待并返回下一个服务端推送的结果；多帧并发时须配合 `ResultRouter` 按 `frame_id` 分发 |
| `patch_session` | `patch_fields`: [`SessionPatchField`](/zh/sdk/python/api/enums#会话补丁枚举) 位标志（指定要修改哪些字段）；`target_cadence`（目标帧率，0=不变）；`quality_tier`（质量档位 0–255）；`active_lane_mask`（激活通道掩码）；`preferred_codec`；`preferred_compression` | `SessionPatchAckMetadata` | 动态调整会话参数；**只有在 `patch_fields` 中设置了对应标志位的字段才会生效** |
| `close` | — | `None` | 发送 `CLOSE` 消息并关闭底层连接；建议在 `finally` 块中调用 |

> **`SubmitRequest` 关键字段**：`frame_id`（帧 ID，必须单调递增或唯一）、`tile_ids`（本次变化的瓦片 ID 元组）、`sections`（[`TensorSectionData`](/zh/sdk/python/api/packet#tensorsectiondata) 元组）、`input_profile`（[`InputProfile`](/zh/sdk/python/api/enums#inputprofile-intenum)）、`submit_mode`（`INLINE` 传输 / `REFERENCE` 引用缓存）、`budget_policy`（[`BudgetPolicy`](/zh/sdk/python/api/enums#budgetpolicy-intflag) 位标志组合，控制是否允许降质返回）、`inference_budget_ms`（推理预算毫秒数，0 = 无限制）。

### `ClientControlBootstrapSession`

握手引导会话，用于在 `ClientSession` 创建前完成 `CLIENT_HELLO` / `SERVER_HELLO_ACK` 交换。

```python
async def bootstrap(
    self,
    profile: ClientProfile,
    dial_policy: ClientDialPolicy,
    *,
    auth_block: bytes = b"",
) -> "ServerHelloAckMetadata":
    """执行握手，返回服务端应答元数据。"""
```

---

## 传输类型

### `ClientTransportBootstrap`

传输层引导上下文，持有建立连接所需的传输对象和协商结果。

### `ClientTransportPlan`

传输规划结果（由 `plan_client_transport` 返回），包含选定的传输路径。

| 字段 | 类型 | 说明 |
|---|---|---|
| `transport_id` | `TransportId` | 最终选定的传输类型 |
| `dial_policy` | `ClientDialPolicy` | 对应的拨号策略 |

---

## 迁移类型

### `MigrationOutcome`

会话迁移结果。

| 值 | 说明 |
|---|---|
| `SUCCESS` | 迁移成功完成 |
| `FAILED` | 迁移失败，会话已断开 |
| `SKIPPED` | 迁移条件不满足，已跳过 |

### `MigrationTriggerPolicy`

迁移触发策略配置。

| 字段 | 类型 | 说明 |
|---|---|---|
| `min_rtt_improvement_ms` | `float` | 触发迁移所需的最小 RTT 改善（毫秒） |
| `probe_interval_s` | `float` | 路径探测间隔（秒） |
| `max_consecutive_failures` | `int` | 触发迁移前的最大连续失败次数 |

### `MigrationTriggerSnapshot`

某一时刻的迁移触发状态快照。

### `MigrationTriggerMonitor`

后台迁移触发监视器，持续监控路径健康状态。

```python
async def run(self) -> None:
    """启动后台监视循环（通常用 asyncio.create_task 包装）。"""

async def stop(self) -> None:
    """停止监视循环。"""
```

---

## 数据类型

### `SubmitRequest`

帧提交请求数据（`@dataclass(frozen=True)`）。

| 字段 | 类型 | 说明 |
|---|---|---|
| `frame_id` | `int` | 帧 ID |
| `tile_ids` | `tuple[int, ...]` | 提交的瓦片 ID 列表 |
| `sections` | `tuple[TensorSectionData, ...]` | Tensor 分区数据 |
| `typed_payloads` | `tuple[TypedPayload, ...]` | 非 Tensor 类型载荷 |
| `input_profile` | `InputProfile` | 输入数据格式 |
| `submit_mode` | `SubmitMode` | 提交模式 |
| `budget_policy` | `BudgetPolicy` | 允许的降质策略 |
| `inference_budget_ms` | `int` | 推理预算（毫秒） |
| `deadline_ms` | `int` | 绝对截止时间 |

### `TypedPayload`

非 Tensor 类型载荷（如 Token 流、音视频块）。

| 字段 | 类型 | 说明 |
|---|---|---|
| `payload_kind` | `PayloadKind` | 载荷类型 |
| `data` | `bytes` | 原始载荷字节 |

### `Result`

服务端推送的处理结果。

| 字段 | 类型 | 说明 |
|---|---|---|
| `packet` | `NnrpPacket` | 原始数据包 |
| `metadata` | `ResultPushMetadata` | 解析后的结果元数据 |
| `sections` | `tuple[TensorSectionData, ...]` | Tensor 分区数据 |
| `typed_payloads` | `tuple[TypedPayload, ...]` | 非 Tensor 载荷帧 |

### `ResultRouter`

多路复用结果路由器，按 `frame_id` 分发结果。

```python
async def put(self, result: Result) -> None: ...
async def get(self, frame_id: int, *, timeout: float | None = None) -> Result: ...
```

---

## 路径健康与探测

### `PathHealthSample`

单次路径健康采样数据。

| 字段 | 类型 | 说明 |
|---|---|---|
| `transport_id` | `TransportId` | 采样的传输类型 |
| `rtt_ms` | `float` | 往返延迟（毫秒） |
| `loss_rate` | `float` | 丢包率（0.0–1.0） |
| `timestamp_s` | `float` | 采样时间（Unix 秒） |

### `TransportProbeResult`

单次传输探测结果。

| 字段 | 类型 | 说明 |
|---|---|---|
| `probe_id` | `int` | 探测 ID |
| `transport_id` | `TransportId` | 探测的传输类型 |
| `rtt_us` | `int` | 往返延迟（微秒） |
| `success` | `bool` | 探测是否成功 |

### `TransportProbeSummary`

多次探测的汇总统计。

### `TransportProbeSelection`

探测后的传输选择结论。

| 字段 | 类型 | 说明 |
|---|---|---|
| `selected_transport_id` | `TransportId` | 推荐使用的传输类型 |
| `summary` | `TransportProbeSummary` | 汇总统计 |

---

## 连接函数

### `connect_client_session`

```python
async def connect_client_session(
    connection: NnrpQuicConnection | NnrpTcpConnection,
    profile: ClientProfile,
    dial_policy: ClientDialPolicy,
    *,
    auth_block: bytes = b"",
) -> ClientSession:
    """完成握手并返回已建立的 ClientSession。"""
```

### `connect_client_session_with_probe`

```python
async def connect_client_session_with_probe(
    connection: NnrpQuicConnection | NnrpTcpConnection,
    profile: ClientProfile,
    *,
    auth_block: bytes = b"",
) -> ClientSession:
    """先执行路径探测选择最优传输，再建立 ClientSession。"""
```

### `connect_client_control`

```python
async def connect_client_control(
    connection: NnrpQuicConnection | NnrpTcpConnection,
) -> ClientControlBootstrapSession:
    """建立控制引导会话。"""
```

### `connect_client_control_with_probe`

```python
async def connect_client_control_with_probe(
    connection: NnrpQuicConnection | NnrpTcpConnection,
) -> ClientControlBootstrapSession:
    """先探测路径，再建立控制引导会话。"""
```

### `bootstrap_client_transport`

```python
async def bootstrap_client_transport(
    host: str,
    port: int,
    *,
    profile: ClientProfile,
    dial_policy: ClientDialPolicy,
    quic_config: QuicConfiguration | None = None,
    tcp_config: NnrpTcpClientConfiguration | None = None,
) -> ClientTransportBootstrap:
    """创建底层传输连接，不执行握手。"""
```

### `plan_client_transport`

```python
async def plan_client_transport(
    host: str,
    port: int,
    *,
    quic_config: QuicConfiguration | None = None,
    tcp_config: NnrpTcpClientConfiguration | None = None,
) -> ClientTransportPlan:
    """探测所有可用路径，返回建议传输规划。"""
```

### `probe_client_transport`

```python
async def probe_client_transport(
    host: str,
    port: int,
    transport_id: TransportId,
    *,
    config: QuicConfiguration | NnrpTcpClientConfiguration | None = None,
) -> TransportProbeSummary:
    """对指定传输执行探测，返回汇总统计。"""
```

### `build_client_hello_packet`

```python
def build_client_hello_packet(
    session_id: int,
    profile: ClientProfile,
    dial_policy: ClientDialPolicy,
    *,
    auth_block: bytes = b"",
    extra_extensions: tuple[ControlExtensionEntry, ...] = (),
) -> NnrpPacket:
    """构造 CLIENT_HELLO 数据包（低层 API）。"""
```

---

## 典型使用场景

### 场景一：连接、提交帧、接收结果

这是最常见的用法：建立会话后在一个循环里持续提交帧并等待结果。

```python
import asyncio
from nnrp.client import ClientProfile, ClientDialPolicy, dial_client, SubmitRequest
from nnrp import (
    TransportPolicy, LossTolerance, InputProfile,
    SubmitMode, BudgetPolicy, ResultClass,
)
from nnrp.adapters.quic import create_quic_client_configuration

async def render_loop(host: str, port: int):
    config = create_quic_client_configuration(cafile="ca.pem")
    profile = ClientProfile(
        transport_policy=TransportPolicy.PREFER_QUIC,
        loss_tolerance=LossTolerance.LOW_LATENCY,
    )
    async with await dial_client(host, port, profile=profile, config=config) as session:
        frame_id = 0
        while True:
            tiles, tensor = capture_changed_tiles()
            request = SubmitRequest(
                frame_id=frame_id,
                tile_ids=tiles,
                sections=(tensor,),
                input_profile=InputProfile.CHANGED_TILES_LUMA,
                submit_mode=SubmitMode.INLINE,
                budget_policy=BudgetPolicy.ALLOW_PARTIAL,
                inference_budget_ms=8,
            )
            await session.submit_frame(request)
            result = await session.receive_result(frame_id=frame_id, timeout=0.05)
            if result.metadata.result_class == ResultClass.COMPLETE:
                display(result.sections)
            frame_id += 1
```

### 场景二：响应背压信号

服务端会通过 `RESULT_HINT` 和 `FLOW_UPDATE` 通知客户端降速；客户端需要主动监听并调整提交节奏。

```python
from nnrp import ResultHintCongestionState, FlowUpdateReason

async def run_with_backpressure(session):
    paused = False

    async def monitor_hints():
        nonlocal paused
        async for hint in session.result_hints():
            if hint.congestion_state == ResultHintCongestionState.SATURATED:
                paused = True
            elif hint.congestion_state == ResultHintCongestionState.NONE:
                paused = False

    asyncio.create_task(monitor_hints())

    frame_id = 0
    while True:
        if paused:
            await asyncio.sleep(0.016)  # 等一帧周期后再检查
            continue
        await session.submit_frame(make_request(frame_id))
        frame_id += 1
```

### 场景三：会话迁移（多路径切换）

QUIC 支持在网络路径变化时无损迁移会话，SDK 通过 `MigrationTriggerMonitor` 自动探测并触发。

```python
from nnrp.client import MigrationTriggerPolicy

policy = MigrationTriggerPolicy(
    min_rtt_improvement_ms=10.0,
    probe_interval_s=5.0,
    max_consecutive_failures=3,
)
monitor = session.create_migration_monitor(policy)
asyncio.create_task(monitor.run())

# 收到 SESSION_MIGRATE 时 SDK 自动处理，业务代码无需干预
# 迁移结果可通过 session.migration_events() 观察
async for outcome in session.migration_events():
    if outcome == MigrationOutcome.FAILED:
        log.warning("Migration failed, session may degrade")
```

---

## 常见坑点

::: warning
1. **`dial_client` 返回的 `ClientSession` 必须关闭**：直接 `await dial_client(...)` 而不用 `async with` 时，若进程异常退出，连接不会被优雅关闭，服务端会等到超时才回收资源。推荐始终用 `async with` 或在 `finally` 里调用 `await session.close()`。

2. **不要在多个协程里并发 `submit_frame`**：`ClientSession` 的发送路径不是线程安全的，多协程并发写会产生包交错。若需并发提交，请使用 `ResultRouter` 分发结果，但提交本身应序列化。

3. **`receive_result(frame_id, timeout=...)` 超时后帧 ID 仍占用路由槽**：超时后需显式调用 `session.discard_frame(frame_id)` 释放，否则 `ResultRouter` 内存会持续增长。

4. **`ClientProfile` 里的 `inference_budget_ms` 是默认值**，每次 `SubmitRequest` 可以覆盖；但 `SubmitRequest.deadline_ms` 是绝对截止时间戳（毫秒级 Unix 时间），不是相对偏移，两者容易混淆。

5. **`TransportPolicy.FORCE_QUIC` 在 TCP-only 防火墙下握手直接失败**，生产环境建议用 `PREFER_QUIC`，在握手失败时 SDK 会自动回退到 TCP。
:::
