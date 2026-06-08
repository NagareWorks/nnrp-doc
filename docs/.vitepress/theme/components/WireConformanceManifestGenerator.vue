<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useData } from "vitepress";
import {
  type SupportedLocale,
  type WireConformancePreset,
  type WireConformanceTransport,
  wireConformanceTargetSchemaPath
} from "./capabilityManifestShared";

type PresetDocument = {
  wire_conformance?: WireConformancePreset[];
};

type Messages = {
  title: string;
  subtitle: string;
  targetLabel: string;
  targetPlaceholder: string;
  protocolLabel: string;
  recommendedPath: string;
  schemaToggle: string;
  schemaLabel: string;
  modesHeading: string;
  transportsHeading: string;
  endpointPlaceholder: string;
  scenariosHeading: string;
  limitsHeading: string;
  maxFrameBytes: string;
  maxInFlight: string;
  previewHeading: string;
  copy: string;
  copied: string;
  copyFailed: string;
  download: string;
  loadingCatalog: string;
  loadFailed: string;
  noPresets: string;
};

const localeMessages: Record<SupportedLocale, Messages> = {
  zh: {
    title: "线路级测试目标声明生成器",
    subtitle: "生成测试套件直接扮演客户端、服务端或代理时使用的目标声明，适用于协议帧级 E2E 测试。",
    targetLabel: "target_name",
    targetPlaceholder: "例如 nnrp-rs-preview4 或 acme-sdk-wire-target",
    protocolLabel: "协议基线",
    recommendedPath: "推荐文件路径",
    schemaToggle: "包含可选 $schema 字段",
    schemaLabel: "$schema 路径",
    modesHeading: "测试套件模式",
    transportsHeading: "传输端点",
    endpointPlaceholder: "例如 127.0.0.1:19091 或 unix:///tmp/nnrp.sock",
    scenariosHeading: "线路级场景能力",
    limitsHeading: "执行限制",
    maxFrameBytes: "max_frame_bytes",
    maxInFlight: "max_in_flight",
    previewHeading: "生成结果",
    copy: "复制 JSON",
    copied: "已复制",
    copyFailed: "复制失败，请手动复制",
    download: "下载文件",
    loadingCatalog: "正在读取线路级测试基线...",
    loadFailed: "读取线路级测试基线失败。请刷新页面或检查构建产物。",
    noPresets: "当前构建没有导出线路级测试基线。"
  },
  en: {
    title: "Wire-level Conformance Target Generator",
    subtitle: "Generate the target declaration used when the runner directly acts as client, server, or proxy for frame-level E2E tests.",
    targetLabel: "target_name",
    targetPlaceholder: "For example nnrp-rs-preview4 or acme-sdk-wire-target",
    protocolLabel: "Protocol baseline",
    recommendedPath: "Recommended file path",
    schemaToggle: "Include the optional $schema field",
    schemaLabel: "$schema path",
    modesHeading: "Runner Modes",
    transportsHeading: "Transport Endpoints",
    endpointPlaceholder: "For example 127.0.0.1:19091 or unix:///tmp/nnrp.sock",
    scenariosHeading: "Wire Scenario Capabilities",
    limitsHeading: "Execution Limits",
    maxFrameBytes: "max_frame_bytes",
    maxInFlight: "max_in_flight",
    previewHeading: "Generated Output",
    copy: "Copy JSON",
    copied: "Copied",
    copyFailed: "Copy failed, please copy manually",
    download: "Download file",
    loadingCatalog: "Loading wire-level baseline...",
    loadFailed: "Failed to load the wire-level baseline. Refresh the page or verify the build artifact.",
    noPresets: "This build did not export a wire-level baseline."
  }
};

const { localeIndex, site } = useData();

const currentLocale = computed<SupportedLocale>(() => (localeIndex.value === "zh" ? "zh" : "en"));
const messages = computed(() => localeMessages[currentLocale.value]);

const presets = ref<WireConformancePreset[]>([]);
const selectedVersion = ref("");
const targetName = ref("");
const includeSchema = ref(true);
const schemaPath = ref(wireConformanceTargetSchemaPath);
const selectedModes = ref<Record<string, boolean>>({});
const selectedTransports = ref<Record<string, { enabled: boolean; endpoint: string; tls: boolean }>>({});
const selectedScenarios = ref<Record<string, boolean>>({});
const maxFrameBytes = ref(16 * 1024 * 1024);
const maxInFlight = ref(256);
const isLoadingCatalog = ref(true);
const loadError = ref("");
const copyState = ref<"idle" | "copied" | "failed">("idle");

const selectedPreset = computed(() =>
  presets.value.find((preset) => preset.protocolVersion === selectedVersion.value) ??
    presets.value[0] ??
    null
);

const enabledModes = computed(() =>
  Object.entries(selectedModes.value)
    .filter(([, enabled]) => enabled)
    .map(([mode]) => mode)
);

const enabledTransports = computed(() =>
  Object.entries(selectedTransports.value)
    .filter(([, config]) => config.enabled)
    .map(([name, config]) => ({
      name,
      endpoint: config.endpoint,
      tls: config.tls
    }))
);

const enabledCapabilities = computed(() => {
  const preset = selectedPreset.value;
  if (!preset) {
    return [];
  }

  return Array.from(
    new Set(
      preset.scenarios
        .filter((scenario) => selectedScenarios.value[scenario.id])
        .flatMap((scenario) => scenario.requiredCapabilities)
    )
  ).sort();
});

const manifestJson = computed(() => {
  const preset = selectedPreset.value;
  const manifest: Record<string, unknown> = {
    target_name: targetName.value.trim(),
    protocol_version: preset?.protocolVersion ?? "",
    suite_version: preset?.suiteVersion ?? "",
    wire_conformance: {
      modes: enabledModes.value,
      transports: enabledTransports.value,
      capabilities: enabledCapabilities.value,
      limits: {
        max_frame_bytes: Number(maxFrameBytes.value),
        max_in_flight: Number(maxInFlight.value)
      }
    }
  };

  if (includeSchema.value && schemaPath.value.trim()) {
    manifest.$schema = schemaPath.value.trim();
  }

  return JSON.stringify(manifest, null, 2);
});

function buildPresetDocumentUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URL(`${site.value.base}conformance/capability-manifest-presets.json`, window.location.origin).toString();
}

function defaultEndpoint(transport: WireConformanceTransport): string {
  switch (transport) {
    case "tcp":
      return "127.0.0.1:19091";
    case "quic":
      return "127.0.0.1:19092";
    case "websocket":
      return "ws://127.0.0.1:19093/nnrp";
    case "ipc":
      return "unix:///tmp/nnrp.sock";
  }
}

function hydratePresetDefaults(preset: WireConformancePreset): void {
  selectedVersion.value = preset.protocolVersion;
  selectedModes.value = Object.fromEntries(preset.modes.map((mode) => [mode, true]));
  selectedTransports.value = Object.fromEntries(
    preset.transports.map((transport) => [
      transport,
      {
        enabled: true,
        endpoint: defaultEndpoint(transport),
        tls: false
      }
    ])
  );
  selectedScenarios.value = Object.fromEntries(preset.scenarios.map((scenario) => [scenario.id, true]));
}

async function loadPresets(): Promise<void> {
  const url = buildPresetDocumentUrl();
  if (!url) {
    return;
  }

  isLoadingCatalog.value = true;
  loadError.value = "";

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim());
    }

    const document = await response.json() as PresetDocument;
    presets.value = document.wire_conformance ?? [];
    if (presets.value[0]) {
      hydratePresetDefaults(presets.value[0]);
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error);
  } finally {
    isLoadingCatalog.value = false;
  }
}

async function copyManifest(): Promise<void> {
  try {
    await navigator.clipboard.writeText(manifestJson.value);
    copyState.value = "copied";
  } catch {
    copyState.value = "failed";
  }
}

function downloadManifest(): void {
  const blob = new Blob([`${manifestJson.value}\n`], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${targetName.value.trim() || "nnrp-wire-target"}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

onMounted(() => {
  void loadPresets();
});
</script>

<template>
  <div class="manifest-generator">
    <div class="manifest-generator__header">
      <h3>{{ messages.title }}</h3>
      <p>{{ messages.subtitle }}</p>
    </div>

    <p v-if="isLoadingCatalog" class="manifest-generator__status">{{ messages.loadingCatalog }}</p>
    <p v-else-if="loadError" class="manifest-generator__status manifest-generator__status--error">
      {{ messages.loadFailed }} {{ loadError }}
    </p>
    <p v-else-if="!selectedPreset" class="manifest-generator__status">{{ messages.noPresets }}</p>

    <template v-else>
      <div class="manifest-generator__layout">
        <section class="manifest-generator__panel">
          <div class="manifest-generator__grid">
            <label>
              <span>{{ messages.targetLabel }}</span>
              <input v-model="targetName" :placeholder="messages.targetPlaceholder" />
            </label>

            <label>
              <span>{{ messages.protocolLabel }}</span>
              <select v-model="selectedVersion" @change="selectedPreset && hydratePresetDefaults(selectedPreset)">
                <option v-for="preset in presets" :key="preset.protocolVersion" :value="preset.protocolVersion">
                  {{ preset.title[currentLocale] }}
                </option>
              </select>
            </label>

            <label>
              <span>{{ messages.recommendedPath }}</span>
              <input :value="selectedPreset.recommendedPath" readonly />
            </label>

            <label>
              <span>{{ messages.schemaLabel }}</span>
              <input v-model="schemaPath" />
            </label>
          </div>

          <label class="manifest-generator__check">
            <input v-model="includeSchema" type="checkbox" />
            <span>{{ messages.schemaToggle }}</span>
          </label>

          <h4>{{ messages.modesHeading }}</h4>
          <div class="manifest-generator__checks">
            <label v-for="mode in selectedPreset.modes" :key="mode" class="manifest-generator__check">
              <input v-model="selectedModes[mode]" type="checkbox" />
              <span>{{ mode }}</span>
            </label>
          </div>

          <h4>{{ messages.transportsHeading }}</h4>
          <div class="manifest-generator__stack">
            <div v-for="transport in selectedPreset.transports" :key="transport" class="manifest-generator__row">
              <label class="manifest-generator__check">
                <input v-model="selectedTransports[transport].enabled" type="checkbox" />
                <span>{{ transport }}</span>
              </label>
              <input v-model="selectedTransports[transport].endpoint" :placeholder="messages.endpointPlaceholder" />
              <label class="manifest-generator__check">
                <input v-model="selectedTransports[transport].tls" type="checkbox" />
                <span>TLS</span>
              </label>
            </div>
          </div>

          <h4>{{ messages.scenariosHeading }}</h4>
          <div class="manifest-generator__stack">
            <label v-for="scenario in selectedPreset.scenarios" :key="scenario.id" class="manifest-generator__check">
              <input v-model="selectedScenarios[scenario.id]" type="checkbox" />
              <span><strong>{{ scenario.id }}</strong> - {{ scenario.summary[currentLocale] }}</span>
            </label>
          </div>

          <h4>{{ messages.limitsHeading }}</h4>
          <div class="manifest-generator__grid">
            <label>
              <span>{{ messages.maxFrameBytes }}</span>
              <input v-model.number="maxFrameBytes" type="number" min="1" />
            </label>
            <label>
              <span>{{ messages.maxInFlight }}</span>
              <input v-model.number="maxInFlight" type="number" min="1" />
            </label>
          </div>
        </section>

        <aside class="manifest-generator__panel manifest-generator__panel--preview">
          <div class="manifest-generator__section-head">
            <h4>{{ messages.previewHeading }}</h4>
            <div class="manifest-generator__actions">
              <button type="button" @click="copyManifest">
                {{ copyState === "copied" ? messages.copied : messages.copy }}
              </button>
              <button type="button" @click="downloadManifest">{{ messages.download }}</button>
              <span v-if="copyState === 'failed'" class="manifest-generator__status--error">
                {{ messages.copyFailed }}
              </span>
            </div>
          </div>

          <pre class="manifest-generator__preview"><code>{{ manifestJson }}</code></pre>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.manifest-generator {
  display: grid;
  gap: 20px;
  margin: 24px 0 32px;
}

.manifest-generator__header,
.manifest-generator__panel {
  display: grid;
  gap: 16px;
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--nnrp-border);
  border-radius: 20px;
  background: var(--nnrp-elevated-bg);
  box-shadow: var(--nnrp-shadow);
}

.manifest-generator__header {
  background: var(--nnrp-surface);
}

.manifest-generator__layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.manifest-generator__header h3,
.manifest-generator h4 {
  margin: 0;
}

.manifest-generator__header p,
.manifest-generator__status,
.manifest-generator__row,
.manifest-generator__check {
  color: var(--vp-c-text-2);
}

.manifest-generator__header p,
.manifest-generator__status {
  margin: 0;
}

.manifest-generator__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.manifest-generator__grid label,
.manifest-generator__stack,
.manifest-generator__row {
  min-width: 0;
}

.manifest-generator__grid label {
  display: grid;
  gap: 8px;
}

.manifest-generator__grid label > span,
.manifest-generator__check span {
  font-size: 13px;
}

.manifest-generator__grid label > span {
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.manifest-generator input,
.manifest-generator select {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 12px;
  border: 1px solid var(--nnrp-border);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.manifest-generator input[readonly] {
  color: var(--vp-c-text-2);
}

.manifest-generator__check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  line-height: 1.5;
}

.manifest-generator__check input {
  width: auto;
  margin-top: 4px;
  flex: 0 0 auto;
}

.manifest-generator__check span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.manifest-generator__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.manifest-generator__checks .manifest-generator__check {
  padding: 8px 12px;
  border: 1px solid var(--nnrp-border);
  border-radius: 999px;
  background: var(--nnrp-surface);
}

.manifest-generator__stack {
  display: grid;
  gap: 10px;
}

.manifest-generator__row,
.manifest-generator__stack > .manifest-generator__check {
  padding: 14px 16px;
  border: 1px solid var(--nnrp-border);
  border-radius: 16px;
  background: var(--nnrp-surface);
}

.manifest-generator__row {
  display: grid;
  grid-template-columns: minmax(110px, auto) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.manifest-generator__row .manifest-generator__check {
  color: var(--vp-c-text-1);
  font-weight: 700;
}

.manifest-generator__status {
  padding: 14px 16px;
  border: 1px solid var(--nnrp-border);
  border-radius: 16px;
  background: var(--nnrp-surface);
}

.manifest-generator__status--error {
  color: var(--vp-c-text-1);
  border-color: rgba(190, 24, 93, 0.24);
  background: linear-gradient(135deg, rgba(190, 24, 93, 0.12), rgba(196, 96, 38, 0.1));
}

.manifest-generator__section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.manifest-generator__preview {
  margin: 0;
  overflow: auto;
  min-height: 420px;
  padding: 18px;
  border-radius: 16px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.55;
}

.manifest-generator__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.manifest-generator__actions button {
  padding: 10px 14px;
  border: 1px solid var(--nnrp-border-strong);
  border-radius: 999px;
  background: var(--nnrp-surface);
  color: var(--vp-c-text-1);
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 720px) {
  .manifest-generator__header,
  .manifest-generator__panel {
    padding: 16px;
  }

  .manifest-generator__grid,
  .manifest-generator__row {
    grid-template-columns: 1fr;
  }

  .manifest-generator__section-head {
    flex-direction: column;
  }

  .manifest-generator__actions {
    justify-content: flex-start;
  }
}
</style>
