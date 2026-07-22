import type { CapabilityVersionPresetOverride } from "./capabilityManifestShared";

export const capabilityManifestPresetOverrides: Record<string, CapabilityVersionPresetOverride> = {
  "nnrp-1-preview2": {
    title: {
      zh: "NNRP/1 Preview2",
      en: "NNRP/1 Preview2"
    },
    note: {
      zh: "覆盖 Preview2 的线缆向量、控制面、数据面与传输 smoke 能力。",
      en: "Covers the preview2 wire vectors, control plane, data plane, and transport smoke capabilities."
    },
    capabilityOverrides: {
      "body_region.prelude": {
        description: {
          zh: "固定 body-region prelude 的编码布局。",
          en: "Stable encoding layout for the body-region prelude."
        }
      },
      "cache.lifecycle": {
        description: {
          zh: "缓存对象的分配、确认、失效与命名空间管理。",
          en: "Cache-object allocation, acknowledgement, invalidation, and namespace handling."
        }
      },
      "control.client_hello": {
        description: {
          zh: "CLIENT_HELLO 固定元数据块。",
          en: "CLIENT_HELLO fixed metadata block."
        }
      },
      "control.session_patch_ack": {
        description: {
          zh: "SESSION_PATCH_ACK 固定元数据块。",
          en: "SESSION_PATCH_ACK fixed metadata block."
        }
      },
      "flow_update": {
        description: {
          zh: "FLOW_UPDATE 的线缆与语义双层约束。",
          en: "FLOW_UPDATE at both wire and semantic layers."
        }
      },
      "frame_submit.mixed": {
        description: {
          zh: "混合提交模式的 FRAME_SUBMIT 主路径。",
          en: "The mixed-submit FRAME_SUBMIT hot path."
        },
        combination: {
          zh: "需同时声明 payload.tensor。",
          en: "Must also claim payload.tensor."
        }
      },
      "object_reference.cache": {
        description: {
          zh: "缓存对象引用块，以及结果体中的引用解析。",
          en: "Cache object-reference blocks and result-body reference resolution."
        },
        combination: {
          zh: "L1 可选检查还会与 result_push.partial 组合。",
          en: "The L1 optional check also combines with result_push.partial."
        }
      },
      "payload.tensor": {
        description: {
          zh: "Tensor profile 主路径依赖能力。",
          en: "Dependency capability for the tensor-profile main path."
        },
        combination: {
          zh: "常与 frame_submit.mixed、result_push.partial、result_push.stale_reuse 组合。",
          en: "Usually paired with frame_submit.mixed, result_push.partial, and result_push.stale_reuse."
        }
      },
      "payload.typed": {
        description: {
          zh: "非 tensor typed payload 的 descriptor 与 region 打包。",
          en: "Non-tensor typed payload descriptors and region packing."
        }
      },
      "result_hint": {
        description: {
          zh: "RESULT_HINT 的固定包体与语义验证。",
          en: "RESULT_HINT wire shape and metadata semantics."
        }
      },
      "result_push.degraded": {
        description: {
          zh: "degraded/fallback 结果路径，目前仅信息性跟踪。",
          en: "Degraded / fallback result path, currently informational only."
        }
      },
      "result_push.partial": {
        description: {
          zh: "部分交付结果路径。",
          en: "Partial-delivery results."
        },
        combination: {
          zh: "mandatory 主结果路径还需 result_push.stale_reuse 与 payload.tensor。",
          en: "The mandatory result path also needs result_push.stale_reuse and payload.tensor."
        }
      },
      "result_push.stale_reuse": {
        description: {
          zh: "旧帧复用语义。",
          en: "Stale-frame reuse semantics."
        },
        combination: {
          zh: "需同时声明 result_push.partial 与 payload.tensor。",
          en: "Must also claim result_push.partial and payload.tensor."
        }
      },
      "transport.probe": {
        description: {
          zh: "探测元数据与传输选择逻辑。",
          en: "Probe metadata and transport-selection logic."
        }
      },
      "transport.quic": {
        description: {
          zh: "QUIC smoke 互通能力。",
          en: "QUIC smoke interoperability."
        }
      },
      "transport.tcp": {
        description: {
          zh: "TCP smoke 互通能力。",
          en: "TCP smoke interoperability."
        }
      }
    }
  },
  "nnrp-1-preview3": {
    title: {
      zh: "NNRP/1 Preview3",
      en: "NNRP/1 Preview3"
    },
    note: {
      zh: "覆盖 Preview3 当前 mandatory core，以及正在演进的 optional / experimental 能力。",
      en: "Covers the current Preview3 mandatory core plus the evolving optional and experimental capabilities."
    },
    capabilityOverrides: {
      "handshake.basic": {
        description: {
          zh: "最小握手与能力协商流程。",
          en: "Minimum handshake and capability negotiation flow."
        }
      },
      "session.open_close": {
        description: {
          zh: "会话打开、维持与关闭状态机。",
          en: "Session open, maintain, and close state machine."
        },
        combination: {
          zh: "常与 session.resume、session.multi_session 组合。",
          en: "Often combined with session.resume and session.multi_session."
        }
      },
      "frame_submit.tensor.inline": {
        description: {
          zh: "最小 inline tensor 提交路径。",
          en: "Minimum inline tensor submit path."
        },
        combination: {
          zh: "需同时声明 result_push.basic。",
          en: "Must also claim result_push.basic."
        }
      },
      "result_push.basic": {
        description: {
          zh: "与最小提交路径兼容的结果返回。",
          en: "Result return compatible with the minimum submit path."
        },
        combination: {
          zh: "需同时声明 frame_submit.tensor.inline。",
          en: "Must also claim frame_submit.tensor.inline."
        }
      },
      "transport.quic": {
        description: {
          zh: "Preview3 QUIC 最小互通传输。",
          en: "Preview3 minimum QUIC interoperability transport."
        }
      },
      "transport.tcp": {
        description: {
          zh: "Preview3 TCP 最小互通传输。",
          en: "Preview3 minimum TCP interoperability transport."
        }
      },
      "flow_update": {
        description: {
          zh: "尚未冻结进 mandatory core 的 flow-control 语义。",
          en: "Flow-control semantics not yet frozen into the mandatory core."
        }
      },
      "session.resume": {
        description: {
          zh: "基于 SESSION_OPEN / SESSION_OPEN_ACK 的会话恢复路径，包括 resume_token、resume_from_operation_id 与 resume_rejected 错误语义。",
          en: "Session-resume flow based on SESSION_OPEN / SESSION_OPEN_ACK, including resume_token, resume_from_operation_id, and resume_rejected semantics."
        },
        combination: {
          zh: "需同时声明 session.open_close。",
          en: "Must also claim session.open_close."
        }
      },
      "schema.registry": {
        description: {
          zh: "Schema descriptor、schema_error_code 以及 schema 安装、更新、失效与绑定层错误映射的一致性。",
          en: "Consistency of schema descriptors, schema_error_code values, and schema install/update/invalidate flows including binding-layer error mapping."
        }
      },
      "cache.lifecycle": {
        description: {
          zh: "缓存 lease、object_version、dependency_invalid 与 schema_mismatch 等公共缓存生命周期语义。",
          en: "Public cache-lifecycle semantics including lease ownership, object_version, dependency_invalid, and schema_mismatch behavior."
        }
      },
      "payload.typed": {
        description: {
          zh: "Typed payload descriptor、offset/length 解释、partial 语义以及 SDK / FFI 边界上的 buffer ownership 约束。",
          en: "Typed-payload descriptors, offset/length interpretation, partial semantics, and buffer-ownership rules across SDK / FFI boundaries."
        },
        combination: {
          zh: "常与 profile.token 组合。",
          en: "Often combined with profile.token."
        }
      },
      "session.multi_session": {
        description: {
          zh: "单连接多 session 容器语义，包括 sibling session 隔离与 connection-level CLOSE 的关停行为。",
          en: "Multi-session container semantics on one connection, including sibling-session isolation and connection-level CLOSE shutdown behavior."
        },
        combination: {
          zh: "需同时声明 session.open_close。",
          en: "Must also claim session.open_close."
        }
      },
      "operation.lifecycle": {
        description: {
          zh: "accepted、running、partial、waiting_tool、cancelled、failed、superseded 与 completed 等公共 operation 生命周期语义。",
          en: "Public operation lifecycle semantics including accepted, running, partial, waiting_tool, cancelled, failed, superseded, and completed states."
        }
      },
      "operation.cancel_scope": {
        description: {
          zh: "single-operation、subtree、operation_group 与 whole-session 四类 cancel_scope 边界语义。",
          en: "cancel_scope boundaries across single-operation, subtree, operation_group, and whole-session cancellation."
        }
      },
      "profile.token": {
        description: {
          zh: "Token profile 的 partial chunk、stop-reason 与 callback / polling 驱动模式下的一致性语义。",
          en: "Token-profile semantics for partial chunks, stop reasons, and consistent behavior across callback and polling drive modes."
        },
        combination: {
          zh: "常与 payload.typed 组合。",
          en: "Often combined with payload.typed."
        }
      }
    }
  },
  "nnrp-1-preview4": {
    title: {
      zh: "NNRP/1 Preview4",
      en: "NNRP/1 Preview4"
    },
    note: {
      zh: "覆盖 Preview4 运行时控制帧、运行时对象、缓存引用、IPC/WebSocket 传输与线路级测试能力。",
      en: "Covers Preview4 runtime control frames, runtime objects, cache references, IPC/WebSocket transports, and wire-level test capabilities."
    },
    capabilityOverrides: {
      "control.cancel_abort": {
        description: {
          zh: "按操作标识取消或中止任务，并输出带 trace context 的类型化终态。",
          en: "Cancel or abort an operation by id and emit a typed terminal state with trace context."
        },
        combination: {
          zh: "通常与 control.result_drop_reason、control.trace_context 同时声明。",
          en: "Usually claimed with control.result_drop_reason and control.trace_context."
        }
      },
      "control.result_drop_reason": {
        description: {
          zh: "标记结果被丢弃的原因，覆盖取消、中止、过期、被替换等终态。",
          en: "Marks why a result was dropped, including cancelled, aborted, expired, and superseded terminal states."
        },
        combination: {
          zh: "会与取消、中止、优先级/截止时间、supersede 等控制帧组合出现。",
          en: "Appears with cancel/abort, priority/deadline, and supersede control frames."
        }
      },
      "control.trace_context": {
        description: {
          zh: "在线路级保留端到端 trace context，用于分段计时和问题定位。",
          en: "Preserves end-to-end trace context for segmented timing and diagnosis."
        },
        combination: {
          zh: "通常与 control.cancel_abort、control.result_drop_reason 同时声明。",
          en: "Usually claimed with control.cancel_abort and control.result_drop_reason."
        }
      },
      "control.priority_update": {
        description: {
          zh: "在操作生命周期中动态调整优先级，允许调度器重新排序未完成工作。",
          en: "Dynamically updates operation priority so schedulers can reorder unfinished work."
        },
        combination: {
          zh: "通常与 control.deadline_expire、control.result_drop_reason 同时声明。",
          en: "Usually claimed with control.deadline_expire and control.result_drop_reason."
        }
      },
      "control.deadline_expire": {
        description: {
          zh: "声明任务截止时间或过期时间，避免服务端继续完成已经无意义的工作。",
          en: "Declares task deadlines or expiry times so servers can stop stale work."
        },
        combination: {
          zh: "通常与 control.priority_update、control.result_drop_reason 同时声明。",
          en: "Usually claimed with control.priority_update and control.result_drop_reason."
        }
      },
      "control.progress_partial": {
        description: {
          zh: "以更细粒度返回进度和部分结果，避免所有数据只能在终态一次性交付。",
          en: "Returns progress and partial results at finer granularity instead of only at terminal completion."
        },
        combination: {
          zh: "通常与 control.credit_backpressure 同时声明。",
          en: "Usually claimed with control.credit_backpressure."
        }
      },
      "control.credit_backpressure": {
        description: {
          zh: "通过 credit update 与 backpressure 告知对端当前可接受的并发和数据量。",
          en: "Uses credit updates and backpressure to signal accepted concurrency and data volume."
        },
        combination: {
          zh: "通常与 control.progress_partial 同时声明。",
          en: "Usually claimed with control.progress_partial."
        }
      },
      "control.capability_costs": {
        description: {
          zh: "在能力协商中声明成本、偏好、限制与降级元数据。",
          en: "Negotiates capability cost, preference, limit, and downgrade metadata."
        }
      },
      "object.lifecycle": {
        description: {
          zh: "声明运行时对象、在操作中引用对象，并显式释放所有权。",
          en: "Declares runtime objects, references them in operations, and releases ownership explicitly."
        },
        combination: {
          zh: "会与 object.cost、object.ownership、object.delta 等对象能力组合出现。",
          en: "Appears with object.cost, object.ownership, and object.delta."
        }
      },
      "object.cost": {
        description: {
          zh: "为运行时对象声明计算、显存、带宽或生命周期成本。",
          en: "Declares compute, memory, bandwidth, or lifetime cost for runtime objects."
        },
        combination: {
          zh: "通常与 object.lifecycle、object.ownership 同时声明。",
          en: "Usually claimed with object.lifecycle and object.ownership."
        }
      },
      "object.ownership": {
        description: {
          zh: "固定运行时对象的所有权转移、释放和失效语义。",
          en: "Fixes ownership transfer, release, and invalidation semantics for runtime objects."
        },
        combination: {
          zh: "通常与 object.lifecycle、object.cost 同时声明。",
          en: "Usually claimed with object.lifecycle and object.cost."
        }
      },
      "object.delta": {
        description: {
          zh: "发送对象补丁或 delta，避免重复传输完整运行时对象。",
          en: "Sends object patches or deltas without resending the full runtime object."
        },
        combination: {
          zh: "通常与 object.lifecycle 同时声明。",
          en: "Usually claimed with object.lifecycle."
        }
      },
      "control.route_execution_hint": {
        description: {
          zh: "携带路由与执行 hint，供 runtime 或 subagent 调度使用，避免退回重 JSON / protobuf 包装。",
          en: "Carries route and execution hints for runtime or subagent scheduling without heavy JSON/protobuf wrappers."
        }
      },
      "cache.reference": {
        description: {
          zh: "正式化 cache reference、cache miss 和 invalidation，仅在身份与失效语义清晰的路径使用。",
          en: "Formalizes cache references, cache misses, and invalidation where identity and invalidation are well-defined."
        }
      },
      "control.degrade_profile": {
        description: {
          zh: "协商更便宜的执行 profile，允许在会话中降级计算或带宽策略。",
          en: "Negotiates a cheaper execution profile during a session."
        },
        combination: {
          zh: "通常与 control.budget_update 同时声明。",
          en: "Usually claimed with control.budget_update."
        }
      },
      "control.budget_update": {
        description: {
          zh: "在会话中更新 compute、token、memory 或 bandwidth budget。",
          en: "Updates compute, token, memory, or bandwidth budgets during a session."
        },
        combination: {
          zh: "通常与 control.degrade_profile 同时声明。",
          en: "Usually claimed with control.degrade_profile."
        }
      },
      "control.supersede": {
        description: {
          zh: "用新操作替换过期操作，并保持 trace 连续性与迟到结果可丢弃语义。",
          en: "Replaces obsolete operations while preserving trace continuity and droppable late-result semantics."
        },
        combination: {
          zh: "通常与 control.result_drop_reason 同时声明。",
          en: "Usually claimed with control.result_drop_reason."
        }
      },
      "control.recoverable_error": {
        description: {
          zh: "区分可恢复错误与终止失败，并在需要时携带 retry-after 时间。",
          en: "Distinguishes recoverable errors from terminal failures and carries retry-after timing when required."
        }
      }
    }
  }
};
