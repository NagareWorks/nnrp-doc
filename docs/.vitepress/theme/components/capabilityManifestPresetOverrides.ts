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
      }
    }
  }
};