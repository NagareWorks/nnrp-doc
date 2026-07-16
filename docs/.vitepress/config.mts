import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { fileURLToPath } from "node:url";

const dayjsEsmPath = fileURLToPath(
  new URL(
    "../../node_modules/.deno/dayjs@1.11.20/node_modules/dayjs/esm/index.js",
    import.meta.url,
  ),
);
const sanitizeUrlShimPath = fileURLToPath(new URL("./shims/sanitize-url.ts", import.meta.url));

const customStyle = `
:root {
  --nnrp-surface: linear-gradient(135deg, rgba(10, 58, 66, 0.08), rgba(196, 96, 38, 0.12));
  --nnrp-border: rgba(19, 68, 84, 0.18);
  --nnrp-border-strong: rgba(15, 118, 110, 0.28);
  --nnrp-text-soft: var(--vp-c-text-2);
  --nnrp-text-strong: var(--vp-c-text-1);
  --nnrp-card-bg: rgba(255, 255, 255, 0.88);
  --nnrp-card-bg-hover: rgba(255, 255, 255, 0.96);
  --nnrp-elevated-bg: rgba(255, 255, 255, 0.96);
  --nnrp-soft-bg: rgba(15, 118, 110, 0.08);
  --nnrp-chip-bg: rgba(255, 255, 255, 0.92);
  --nnrp-accent: #0f766e;
  --nnrp-accent-hover: #115e59;
  --nnrp-accent-text: #0f766e;
  --nnrp-accent-inverse: #f8fafc;
  --nnrp-warm-accent: #b45309;
  --nnrp-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
  --nnrp-shadow-strong: 0 24px 70px rgba(15, 23, 42, 0.16);
  --nnrp-hero-bg:
    radial-gradient(circle at 20% 20%, rgba(15, 118, 110, 0.16), transparent 34%),
    linear-gradient(135deg, #ffffff, #f5efe5 58%, #e7eef9);
  --nnrp-panel-sheen:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.74), transparent 18%),
    linear-gradient(115deg, transparent 36%, rgba(15, 118, 110, 0.14) 48%, rgba(196, 96, 38, 0.16) 56%, transparent 68%);
  --nnrp-tone-a: #dff4f1;
  --nnrp-tone-b: #f5efe5;
  --nnrp-tone-c: #e7eef9;
  --nnrp-tone-d: #f8e5e1;
  --nnrp-tone-e: #ece8f7;
  --nnrp-tooltip-bg: #0f172a;
  --nnrp-tooltip-text: #f8fafc;
}

.dark {
  --nnrp-surface: linear-gradient(135deg, rgba(20, 184, 166, 0.13), rgba(251, 146, 60, 0.1));
  --nnrp-border: rgba(148, 163, 184, 0.22);
  --nnrp-border-strong: rgba(45, 212, 191, 0.34);
  --nnrp-card-bg: rgba(32, 33, 39, 0.82);
  --nnrp-card-bg-hover: rgba(39, 41, 49, 0.96);
  --nnrp-elevated-bg: rgba(32, 33, 39, 0.98);
  --nnrp-soft-bg: rgba(45, 212, 191, 0.1);
  --nnrp-chip-bg: rgba(32, 33, 39, 0.92);
  --nnrp-accent: #2dd4bf;
  --nnrp-accent-hover: #5eead4;
  --nnrp-accent-text: #5eead4;
  --nnrp-accent-inverse: #0f172a;
  --nnrp-warm-accent: #fdba74;
  --nnrp-shadow: 0 18px 40px rgba(0, 0, 0, 0.3);
  --nnrp-shadow-strong: 0 24px 70px rgba(0, 0, 0, 0.38);
  --nnrp-hero-bg:
    radial-gradient(circle at 20% 20%, rgba(45, 212, 191, 0.16), transparent 34%),
    linear-gradient(135deg, rgba(32, 33, 39, 0.98), rgba(42, 36, 31, 0.96) 58%, rgba(25, 33, 48, 0.96));
  --nnrp-panel-sheen:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.08), transparent 18%),
    linear-gradient(115deg, transparent 36%, rgba(45, 212, 191, 0.13) 48%, rgba(251, 146, 60, 0.12) 56%, transparent 68%);
  --nnrp-tone-a: rgba(20, 184, 166, 0.16);
  --nnrp-tone-b: rgba(251, 146, 60, 0.13);
  --nnrp-tone-c: rgba(96, 165, 250, 0.14);
  --nnrp-tone-d: rgba(248, 113, 113, 0.13);
  --nnrp-tone-e: rgba(167, 139, 250, 0.15);
  --nnrp-tooltip-bg: #f8fafc;
  --nnrp-tooltip-text: #0f172a;
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

/* Language homepages */
.landing-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;
  max-width: 1160px;
  margin: 20px auto 0;
  padding: 0 24px;
  box-sizing: border-box;
}

.landing-hero__banner {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--nnrp-border);
  border-radius: 24px;
  background: #0f172a;
  box-shadow: var(--nnrp-shadow-strong);
}

.landing-hero__intro {
  border: 1px solid var(--nnrp-border);
  border-radius: 24px;
  box-shadow: var(--nnrp-shadow-strong);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 28px 34px;
  background: var(--nnrp-hero-bg);
}

.landing-hero__eyebrow {
  margin: 0 0 10px;
  color: var(--nnrp-accent-text);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.landing-hero__intro h1 {
  margin: 0;
  font-size: 36px;
  line-height: 1.12;
}

.landing-hero__intro p:not(.landing-hero__eyebrow) {
  margin: 16px 0 0;
  color: var(--nnrp-text-soft);
  line-height: 1.7;
}

.landing-actions,
.language-fallback {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.language-fallback {
  justify-content: center;
  padding: 80px 24px;
}

.landing-action {
  display: inline-flex;
  align-items: center;
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid var(--nnrp-border);
  border-radius: 21px;
  background: var(--nnrp-chip-bg);
  color: var(--nnrp-text-strong);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: var(--nnrp-shadow);
  transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.landing-action.primary {
  border-color: transparent;
  background: var(--nnrp-accent);
  color: var(--nnrp-accent-inverse);
}

.vp-doc a.landing-action,
.vp-doc a.landing-action:hover,
.vp-doc a.landing-action:focus-visible {
  text-decoration: none;
}

.vp-doc a.landing-action:hover {
  transform: translateY(-1px);
  border-color: rgba(15, 118, 110, 0.28);
  color: var(--nnrp-text-strong);
  box-shadow: var(--nnrp-shadow);
}

.vp-doc a.landing-action.primary:hover {
  border-color: transparent;
  background: var(--nnrp-accent-hover);
  color: var(--nnrp-accent-inverse);
  box-shadow: var(--nnrp-shadow);
}

.landing-panels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  max-width: 1160px;
  margin: 18px auto 0;
  padding: 0 24px 48px;
  box-sizing: border-box;
}

.landing-panel {
  position: relative;
  display: block;
  min-height: 142px;
  padding: 22px;
  border: 1px solid var(--nnrp-border);
  border-radius: 20px;
  overflow: hidden;
  background: var(--nnrp-card-bg);
  backdrop-filter: blur(14px);
  color: inherit;
  text-decoration: none;
  box-shadow: var(--nnrp-shadow);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.landing-panel::before {
  position: absolute;
  inset: -42%;
  z-index: 0;
  content: "";
  background:
    var(--nnrp-panel-sheen);
  opacity: 0;
  transform: translate3d(-18%, -10%, 0) rotate(8deg);
  transition: opacity 0.22s ease, transform 0.32s ease;
}

.vp-doc a.landing-panel,
.vp-doc a.landing-panel:hover,
.vp-doc a.landing-panel:focus-visible {
  color: inherit;
  text-decoration: none;
}

.vp-doc a.landing-panel:hover {
  transform: translateY(-3px);
  border-color: rgba(15, 118, 110, 0.28);
  background: var(--nnrp-card-bg-hover);
  box-shadow: var(--nnrp-shadow-strong);
}

.vp-doc a.landing-panel:hover::before {
  opacity: 1;
  transform: translate3d(12%, 8%, 0) rotate(8deg);
}

.landing-panel span {
  position: relative;
  z-index: 1;
  display: block;
  margin-bottom: 10px;
  color: var(--nnrp-warm-accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.landing-panel strong {
  position: relative;
  z-index: 1;
  display: block;
  font-size: 18px;
}

.landing-panel p {
  position: relative;
  z-index: 1;
  margin: 10px 0 0;
  color: var(--nnrp-text-soft);
  line-height: 1.6;
}

@media (max-width: 860px) {
  .landing-hero,
  .landing-panels {
    grid-template-columns: 1fr;
    padding-left: 16px;
    padding-right: 16px;
  }

  .landing-hero {
    gap: 16px;
    margin-top: 10px;
  }

  .landing-hero__banner,
  .landing-hero__intro,
  .landing-panel {
    border-radius: 18px;
  }

  .landing-hero__intro {
    padding: 24px;
  }

  .landing-hero__intro h1 {
    font-size: 28px;
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
  background: var(--nnrp-card-bg);
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
  background: var(--nnrp-card-bg);
  box-shadow: var(--nnrp-shadow);
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

.tone-a { background: var(--nnrp-tone-a); }
.tone-b { background: var(--nnrp-tone-b); }
.tone-c { background: var(--nnrp-tone-c); }
.tone-d { background: var(--nnrp-tone-d); }
.tone-e { background: var(--nnrp-tone-e); }

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
  background: var(--nnrp-tooltip-bg);
  color: var(--nnrp-tooltip-text);
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
  border-left: 4px solid var(--nnrp-accent);
  border-radius: 0 14px 14px 0;
  background: var(--nnrp-soft-bg);
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
  background: var(--nnrp-card-bg);
  box-shadow: var(--nnrp-shadow);
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
  { text: "SDK 总览", link: "/zh/sdk/" },
];

const zhConformanceItems = [
  { text: "一致性测试总览", link: "/zh/conformance/" },
  { text: "快速开始", link: "/zh/conformance/quick-start" },
  { text: "能力声明生成器", link: "/zh/conformance/capability-manifest-generator" },
  {
    text: "能力列表",
    collapsed: false,
    items: [
      { text: "能力列表总览", link: "/zh/conformance/capabilities/" },
      { text: "nnrp-1-preview2", link: "/zh/conformance/capabilities/nnrp-1-preview2" },
      { text: "nnrp-1-preview3", link: "/zh/conformance/capabilities/nnrp-1-preview3" },
      { text: "nnrp-1-preview4", link: "/zh/conformance/capabilities/nnrp-1-preview4" },
    ],
  },
  {
    text: "参考",
    collapsed: false,
    items: [
      { text: "清单参考（测试套件开发者）", link: "/zh/conformance/manifests" },
      { text: "SDK 集成指南", link: "/zh/conformance/sdk-integration" },
    ],
  },
  { text: "CI 与版本选择", link: "/zh/conformance/ci" },
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
      { text: "运行时控制与对象", link: "/zh/sdk/python/api/runtime" },
      { text: "客户端", link: "/zh/sdk/python/api/client" },
      { text: "服务端", link: "/zh/sdk/python/api/server" },
      { text: "传输适配器", link: "/zh/sdk/python/api/transport" },
    ],
  },
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
      { text: "运行时控制与对象", link: "/zh/sdk/csharp/api/runtime" },
      { text: "客户端", link: "/zh/sdk/csharp/api/client" },
      { text: "服务端", link: "/zh/sdk/csharp/api/server" },
      { text: "传输层", link: "/zh/sdk/csharp/api/transport" },
    ],
  },
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
      { text: "客户端", link: "/zh/sdk/rust/api/client" },
      { text: "服务端", link: "/zh/sdk/rust/api/server" },
      { text: "WASM 浏览器 Primitives", link: "/zh/sdk/rust/api/wasm" },
    ],
  },
];

const zhSdkJavascriptItems = [
  { text: "JS/TS SDK 概览", link: "/zh/sdk/javascript/" },
  { text: "快速使用", link: "/zh/sdk/javascript/quick-start" },
  {
    text: "API 参考",
    collapsed: false,
    items: [
      { text: "核心类型", link: "/zh/sdk/javascript/api/core" },
      { text: "运行时控制与对象", link: "/zh/sdk/javascript/api/runtime" },
      { text: "客户端", link: "/zh/sdk/javascript/api/client" },
      { text: "服务端", link: "/zh/sdk/javascript/api/server" },
      { text: "传输提供器", link: "/zh/sdk/javascript/api/transport" },
      { text: "原生运行时说明", link: "/zh/sdk/javascript/api/native" },
      { text: "浏览器运行时说明", link: "/zh/sdk/javascript/api/wasm" },
    ],
  },
];

const enSdkOverviewItems = [
  { text: "SDK Overview", link: "/en/sdk/" },
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
      { text: "nnrp-1-preview4", link: "/en/conformance/capabilities/nnrp-1-preview4" },
    ],
  },
  {
    text: "Reference",
    collapsed: false,
    items: [
      { text: "Manifests Reference (Suite Authors)", link: "/en/conformance/manifests" },
      { text: "SDK Integration Guide", link: "/en/conformance/sdk-integration" },
    ],
  },
  { text: "CI and Version Selection", link: "/en/conformance/ci" },
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
      { text: "Runtime Control & Objects", link: "/en/sdk/python/api/runtime" },
      { text: "Client", link: "/en/sdk/python/api/client" },
      { text: "Server", link: "/en/sdk/python/api/server" },
      { text: "Transport Adapters", link: "/en/sdk/python/api/transport" },
    ],
  },
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
      { text: "Runtime Control & Objects", link: "/en/sdk/csharp/api/runtime" },
      { text: "Client", link: "/en/sdk/csharp/api/client" },
      { text: "Server", link: "/en/sdk/csharp/api/server" },
      { text: "Transport", link: "/en/sdk/csharp/api/transport" },
    ],
  },
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
      { text: "Client", link: "/en/sdk/rust/api/client" },
      { text: "Server", link: "/en/sdk/rust/api/server" },
      { text: "WASM Browser Primitives", link: "/en/sdk/rust/api/wasm" },
    ],
  },
];

const enSdkJavascriptItems = [
  { text: "JS/TS SDK Overview", link: "/en/sdk/javascript/" },
  { text: "Quick Start", link: "/en/sdk/javascript/quick-start" },
  {
    text: "API Reference",
    collapsed: false,
    items: [
      { text: "Core Types", link: "/en/sdk/javascript/api/core" },
      { text: "Runtime Control & Objects", link: "/en/sdk/javascript/api/runtime" },
      { text: "Client", link: "/en/sdk/javascript/api/client" },
      { text: "Server", link: "/en/sdk/javascript/api/server" },
      { text: "Transport Providers", link: "/en/sdk/javascript/api/transport" },
      { text: "Native Runtime Notes", link: "/en/sdk/javascript/api/native" },
      { text: "Browser Runtime Notes", link: "/en/sdk/javascript/api/wasm" },
    ],
  },
];

const zhSidebar = {
  "/zh/conformance/": [
    {
      text: "一致性测试",
      items: zhConformanceItems,
    },
  ],
  "/zh/sdk/python/": [
    {
      text: "SDK",
      items: zhSdkPythonItems,
    },
  ],
  "/zh/sdk/csharp/": [
    {
      text: "SDK",
      items: zhSdkCsharpItems,
    },
  ],
  "/zh/sdk/rust/": [
    {
      text: "SDK",
      items: zhSdkRustItems,
    },
  ],
  "/zh/sdk/javascript/": [
    {
      text: "SDK",
      items: zhSdkJavascriptItems,
    },
  ],
  "/zh/sdk/": [
    {
      text: "SDK",
      items: zhSdkOverviewItems,
    },
  ],
  "/zh/": [
    {
      text: "文档总览",
      items: [
        { text: "总览", link: "/zh/overview" },
        { text: "协议背景与介绍", link: "/zh/background" },
        { text: "常见场景与边界", link: "/zh/use-cases" },
      ],
    },
    {
      text: "协议指南",
      collapsed: false,
      items: [
        { text: "快速上手", link: "/zh/protocol/v1/quick-start" },
        { text: "会话与操作模型", link: "/zh/protocol/v1/operation-model" },
        { text: "数据面与 Operation 标识", link: "/zh/protocol/v1/data-plane" },
        { text: "传输策略与探测", link: "/zh/protocol/v1/transport-strategy" },
        { text: "核心对象与流程", link: "/zh/core-concepts" },
        { text: "缓存能力与租约", link: "/zh/protocol/v1/cache-and-lease" },
        { text: "Schema / Profile Registry", link: "/zh/protocol/v1/schema-registry" },
        { text: "流控与优先级", link: "/zh/protocol/v1/flow-control-and-priority" },
        { text: "公共头", link: "/zh/common-header" },
        {
          text: "类型化载荷描述符",
          link: "/zh/typed-payload-descriptor",
        },
        {
          text: "标准 Profiles",
          collapsed: true,
          items: [
            {
              text: "运行时控制 Profiles",
              collapsed: true,
              items: [
                { text: "概览", link: "/zh/profiles/runtime-control" },
                { text: "取值注册表", link: "/zh/profiles/runtime-control/value-registries" },
                { text: "控制帧 Metadata", link: "/zh/profiles/runtime-control/control-frames" },
                {
                  text: "对象与缓存 Metadata",
                  link: "/zh/profiles/runtime-control/object-cache-frames",
                },
              ],
            },
            {
              text: "Tensor Profile",
              collapsed: true,
              items: [
                { text: "概览", link: "/zh/profiles/tensor" },
                { text: "Tensor Descriptor 公共头", link: "/zh/profiles/tensor/descriptor-header" },
                { text: "Tensor Schema 与 Body", link: "/zh/profiles/tensor/schema-body" },
                { text: "Tensor Payload Frame", link: "/zh/profiles/tensor/payload-frame" },
              ],
            },
            {
              text: "Token Profile",
              collapsed: true,
              items: [
                { text: "概览", link: "/zh/profiles/token" },
                { text: "Token Descriptor 公共头", link: "/zh/profiles/token/descriptor-header" },
                { text: "Token Schema 与 Body", link: "/zh/profiles/token/schema-body" },
                { text: "Token Payload Frame", link: "/zh/profiles/token/payload-frame" },
              ],
            },
          ],
        },
      ],
    },
    {
      text: "版本管理",
      collapsed: true,
      items: [
        { text: "版本与兼容", link: "/zh/protocol/" },
        { text: "NNRP/1（预览）", link: "/zh/protocol/v1/" },
      ],
    },
    {
      text: "协议设计",
      collapsed: true,
      items: [
        { text: "设计索引", link: "/zh/design/" },
        { text: "v1-preview1", link: "/zh/design/v1-preview1" },
        { text: "v1-preview2", link: "/zh/design/v1-preview2" },
        { text: "v1-preview3", link: "/zh/design/v1-preview3" },
        { text: "v1-preview4", link: "/zh/design/v1-preview4" },
        { text: "一致性测试套件设计", link: "/zh/design/conformance-suite" },
        { text: "OpenAI 兼容 API Profile", link: "/zh/design/openai-compatible-profile" },
        { text: "vLLM NNRP Adapter 设计", link: "/zh/design/vllm-nnrp-adapter" },
      ],
    },
  ],
};

const enSidebar = {
  "/en/conformance/": [
    {
      text: "Conformance",
      items: enConformanceItems,
    },
  ],
  "/en/sdk/python/": [
    {
      text: "SDK",
      items: enSdkPythonItems,
    },
  ],
  "/en/sdk/csharp/": [
    {
      text: "SDK",
      items: enSdkCsharpItems,
    },
  ],
  "/en/sdk/rust/": [
    {
      text: "SDK",
      items: enSdkRustItems,
    },
  ],
  "/en/sdk/javascript/": [
    {
      text: "SDK",
      items: enSdkJavascriptItems,
    },
  ],
  "/en/sdk/": [
    {
      text: "SDK",
      items: enSdkOverviewItems,
    },
  ],
  "/en/": [
    {
      text: "Documentation",
      items: [
        { text: "Overview", link: "/en/overview" },
        { text: "Background and Intro", link: "/en/background" },
        { text: "Use Cases and Boundaries", link: "/en/use-cases" },
      ],
    },
    {
      text: "Guides",
      collapsed: false,
      items: [
        { text: "Quick Start", link: "/en/protocol/v1/quick-start" },
        { text: "Session and Operation Model", link: "/en/protocol/v1/operation-model" },
        { text: "Data Plane and Operation Identity", link: "/en/protocol/v1/data-plane" },
        { text: "Transport Strategy and Probing", link: "/en/protocol/v1/transport-strategy" },
        { text: "Core Objects and Flow", link: "/en/core-concepts" },
        { text: "Cache Capabilities and Leases", link: "/en/protocol/v1/cache-and-lease" },
        { text: "Schema / Profile Registry", link: "/en/protocol/v1/schema-registry" },
        { text: "Flow Control and Priority", link: "/en/protocol/v1/flow-control-and-priority" },
        { text: "Common Header", link: "/en/common-header" },
        {
          text: "Typed Payload Descriptor",
          link: "/en/typed-payload-descriptor",
        },
        {
          text: "Standard Profiles",
          collapsed: true,
          items: [
            {
              text: "Runtime Control Profiles",
              collapsed: true,
              items: [
                { text: "Overview", link: "/en/profiles/runtime-control" },
                { text: "Value Registries", link: "/en/profiles/runtime-control/value-registries" },
                {
                  text: "Control Frame Metadata",
                  link: "/en/profiles/runtime-control/control-frames",
                },
                {
                  text: "Object and Cache Metadata",
                  link: "/en/profiles/runtime-control/object-cache-frames",
                },
              ],
            },
            {
              text: "Tensor Profile",
              collapsed: true,
              items: [
                { text: "Overview", link: "/en/profiles/tensor" },
                {
                  text: "Tensor Descriptor Common Header",
                  link: "/en/profiles/tensor/descriptor-header",
                },
                { text: "Tensor Schema and Body", link: "/en/profiles/tensor/schema-body" },
                { text: "Tensor Payload Frame", link: "/en/profiles/tensor/payload-frame" },
              ],
            },
            {
              text: "Token Profile",
              collapsed: true,
              items: [
                { text: "Overview", link: "/en/profiles/token" },
                {
                  text: "Token Descriptor Common Header",
                  link: "/en/profiles/token/descriptor-header",
                },
                { text: "Token Schema and Body", link: "/en/profiles/token/schema-body" },
                { text: "Token Payload Frame", link: "/en/profiles/token/payload-frame" },
              ],
            },
          ],
        },
      ],
    },
    {
      text: "Version Management",
      collapsed: true,
      items: [
        { text: "Versions and Compatibility", link: "/en/protocol/" },
        { text: "NNRP/1 (Preview)", link: "/en/protocol/v1/" },
      ],
    },
    {
      text: "Protocol Design",
      collapsed: true,
      items: [
        { text: "Design Index", link: "/en/design/" },
        { text: "v1-preview1", link: "/en/design/v1-preview1" },
        { text: "v1-preview2", link: "/en/design/v1-preview2" },
        { text: "v1-preview3", link: "/en/design/v1-preview3" },
        { text: "v1-preview4", link: "/en/design/v1-preview4" },
        { text: "Conformance Suite Design", link: "/en/design/conformance-suite" },
        { text: "OpenAI-Compatible API Profile", link: "/en/design/openai-compatible-profile" },
        { text: "vLLM NNRP Adapter Design", link: "/en/design/vllm-nnrp-adapter" },
      ],
    },
  ],
};

export default withMermaid(defineConfig({
  title: "NNRP",
  description: "Neural Network Runtime Protocol documentation",
  lang: "en-US",
  base: "/nnrp-doc/",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/nnrp-doc/logo.svg" }],
    ["style", {}, customStyle],
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
          { icon: "github", link: "https://github.com/NagareWorks" },
        ],
      },
    },
    zh: {
      label: "简体中文",
      lang: "zh-CN",
      link: "/zh/",
      themeConfig: {
        nav: [
          { text: "协议", link: "/zh/overview" },
          { text: "一致性测试", link: "/zh/conformance/" },
          { text: "SDK", link: "/zh/sdk/" },
        ],
        sidebar: zhSidebar,
        socialLinks: [
          { icon: "github", link: "https://github.com/NagareWorks" },
        ],
      },
    },
    en: {
      label: "English",
      lang: "en-US",
      link: "/en/",
      themeConfig: {
        nav: [
          { text: "Protocol", link: "/en/overview" },
          { text: "Conformance", link: "/en/conformance/" },
          { text: "SDK", link: "/en/sdk/" },
        ],
        sidebar: enSidebar,
        socialLinks: [
          { icon: "github", link: "https://github.com/NagareWorks" },
        ],
      },
    },
  },
  themeConfig: {
    search: {
      provider: "local",
      options: {
        detailedView: true,
        miniSearch: {
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
          },
        },
      },
    },
    logo: "/logo.svg",
    footer: {
      message: "NNRP Documentation",
      copyright: "Copyright © NagareWorks · NNRP",
    },
  },
  vite: {
    resolve: {
      alias: [
        {
          find: /^dayjs$/,
          replacement: dayjsEsmPath,
        },
        {
          find: /^@braintree\/sanitize-url$/,
          replacement: sanitizeUrlShimPath,
        },
      ],
    },
  },
  mermaid: {},
}));
