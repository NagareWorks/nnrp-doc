---
prev:
  text: 运行时控制 Profiles
  link: /zh/profiles/runtime-control/
next:
  text: 运行时控制帧 Metadata
  link: /zh/profiles/runtime-control/control-frames/
---

# 运行时控制取值注册表

运行时控制固定 metadata
布局里的多取值字段都使用本页注册表。除非字段显式声明私有/厂商范围，否则不在标准范围内的取值无效。私有/厂商取值不能用于强制一致性测试场景。

接收方必须拒绝设置了保留 flag bit、使用保留枚举值，或把 `reserved` 字段设为非零的固定 metadata。

## Role Codes

| 取值         | 名称                 | 含义                                 |
| ------------ | -------------------- | ------------------------------------ |
| `0x00`       | `unspecified`        | 只允许用于可选 role 字段。           |
| `0x01`       | `client`             | 客户端 SDK、调用方或浏览器端点。     |
| `0x02`       | `server`             | 服务端 SDK 或服务端点。              |
| `0x03`       | `runtime`            | Runtime host 或本地执行引擎。        |
| `0x04`       | `subagent`           | Agent worker 或委托执行单元。        |
| `0x05`       | `tool`               | Tool host 或工具执行器。             |
| `0x06`       | `scheduler`          | 调度器、路由器或准入控制器。         |
| `0x07`       | `conformance_runner` | 线路级一致性测试 runner。            |
| `0x08..0x7f` | 保留                 | 为后续标准 role code 保留。          |
| `0x80..0xff` | 私有/厂商            | 私有扩展范围；不纳入强制一致性测试。 |

## Reason 与 Stage Codes

| 字段               | 取值             | 名称                    | 含义                                |
| ------------------ | ---------------- | ----------------------- | ----------------------------------- |
| `reason_code`      | `0x0000`         | `unspecified`           | 通用原因。                          |
| `reason_code`      | `0x0001`         | `user_cancelled`        | 用户或调用方取消。                  |
| `reason_code`      | `0x0002`         | `superseded`            | 被更新的 operation 替代。           |
| `reason_code`      | `0x0003`         | `deadline_expired`      | Deadline 或过期时间已过。           |
| `reason_code`      | `0x0004`         | `budget_exceeded`       | 计算、内存、带宽或 token 预算超限。 |
| `reason_code`      | `0x0005`         | `dependency_failed`     | 必要依赖失败。                      |
| `reason_code`      | `0x0006`         | `transport_closing`     | 传输层正在关闭。                    |
| `reason_code`      | `0x0007`         | `shutdown`              | Runtime 或服务正在关闭。            |
| `reason_code`      | `0x0008`         | `conformance_injection` | 一致性测试 runner 注入。            |
| `drop_reason_code` | `0x0000`         | `none`                  | 无 drop reason。                    |
| `drop_reason_code` | `0x0001`         | `deadline_expired`      | 因 deadline 丢弃。                  |
| `drop_reason_code` | `0x0002`         | `superseded`            | 因更新 operation 替代而丢弃。       |
| `drop_reason_code` | `0x0003`         | `peer_cancelled`        | 对端取消后丢弃。                    |
| `drop_reason_code` | `0x0004`         | `backpressure`          | 背压策略导致丢弃。                  |
| `drop_reason_code` | `0x0005`         | `capability_mismatch`   | 所需能力不可用。                    |
| `drop_reason_code` | `0x0006`         | `budget_exceeded`       | 预算超限。                          |
| `drop_reason_code` | `0x0007`         | `object_invalidated`    | 引用对象已失效。                    |
| `drop_reason_code` | `0x0008`         | `transport_closed`      | 结果投递前传输层关闭。              |
| `drop_reason_code` | `0x0009`         | `conformance_injection` | 一致性测试 runner 注入。            |
| `stage_code`       | `0x0000`         | `unspecified`           | 未指定阶段。                        |
| `stage_code`       | `0x0001`         | `queued`                | 已进入队列。                        |
| `stage_code`       | `0x0002`         | `admitted`              | 已准入执行。                        |
| `stage_code`       | `0x0003`         | `input_received`        | 必要输入已到达。                    |
| `stage_code`       | `0x0004`         | `preprocessing`         | 正在预处理输入。                    |
| `stage_code`       | `0x0005`         | `executing`             | 主执行流程运行中。                  |
| `stage_code`       | `0x0006`         | `waiting_dependency`    | 等待依赖或上游结果。                |
| `stage_code`       | `0x0007`         | `producing_partial`     | 正在产生部分结果。                  |
| `stage_code`       | `0x0008`         | `finalizing`            | 正在收尾输出。                      |
| `stage_code`       | `0x0009`         | `completed`             | 正常完成。                          |
| `stage_code`       | `0x000a`         | `dropped`               | 结果或 operation 被丢弃。           |
| `stage_code`       | `0x000b`         | `failed`                | 执行失败。                          |
| 任一 listed 字段   | `0x000c..0x00ff` | 保留                    | 为后续标准值保留。                  |
| `stage_code`       | `0x0100..0x7fff` | Profile 标准阶段        | 由具体标准 profile 拥有的阶段。     |
| 任一 listed 字段   | `0x8000..0xffff` | 私有/厂商扩展           | 私有扩展范围；不纳入测试。          |

## Pressure、Cost、Route、Object 与 Cache Codes

| 字段                   | 取值                   | 名称                    | 含义                             |
| ---------------------- | ---------------------- | ----------------------- | -------------------------------- |
| `pressure_level`       | `0x0000`               | `none`                  | 无压力。                         |
| `pressure_level`       | `0x0001`               | `soft`                  | 发送方应减速。                   |
| `pressure_level`       | `0x0002`               | `hard`                  | 发送方必须停止或等待 credit。    |
| `pressure_level`       | `0x0003`               | `paused`                | Scope 暂停直到后续通知。         |
| `pressure_reason`      | `0x0000`               | `unspecified`           | 通用压力原因。                   |
| `pressure_reason`      | `0x0001`               | `receiver_queue_full`   | 接收方队列已满。                 |
| `pressure_reason`      | `0x0002`               | `sender_queue_full`     | 发送方队列已满。                 |
| `pressure_reason`      | `0x0003`               | `memory_pressure`       | 内存压力。                       |
| `pressure_reason`      | `0x0004`               | `bandwidth_pressure`    | 带宽压力。                       |
| `pressure_reason`      | `0x0005`               | `compute_pressure`      | 计算容量压力。                   |
| `pressure_reason`      | `0x0006`               | `deadline_pressure`     | Deadline 或新鲜度压力。          |
| `pressure_reason`      | `0x0007`               | `fairness_policy`       | 公平性策略限流。                 |
| `pressure_reason`      | `0x0008`               | `conformance_injection` | 一致性测试 runner 注入。         |
| `cost_model_id`        | `0x0000`               | `unspecified`           | 未指定成本模型。                 |
| `cost_model_id`        | `0x0001`               | `bytes_only`            | 成本 entry 为字节数。            |
| `cost_model_id`        | `0x0002`               | `compute_units`         | 成本 entry 为计算单元。          |
| `cost_model_id`        | `0x0003`               | `token_units`           | 成本 entry 为 token 单元。       |
| `cost_model_id`        | `0x0004`               | `memory_bytes`          | 成本 entry 为内存字节预算。      |
| `cost_model_id`        | `0x0005`               | `bandwidth_bytes`       | 成本 entry 为带宽字节预算。      |
| `cost_model_id`        | `0x0006`               | `weighted_units`        | 成本 entry 使用协商权重单元。    |
| `executor_class`       | `0x0000`               | `unspecified`           | 未指定 executor 类别。           |
| `executor_class`       | `0x0001`               | `local_runtime`         | 本地 runtime executor。          |
| `executor_class`       | `0x0002`               | `remote_runtime`        | 远端 runtime executor。          |
| `executor_class`       | `0x0003`               | `gpu_worker`            | GPU worker。                     |
| `executor_class`       | `0x0004`               | `cpu_worker`            | CPU worker。                     |
| `executor_class`       | `0x0005`               | `subagent`              | Agent worker。                   |
| `executor_class`       | `0x0006`               | `tool_host`             | Tool host。                      |
| `executor_class`       | `0x0007`               | `model_server`          | Model server。                   |
| `executor_class`       | `0x0008`               | `render_worker`         | Render worker。                  |
| `affinity_class`       | `0x0000`               | `none`                  | 不要求 affinity。                |
| `affinity_class`       | `0x0001`               | `same_process`          | 偏好同进程。                     |
| `affinity_class`       | `0x0002`               | `same_host`             | 偏好同主机。                     |
| `affinity_class`       | `0x0003`               | `same_gpu`              | 偏好同 GPU。                     |
| `affinity_class`       | `0x0004`               | `same_numa`             | 偏好同 NUMA 节点。               |
| `affinity_class`       | `0x0005`               | `same_region`           | 偏好同区域。                     |
| `affinity_class`       | `0x0006`               | `storage_local`         | 偏好本地存储。                   |
| `object_kind`          | `0x0000`               | `unspecified`           | 未指定对象类型。                 |
| `object_kind`          | `0x0001`               | `tensor`                | Tensor 或 tensor shard。         |
| `object_kind`          | `0x0002`               | `token_block`           | Token block。                    |
| `object_kind`          | `0x0003`               | `image_tile`            | 图像或渲染 tile。                |
| `object_kind`          | `0x0004`               | `feature_map`           | Feature map。                    |
| `object_kind`          | `0x0005`               | `tool_result`           | 工具结果 artifact。              |
| `object_kind`          | `0x0006`               | `trace_segment`         | Trace segment artifact。         |
| `object_kind`          | `0x0007`               | `opaque_bytes`          | 不透明字节对象。                 |
| `object_kind`          | `0x0008`               | `document_chunk`        | Document chunk。                 |
| `object_kind`          | `0x0009`               | `audio_chunk`           | Audio chunk。                    |
| `object_kind`          | `0x000a`               | `video_chunk`           | Video chunk。                    |
| `object_kind`          | `0x000b`               | `route_plan`            | Route plan artifact。            |
| `object_kind`          | `0x000c`               | `cache_manifest`        | Cache manifest artifact。        |
| `memory_location_hint` | `0x0000`               | `unspecified`           | 未指定位置。                     |
| `memory_location_hint` | `0x0001`               | `host_memory`           | Host memory。                    |
| `memory_location_hint` | `0x0002`               | `device_memory`         | Device memory。                  |
| `memory_location_hint` | `0x0003`               | `shared_memory`         | Shared memory。                  |
| `memory_location_hint` | `0x0004`               | `remote_memory`         | Remote memory。                  |
| `memory_location_hint` | `0x0005`               | `mmap_file`             | Memory-mapped file。             |
| `memory_location_hint` | `0x0006`               | `object_store`          | 外部 object store。              |
| `ownership_hint`       | `0x0000`               | `unspecified`           | 未指定所有权。                   |
| `ownership_hint`       | `0x0001`               | `producer_owned`        | Producer 保留所有权。            |
| `ownership_hint`       | `0x0002`               | `consumer_owned`        | Consumer 获取所有权。            |
| `ownership_hint`       | `0x0003`               | `session_owned`         | Session 拥有对象生命周期。       |
| `ownership_hint`       | `0x0004`               | `borrowed`              | 借用引用。                       |
| `ownership_hint`       | `0x0005`               | `transfer_on_ref`       | 引用时转移所有权。               |
| `ownership_hint`       | `0x0006`               | `release_on_drop`       | 结果丢弃时释放。                 |
| `release_reason`       | `0x0000`               | `completed`             | 完成后正常释放。                 |
| `release_reason`       | `0x0001`               | `cancelled`             | 取消后释放。                     |
| `release_reason`       | `0x0002`               | `expired`               | 过期后释放。                     |
| `release_reason`       | `0x0003`               | `replaced`              | 被替换后释放。                   |
| `release_reason`       | `0x0004`               | `invalidated`           | 因失效释放。                     |
| `release_reason`       | `0x0005`               | `owner_closed`          | Owner 关闭。                     |
| `release_reason`       | `0x0006`               | `lease_expired`         | Lease 过期。                     |
| `release_reason`       | `0x0007`               | `conformance_injection` | 一致性测试 runner 注入。         |
| `reuse_scope`          | `0x0000`               | `operation`             | 单个 operation 内复用。          |
| `reuse_scope`          | `0x0001`               | `session`               | 单个 session 内复用。            |
| `reuse_scope`          | `0x0002`               | `connection`            | 单个 connection 内复用。         |
| `reuse_scope`          | `0x0003`               | `global`                | 跨 connection 复用。             |
| `reuse_scope`          | `0x0004`               | `tenant`                | 单个 tenant 内复用。             |
| `reuse_scope`          | `0x0005`               | `profile`               | 单个 profile namespace 内复用。  |
| `miss_reason`          | `0x0000`               | `unknown`               | 未知 miss 原因。                 |
| `miss_reason`          | `0x0001`               | `not_found`             | 未找到 cache key。               |
| `miss_reason`          | `0x0002`               | `expired`               | Entry 已过期。                   |
| `miss_reason`          | `0x0003`               | `invalidated`           | Entry 已失效。                   |
| `miss_reason`          | `0x0004`               | `schema_mismatch`       | Entry schema 或 profile 不匹配。 |
| `miss_reason`          | `0x0005`               | `producer_unavailable`  | Producer 或 owner 不可用。       |
| `miss_reason`          | `0x0006`               | `lease_required`        | 需要 lease 但缺失。              |
| `miss_reason`          | `0x0007`               | `permission_denied`     | 无访问权限。                     |
| 任一 listed 字段       | 首个未使用值..`0x7fff` | 保留                    | 为后续标准值保留。               |
| 任一 listed 字段       | `0x8000..0xffff`       | 私有/厂商扩展           | 私有扩展范围；不纳入测试。       |

## Flag Masks

| Metadata 布局             | 字段    | 有效 mask    | 定义 bit                                                    |
| ------------------------- | ------- | ------------ | ----------------------------------------------------------- |
| Control Request Metadata  | `flags` | `0x03`       | bit `0`：允许协作取消；bit `1`：允许硬中断。                |
| Scheduling Metadata       | `flags` | `0x00000003` | bit `0`：丢弃过期任务；bit `1`：发出 drop reason。          |
| Supersede Metadata        | `flags` | `0x0001`     | bit `0`：立即 abort 旧 operation。                          |
| Budget Metadata           | `flags` | `0x00000003` | bit `0`：替换；bit `1`：增量；必须且只能设置一个。           |
| Partial Result Metadata   | `flags` | `0x00000003` | bit `0`：最后一个 partial；bit `1`：存在 object ref。       |
| Pressure Metadata         | `flags` | `0x00000003` | bit `0`：作用于连接；bit `1`：作用于 operation。            |
| Capability Metadata       | `flags` | `0x00000003` | bit `0`：硬性要求；bit `1`：允许降级。                      |
| Route Hint Metadata       | `flags` | `0x00000003` | bit `0`：必须遵守；bit `1`：尽力而为。                      |
| Trace Context Metadata    | `flags` | `0x0003`     | bit `0`：采样；bit `1`：错误。                              |
| Result Drop Metadata      | `flags` | `0x03`       | bit `0`：最终；bit `1`：可重试。                            |
| Recoverable Error Metadata | `flags` | `0x03`       | bit `0`：当前可重试；bit `1`：必须等待 retry_after。         |
| Retry After Metadata      | `flags` | `0x03`       | bit `0`：作用于连接；bit `1`：作用于 operation。             |
| Object Reference Metadata | `flags` | `0x00000007` | bit `0`：borrowed；bit `1`：mutable；bit `2`：存在 region。 |
| Object Release Metadata   | `flags` | `0x03`       | bit `0`：最终释放；bit `1`：使依赖对象失效。                |
| Object Delta Metadata     | `flags` | `0x00000007` | bit `0`：替换区域；bit `1`：压缩；bit `2`：最终 delta。     |
| Cache Reference Metadata  | `flags` | `0x00000003` | bit `0`：要求 lease；bit `1`：存在 body fallback。          |
