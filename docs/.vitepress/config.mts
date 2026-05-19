import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { fileURLToPath } from "node:url";

const dayjsEsmPath = fileURLToPath(
  new URL("../../node_modules/.deno/dayjs@1.11.20/node_modules/dayjs/esm/index.js", import.meta.url)
);
const sanitizeUrlShimPath = fileURLToPath(new URL("./shims/sanitize-url.ts", import.meta.url));

const customStyle = `
:root {
  --nnrp-surface: linear-gradient(135deg, rgba(10, 58, 66, 0.08), rgba(196, 96, 38, 0.12));
  --nnrp-border: rgba(19, 68, 84, 0.18);
  --nnrp-text-soft: #4b5563;
}

.VPLocalNav {
  border-bottom: 1px solid var(--vp-c-divider);
}

.VPNavBarTranslations .items .VPMenuLink:first-of-type,
.VPNavBarExtra .group.translations .VPMenuLink:first-of-type {
  display: none;
}

/* Hide root "Home" locale in mobile nav */
.VPNavScreenTranslations .item:first-of-type {
  display: none;
}

/* Bilingual root homepage */
.bilingual-index {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  max-width: 1152px;
  margin: 0 auto;
  padding: 48px 24px;
  box-sizing: border-box;
}

.bilingual-col {
  padding: 28px 32px;
  border: 1px solid var(--nnrp-border);
  border-radius: 20px;
  background: var(--nnrp-surface);
}

.bilingual-col h2 {
  margin-top: 0;
  margin-bottom: 14px;
  font-size: 20px;
}

.bilingual-col ul {
  margin: 12px 0 20px;
  padding-left: 20px;
}

.bilingual-col li {
  margin: 6px 0;
  color: var(--nnrp-text-soft);
}

@media (max-width: 768px) {
  .bilingual-index {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 32px 16px;
  }
}

.version-switch {
  display: grid;
  gap: 12px;
  margin: 20px 0 28px;
}

.version-switch a {
  display: block;
  padding: 14px 16px;
  border: 1px solid var(--nnrp-border);
  border-radius: 16px;
  background: var(--nnrp-surface);
  text-decoration: none;
  color: inherit;
}

.version-switch strong {
  display: block;
  margin-bottom: 4px;
}

.doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin: 20px 0 28px;
}

.doc-card {
  padding: 16px;
  border: 1px solid var(--nnrp-border);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 14px 28px rgba(15, 118, 110, 0.06);
}

.doc-card h3 {
  margin-top: 0;
  margin-bottom: 8px;
}

.doc-card p {
  margin: 0;
  color: var(--nnrp-text-soft);
}

.protocol-diagram {
  margin: 20px 0;
  display: grid;
  gap: 10px;
}

.protocol-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
}

.protocol-block {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-height: 88px;
  padding: 14px 12px;
  border: 1px solid var(--nnrp-border);
  border-radius: 18px;
  line-height: 1.4;
  cursor: default;
  transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
}

.protocol-block:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.1);
  filter: saturate(1.05);
}

.tone-a { background: #dff4f1; }
.tone-b { background: #f5efe5; }
.tone-c { background: #e7eef9; }
.tone-d { background: #f8e5e1; }
.tone-e { background: #ece8f7; }

.field-offset {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--nnrp-text-soft);
}

.field-name {
  font-size: 15px;
  font-weight: 700;
}

.field-size {
  font-size: 12px;
  color: var(--nnrp-text-soft);
}

.field-tip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  z-index: 2;
  width: min(280px, 72vw);
  padding: 10px 12px;
  border-radius: 12px;
  background: #0f172a;
  color: #f8fafc;
  font-size: 12px;
  line-height: 1.5;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.28);
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 6px);
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.protocol-block:hover .field-tip {
  opacity: 1;
  transform: translate(-50%, 0);
}

.protocol-table {
  width: 100%;
  border-collapse: collapse;
  margin: 18px 0 28px;
}

.protocol-table th,
.protocol-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  text-align: left;
  vertical-align: top;
}

.page-note {
  margin: 14px 0 22px;
  padding: 14px 16px;
  border-left: 4px solid #0f766e;
  border-radius: 0 14px 14px 0;
  background: rgba(15, 118, 110, 0.08);
  color: var(--nnrp-text-soft);
}

.layout-note {
  margin: 12px 0 22px;
  color: var(--nnrp-text-soft);
}

.sdk-link-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin: 20px 0 28px;
}

.sdk-link-card {
  display: block;
  padding: 16px;
  border: 1px solid var(--nnrp-border);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 14px 28px rgba(15, 118, 110, 0.06);
  text-decoration: none;
  color: inherit;
}

.sdk-link-card strong {
  display: block;
  margin-bottom: 8px;
}

.sdk-link-card p {
  margin: 0;
  color: var(--nnrp-text-soft);
}

@media (max-width: 640px) {
  .protocol-row {
    flex-wrap: wrap;
  }

  .protocol-block {
    min-width: calc(50% - 5px);
  }

  .field-tip {
    left: 10px;
    right: 10px;
    width: auto;
    transform: translateY(6px);
  }

  .protocol-block:hover .field-tip {
    transform: translateY(0);
  }
}
`;

const zhSdkOverviewItems = [
  { text: "SDK 总览", link: "/zh/sdk/" }
];

const zhConformanceItems = [
  { text: "Conformance 总览", link: "/zh/conformance/" },
  { text: "快速开始", link: "/zh/conformance/quick-start" },
  { text: "Capability Manifest 生成器", link: "/zh/conformance/capability-manifest-generator" },
  {
    text: "能力列表",
    collapsed: false,
    items: [
      { text: "能力列表总览", link: "/zh/conformance/capabilities/" },
      { text: "nnrp-1-preview2", link: "/zh/conformance/capabilities/nnrp-1-preview2" },
      { text: "nnrp-1-preview3", link: "/zh/conformance/capabilities/nnrp-1-preview3" },
    ]
  },
  {
    text: "参考",
    collapsed: false,
    items: [
      { text: "Manifest 参考（测试套件开发者）", link: "/zh/conformance/manifests" },
      { text: "SDK 集成指南", link: "/zh/conformance/sdk-integration" },
    ]
  },
  { text: "CI 与版本选择", link: "/zh/conformance/ci" }
];

const zhSdkPythonItems = [
  { text: "Python SDK 概览", link: "/zh/sdk/python/" },
  { text: "快速使用", link: "/zh/sdk/python/quick-start" },
  {
    text: "API 参考",
    collapsed: false,
    items: [
      { text: "枚举与常量", link: "/zh/sdk/python/api/enums" },
      { text: "包头与数据包", link: "/zh/sdk/python/api/packet" },
      { text: "消息类型", link: "/zh/sdk/python/api/messages" },
      { text: "客户端", link: "/zh/sdk/python/api/client" },
      { text: "服务端", link: "/zh/sdk/python/api/server" },
      { text: "传输适配器", link: "/zh/sdk/python/api/transport" },
    ]
  }
];

const zhSdkCsharpItems = [
  { text: "C# SDK 概览", link: "/zh/sdk/csharp/" },
  { text: "快速使用", link: "/zh/sdk/csharp/quick-start" },
  {
    text: "API 参考",
    collapsed: false,
    items: [
      { text: "枚举与常量", link: "/zh/sdk/csharp/api/enums" },
      { text: "协议类型", link: "/zh/sdk/csharp/api/protocol" },
      { text: "消息类型", link: "/zh/sdk/csharp/api/messages" },
      { text: "客户端", link: "/zh/sdk/csharp/api/client" },
      { text: "服务端", link: "/zh/sdk/csharp/api/server" },
      { text: "传输层", link: "/zh/sdk/csharp/api/transport" },
    ]
  }
];

const zhSdkRustItems = [
  { text: "Rust SDK 概览", link: "/zh/sdk/rust/" },
  { text: "快速使用", link: "/zh/sdk/rust/quick-start" },
  {
    text: "API 参考",
    collapsed: false,
    items: [
      { text: "核心类型", link: "/zh/sdk/rust/api/core" },
      { text: "FFI / 原生接口", link: "/zh/sdk/rust/api/ffi" },
      { text: "客户端（Preview3）", link: "/zh/sdk/rust/api/client" },
      { text: "服务端（Preview3）", link: "/zh/sdk/rust/api/server" },
      { text: "WASM 导出（Preview3）", link: "/zh/sdk/rust/api/wasm" },
    ]
  }
];

const enSdkOverviewItems = [
  { text: "SDK Overview", link: "/en/sdk/" }
];

const enConformanceItems = [
  { text: "Conformance Overview", link: "/en/conformance/" },
  { text: "Quick Start", link: "/en/conformance/quick-start" },
  { text: "Capability Manifest Generator", link: "/en/conformance/capability-manifest-generator" },
  {
    text: "Capability Catalog",
    collapsed: false,
    items: [
      { text: "Catalog Overview", link: "/en/conformance/capabilities/" },
      { text: "nnrp-1-preview2", link: "/en/conformance/capabilities/nnrp-1-preview2" },
      { text: "nnrp-1-preview3", link: "/en/conformance/capabilities/nnrp-1-preview3" },
    ]
  },
  {
    text: "Reference",
    collapsed: false,
    items: [
      { text: "Manifests Reference (Suite Authors)", link: "/en/conformance/manifests" },
      { text: "SDK Integration Guide", link: "/en/conformance/sdk-integration" },
    ]
  },
  { text: "CI and Version Selection", link: "/en/conformance/ci" }
];

const enSdkPythonItems = [
  { text: "Python SDK Overview", link: "/en/sdk/python/" },
  { text: "Quick Start", link: "/en/sdk/python/quick-start" },
  {
    text: "API Reference",
    collapsed: false,
    items: [
      { text: "Enums & Constants", link: "/en/sdk/python/api/enums" },
      { text: "Header & Packet", link: "/en/sdk/python/api/packet" },
      { text: "Message Types", link: "/en/sdk/python/api/messages" },
      { text: "Client", link: "/en/sdk/python/api/client" },
      { text: "Server", link: "/en/sdk/python/api/server" },
      { text: "Transport Adapters", link: "/en/sdk/python/api/transport" },
    ]
  }
];

const enSdkCsharpItems = [
  { text: "C# SDK Overview", link: "/en/sdk/csharp/" },
  { text: "Quick Start", link: "/en/sdk/csharp/quick-start" },
  {
    text: "API Reference",
    collapsed: false,
    items: [
      { text: "Enums & Constants", link: "/en/sdk/csharp/api/enums" },
      { text: "Protocol Types", link: "/en/sdk/csharp/api/protocol" },
      { text: "Message Types", link: "/en/sdk/csharp/api/messages" },
      { text: "Client", link: "/en/sdk/csharp/api/client" },
      { text: "Server", link: "/en/sdk/csharp/api/server" },
      { text: "Transport", link: "/en/sdk/csharp/api/transport" },
    ]
  }
];

const enSdkRustItems = [
  { text: "Rust SDK Overview", link: "/en/sdk/rust/" },
  { text: "Quick Start", link: "/en/sdk/rust/quick-start" },
  {
    text: "API Reference",
    collapsed: false,
    items: [
      { text: "Core Types", link: "/en/sdk/rust/api/core" },
      { text: "FFI / Native", link: "/en/sdk/rust/api/ffi" },
      { text: "Client (Preview3)", link: "/en/sdk/rust/api/client" },
      { text: "Server (Preview3)", link: "/en/sdk/rust/api/server" },
      { text: "WASM Exports (Preview3)", link: "/en/sdk/rust/api/wasm" },
    ]
  }
];

const zhSidebar = {
  "/zh/conformance/": [
    {
      text: "Conformance",
      items: zhConformanceItems
    }
  ],
  "/zh/sdk/python/": [
    {
      text: "SDK",
      items: zhSdkPythonItems
    }
  ],
  "/zh/sdk/csharp/": [
    {
      text: "SDK",
      items: zhSdkCsharpItems
    }
  ],
  "/zh/sdk/rust/": [
    {
      text: "SDK",
      items: zhSdkRustItems
    }
  ],
  "/zh/sdk/": [
    {
      text: "SDK",
      items: zhSdkOverviewItems
    }
  ],
  "/zh/": [
  {
    text: "文档总览",
    items: [
      { text: "总览", link: "/zh/" },
      { text: "协议背景与介绍", link: "/zh/background" },
      { text: "常见场景与边界", link: "/zh/use-cases" }
    ]
  },
  {
    text: "协议指南",
    collapsed: false,
    items: [
      { text: "快速上手", link: "/zh/protocol/v1/quick-start" },
      { text: "会话与操作模型", link: "/zh/protocol/v1/operation-model" },
      { text: "传输策略与探测", link: "/zh/protocol/v1/transport-strategy" },
      { text: "核心对象与流程", link: "/zh/core-concepts" },
      { text: "缓存能力与租约", link: "/zh/protocol/v1/cache-and-lease" },
      { text: "Schema / Profile Registry", link: "/zh/protocol/v1/schema-registry" },
      { text: "流控与优先级", link: "/zh/protocol/v1/flow-control-and-priority" },
      { text: "公共头", link: "/zh/common-header" },
      {
        text: "类型化载荷描述符",
        link: "/zh/typed-payload-descriptor"
      },
      {
        text: "标准 Profiles",
        collapsed: true,
        items: [
          {
            text: "Tensor Profile",
            collapsed: true,
            items: [
              { text: "概览", link: "/zh/profiles/tensor" },
              { text: "Tensor Descriptor 公共头", link: "/zh/profiles/tensor/descriptor-header" },
              { text: "Tensor Schema 与 Body", link: "/zh/profiles/tensor/schema-body" },
              { text: "Tensor Payload Frame", link: "/zh/profiles/tensor/payload-frame" }
            ]
          },
          {
            text: "Token Profile",
            collapsed: true,
            items: [
              { text: "概览", link: "/zh/profiles/token" },
              { text: "Token Descriptor 公共头", link: "/zh/profiles/token/descriptor-header" },
              { text: "Token Schema 与 Body", link: "/zh/profiles/token/schema-body" },
              { text: "Token Payload Frame", link: "/zh/profiles/token/payload-frame" }
            ]
          }
        ]
      }
    ]
  },
  {
    text: "版本管理",
    collapsed: true,
    items: [
      { text: "版本与兼容", link: "/zh/protocol/" },
      { text: "NNRP/1（预览）", link: "/zh/protocol/v1/" }
    ]
  }
  ,
    {
      text: "协议设计",
      collapsed: true,
      items: [
        { text: "设计索引", link: "/zh/design/" },
        { text: "v1-preview1", link: "/zh/design/v1-preview1" },
        { text: "v1-preview2", link: "/zh/design/v1-preview2" },
        { text: "v1-preview3", link: "/zh/design/v1-preview3" },
        { text: "一致性测试套件设计", link: "/zh/design/conformance-suite" }
      ]
    }
  ]
};

const enSidebar = {
  "/en/conformance/": [
    {
      text: "Conformance",
      items: enConformanceItems
    }
  ],
  "/en/sdk/python/": [
    {
      text: "SDK",
      items: enSdkPythonItems
    }
  ],
  "/en/sdk/csharp/": [
    {
      text: "SDK",
      items: enSdkCsharpItems
    }
  ],
  "/en/sdk/rust/": [
    {
      text: "SDK",
      items: enSdkRustItems
    }
  ],
  "/en/sdk/": [
    {
      text: "SDK",
      items: enSdkOverviewItems
    }
  ],
  "/en/": [
  {
    text: "Documentation",
    items: [
      { text: "Overview", link: "/en/" },
      { text: "Background and Intro", link: "/en/background" },
      { text: "Use Cases and Boundaries", link: "/en/use-cases" }
    ]
  },
  {
    text: "Guides",
    collapsed: false,
    items: [
      { text: "Quick Start", link: "/en/protocol/v1/quick-start" },
      { text: "Session and Operation Model", link: "/en/protocol/v1/operation-model" },
      { text: "Transport Strategy and Probing", link: "/en/protocol/v1/transport-strategy" },
      { text: "Core Objects and Flow", link: "/en/core-concepts" },
      { text: "Cache Capabilities and Leases", link: "/en/protocol/v1/cache-and-lease" },
      { text: "Schema / Profile Registry", link: "/en/protocol/v1/schema-registry" },
      { text: "Flow Control and Priority", link: "/en/protocol/v1/flow-control-and-priority" },
      { text: "Common Header", link: "/en/common-header" },
      {
        text: "Typed Payload Descriptor",
        link: "/en/typed-payload-descriptor"
      },
      {
        text: "Standard Profiles",
        collapsed: true,
        items: [
          {
            text: "Tensor Profile",
            collapsed: true,
            items: [
              { text: "Overview", link: "/en/profiles/tensor" },
              { text: "Tensor Descriptor Common Header", link: "/en/profiles/tensor/descriptor-header" },
              { text: "Tensor Schema and Body", link: "/en/profiles/tensor/schema-body" },
              { text: "Tensor Payload Frame", link: "/en/profiles/tensor/payload-frame" }
            ]
          },
          {
            text: "Token Profile",
            collapsed: true,
            items: [
              { text: "Overview", link: "/en/profiles/token" },
              { text: "Token Descriptor Common Header", link: "/en/profiles/token/descriptor-header" },
              { text: "Token Schema and Body", link: "/en/profiles/token/schema-body" },
              { text: "Token Payload Frame", link: "/en/profiles/token/payload-frame" }
            ]
          }
        ]
      }
    ]
  },
  {
    text: "Version Management",
    collapsed: true,
    items: [
      { text: "Versions and Compatibility", link: "/en/protocol/" },
      { text: "NNRP/1 (Preview)", link: "/en/protocol/v1/" }
    ]
  }
  ,
    {
      text: "Protocol Design",
      collapsed: true,
      items: [
        { text: "Design Index", link: "/en/design/" },
        { text: "v1-preview1", link: "/en/design/v1-preview1" },
        { text: "v1-preview2", link: "/en/design/v1-preview2" },
        { text: "v1-preview3", link: "/en/design/v1-preview3" },
        { text: "Conformance Suite Design", link: "/en/design/conformance-suite" }
      ]
    }
  ]
};

export default withMermaid(defineConfig({
  title: "NNRP",
  description: "Neural Network Runtime Protocol documentation",
  lang: "en-US",
  base: "/nnrp-doc/",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/nnrp-doc/logo.svg" }],
    ["style", {}, customStyle]
  ],
  cleanUrls: true,
  lastUpdated: true,
  locales: {
    root: {
      label: "Home",
      lang: "en-US",
      themeConfig: {
        sidebar: {},
        socialLinks: [
          { icon: "github", link: "https://github.com/NagareWorks" }
        ]
      }
    },
    zh: {
      label: "简体中文",
      lang: "zh-CN",
      link: "/zh/",
      themeConfig: {
        nav: [
          { text: "协议", link: "/zh/" },
          { text: "Conformance", link: "/zh/conformance/" },
          { text: "SDK", link: "/zh/sdk/" }
        ],
        sidebar: zhSidebar,
        socialLinks: [
          { icon: "github", link: "https://github.com/NagareWorks" }
        ]
      }
    },
    en: {
      label: "English",
      lang: "en-US",
      link: "/en/",
      themeConfig: {
        nav: [
          { text: "Protocol", link: "/en/" },
          { text: "Conformance", link: "/en/conformance/" },
          { text: "SDK", link: "/en/sdk/" }
        ],
        sidebar: enSidebar,
        socialLinks: [
          { icon: "github", link: "https://github.com/NagareWorks" }
        ]
      }
    }
  },
  themeConfig: {
    search: {
      provider: "local",
      options: {
        detailedView: true,
        miniSearch: {
          searchOptions: {
            fuzzy: 0.2,
            prefix: true
          }
        }
      }
    },
    logo: "/logo.svg",
    footer: {
      message: "NNRP Documentation",
      copyright: "Copyright © NagareWorks · NNRP"
    }
  },
  vite: {
    resolve: {
      alias: [
        {
          find: /^dayjs$/,
          replacement: dayjsEsmPath
        },
        {
          find: /^@braintree\/sanitize-url$/,
          replacement: sanitizeUrlShimPath
        }
      ]
    }
  },
  mermaid: {}
}));
