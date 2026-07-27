<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useData } from "vitepress";
import {
  type SupportedLocale,
  type WireConformanceMode,
  type WireConformancePreset,
  type WireConformanceTransport,
  type WireHostPlatform,
  type WireHostRouteSecurityMode,
  wireConformanceScenarioSchemaPath,
  wireConformanceTargetSchemaPath,
} from "./capabilityManifestShared";
import {
  buildWireHostRouteScenarioManifest,
  buildWireTargetManifest,
  stringifyManifest,
  type WireHostRouteProviderConfig,
  type WireTransportTargetConfig,
} from "./wireConformanceManifest";

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
  tlsSecurityHeading: string;
  hostProvidersHeading: string;
  enabled: string;
  installed: string;
  platforms: string;
  securityModes: string;
  scenariosHeading: string;
  hostRouteNote: string;
  limitsHeading: string;
  maxFrameBytes: string;
  maxInFlight: string;
  targetOutput: string;
  scenarioOutput: string;
  manifestName: string;
  serverName: string;
  trustedCertificate: string;
  certificate: string;
  privateKey: string;
  previewHeading: string;
  copy: string;
  copied: string;
  copyFailed: string;
  download: string;
  loadingCatalog: string;
  loadFailed: string;
  noPresets: string;
  incomplete: string;
};

const localeMessages: Record<SupportedLocale, Messages> = {
  zh: {
    title: "线路级测试声明生成器",
    subtitle:
      "生成测试套件直接扮演客户端、服务端或代理时使用的目标声明与主机路由场景，适用于协议帧级 E2E 测试。",
    targetLabel: "target_name",
    targetPlaceholder: "例如 nnrp-rs-preview4 或 acme-sdk-wire-target",
    protocolLabel: "协议基线",
    recommendedPath: "推荐文件路径",
    schemaToggle: "包含可选 $schema 字段",
    schemaLabel: "$schema 路径",
    modesHeading: "测试套件模式",
    transportsHeading: "帧级传输端点",
    endpointPlaceholder: "例如 127.0.0.1:19091 或 unix:///tmp/nnrp.sock",
    tlsSecurityHeading: "TLS 材料路径",
    hostProvidersHeading: "主机路由提供程序",
    enabled: "启用",
    installed: "已安装",
    platforms: "平台",
    securityModes: "安全模式",
    scenariosHeading: "线路级场景能力",
    hostRouteNote:
      "主机路由场景保持 NNRP 应用端点与每个提供程序的本地地址分离，并只记录凭据归属，不写入任何密钥内容。",
    limitsHeading: "执行限制",
    maxFrameBytes: "max_frame_bytes",
    maxInFlight: "max_in_flight",
    targetOutput: "目标声明",
    scenarioOutput: "主机路由场景",
    manifestName: "manifest_name",
    serverName: "server_name",
    trustedCertificate: "trusted_certificate_der_path",
    certificate: "certificate_der_path",
    privateKey: "private_key_pkcs8_der_path",
    previewHeading: "生成结果",
    copy: "复制 JSON",
    copied: "已复制",
    copyFailed: "复制失败，请手动复制",
    download: "下载文件",
    loadingCatalog: "正在读取线路级测试基线...",
    loadFailed: "读取线路级测试基线失败。请刷新页面或检查构建产物。",
    noPresets: "当前构建没有导出线路级测试基线。",
    incomplete: "当前选择无法通过 schema 校验，请补全必填项并至少保留一种可执行能力。",
  },
  en: {
    title: "Wire-level Conformance Manifest Generator",
    subtitle:
      "Generate target declarations and host-route scenarios for frame-level E2E tests where the runner directly acts as client, server, or proxy.",
    targetLabel: "target_name",
    targetPlaceholder: "For example nnrp-rs-preview4 or acme-sdk-wire-target",
    protocolLabel: "Protocol baseline",
    recommendedPath: "Recommended file path",
    schemaToggle: "Include the optional $schema field",
    schemaLabel: "$schema path",
    modesHeading: "Runner Modes",
    transportsHeading: "Frame Transport Endpoints",
    endpointPlaceholder: "For example 127.0.0.1:19091 or unix:///tmp/nnrp.sock",
    tlsSecurityHeading: "TLS Material Paths",
    hostProvidersHeading: "Host Route Providers",
    enabled: "Enabled",
    installed: "Installed",
    platforms: "Platforms",
    securityModes: "Security Modes",
    scenariosHeading: "Wire Scenario Capabilities",
    hostRouteNote:
      "Host-route scenarios keep the NNRP application endpoint separate from each provider locator and record credential ownership without serializing secret material.",
    limitsHeading: "Execution Limits",
    maxFrameBytes: "max_frame_bytes",
    maxInFlight: "max_in_flight",
    targetOutput: "Target Manifest",
    scenarioOutput: "Host Route Scenarios",
    manifestName: "manifest_name",
    serverName: "server_name",
    trustedCertificate: "trusted_certificate_der_path",
    certificate: "certificate_der_path",
    privateKey: "private_key_pkcs8_der_path",
    previewHeading: "Generated Output",
    copy: "Copy JSON",
    copied: "Copied",
    copyFailed: "Copy failed, please copy manually",
    download: "Download file",
    loadingCatalog: "Loading wire-level baseline...",
    loadFailed: "Failed to load the wire-level baseline. Refresh the page or verify the build artifact.",
    noPresets: "This build did not export a wire-level baseline.",
    incomplete:
      "The current selection cannot pass schema validation. Complete required fields and keep at least one executable capability.",
  }
};

const { localeIndex, site } = useData();

const currentLocale = computed<SupportedLocale>(() => (localeIndex.value === "zh" ? "zh" : "en"));
const messages = computed(() => localeMessages[currentLocale.value]);

const presets = ref<WireConformancePreset[]>([]);
const selectedVersion = ref("");
const targetName = ref("");
const includeSchema = ref(true);
const targetSchemaPath = ref(wireConformanceTargetSchemaPath);
const scenarioSchemaPath = ref(wireConformanceScenarioSchemaPath);
const scenarioManifestName = ref("host-route-generated");
const outputKind = ref<"target" | "scenarios">("target");
const selectedModes = ref<Record<string, boolean>>({});
const selectedTransports = ref<Record<string, WireTransportTargetConfig>>({});
const selectedHostProviders = ref<Record<string, WireHostRouteProviderConfig>>({});
const selectedScenarios = ref<Record<string, boolean>>({});
const maxFrameBytes = ref(16 * 1024 * 1024);
const maxInFlight = ref(256);
const isLoadingCatalog = ref(true);
const loadError = ref("");
const copyState = ref<"idle" | "copied" | "failed">("idle");
const hostPlatforms: WireHostPlatform[] = ["native", "browser"];
const hostSecurityModes: WireHostRouteSecurityMode[] = [
  "plain",
  "tls_server_auth",
  "mutual_tls",
  "wss",
  "browser_host",
];

const selectedPreset = computed(() =>
  presets.value.find((preset) => preset.protocolVersion === selectedVersion.value) ??
    presets.value[0] ??
    null
);

const enabledModes = computed(() =>
  Object.entries(selectedModes.value)
    .filter(([, enabled]) => enabled)
    .map(([mode]) => mode as WireConformanceMode)
);

const selectedScenarioIds = computed(() =>
  Object.entries(selectedScenarios.value)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id)
);

const visibleScenarios = computed(() => {
  const scenarios = selectedPreset.value?.scenarios ?? [];
  return outputKind.value === "scenarios"
    ? scenarios.filter((scenario) => scenario.hostRoute)
    : scenarios;
});

const activeSchemaPath = computed({
  get: () => outputKind.value === "target" ? targetSchemaPath.value : scenarioSchemaPath.value,
  set: (value: string) => {
    if (outputKind.value === "target") {
      targetSchemaPath.value = value;
    } else {
      scenarioSchemaPath.value = value;
    }
  },
});

const recommendedPath = computed(() => {
  if (!selectedPreset.value) {
    return "";
  }
  return outputKind.value === "target"
    ? selectedPreset.value.recommendedPath
    : `conformance/${selectedPreset.value.protocolVersion}.host-route-scenarios.json`;
});

const manifestJson = computed(() => {
  const preset = selectedPreset.value;
  if (!preset) {
    return "{}";
  }
  if (outputKind.value === "scenarios") {
    return stringifyManifest(buildWireHostRouteScenarioManifest({
      includeSchema: includeSchema.value,
      schemaPath: scenarioSchemaPath.value,
      manifestName: scenarioManifestName.value,
      preset,
      selectedScenarioIds: selectedScenarioIds.value,
    }));
  }
  return stringifyManifest(buildWireTargetManifest({
    includeSchema: includeSchema.value,
    schemaPath: targetSchemaPath.value,
    targetName: targetName.value,
    preset,
    modes: enabledModes.value,
    transports: Object.values(selectedTransports.value),
    hostRouteProviders: Object.values(selectedHostProviders.value),
    selectedScenarioIds: selectedScenarioIds.value,
    maxFrameBytes: maxFrameBytes.value,
    maxInFlight: maxInFlight.value,
  }));
});

const manifestValidationError = computed(() => {
  const preset = selectedPreset.value;
  if (!preset) {
    return messages.value.incomplete;
  }
  if (outputKind.value === "scenarios") {
    const selectedHostRouteCount = preset.scenarios.filter((scenario) =>
      scenario.hostRoute && selectedScenarios.value[scenario.id]
    ).length;
    return scenarioManifestName.value.trim() && selectedHostRouteCount > 0
      ? ""
      : messages.value.incomplete;
  }

  const transports = Object.values(selectedTransports.value).filter((config) => config.enabled);
  const providers = Object.values(selectedHostProviders.value).filter((provider) => provider.enabled);
  const selectedCapabilities = preset.scenarios
    .filter((scenario) => selectedScenarios.value[scenario.id])
    .flatMap((scenario) => scenario.requiredCapabilities);
  const transportsValid = transports.every((config) => {
    if (!config.endpoint.trim()) {
      return false;
    }
    if (!config.tls) {
      return true;
    }
    const security = config.security;
    return Boolean(security && Object.values(security).every((value) => value.trim()));
  });
  const providersValid = providers.every((provider) =>
    provider.platforms.length > 0 && provider.securityModes.length > 0
  );
  const hasExecutionSurface = transports.length > 0 || providers.length > 0;
  const hasCapabilities = selectedCapabilities.length > 0 || providers.length > 0;
  return targetName.value.trim() && enabledModes.value.length > 0 && transportsValid &&
      providersValid && hasExecutionSurface && hasCapabilities
    ? ""
    : messages.value.incomplete;
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

function defaultTls(transport: WireConformanceTransport): boolean {
  return transport === "quic";
}

function defaultSecurity() {
  return {
    server_name: "localhost",
    trusted_certificate_der_path: "certs/server.der",
    certificate_der_path: "certs/server.der",
    private_key_pkcs8_der_path: "certs/server-key.der",
  };
}

function hydratePresetDefaults(preset: WireConformancePreset): void {
  selectedVersion.value = preset.protocolVersion;
  selectedModes.value = Object.fromEntries(preset.modes.map((mode) => [mode, true]));
  selectedTransports.value = Object.fromEntries(
    preset.transports.map((transport) => [
      transport,
      {
        enabled: true,
        name: transport,
        endpoint: defaultEndpoint(transport),
        tls: defaultTls(transport),
        ...(defaultTls(transport) ? { security: defaultSecurity() } : {}),
      }
    ])
  );
  selectedHostProviders.value = Object.fromEntries(
    preset.hostRouteProviders.map((provider) => [
      provider.providerId,
      {
        ...provider,
        platforms: [...provider.platforms],
        securityModes: [...provider.securityModes],
        enabled: true,
      },
    ]),
  );
  selectedScenarios.value = Object.fromEntries(preset.scenarios.map((scenario) => [scenario.id, true]));
}

function toggleListValue<T>(items: T[], value: T, enabled: boolean): void {
  const index = items.indexOf(value);
  if (enabled && index === -1) {
    items.push(value);
  } else if (!enabled && index !== -1 && items.length > 1) {
    items.splice(index, 1);
  }
}

function togglePlatform(provider: WireHostRouteProviderConfig, platform: WireHostPlatform, event: Event): void {
  toggleListValue(provider.platforms, platform, (event.target as HTMLInputElement).checked);
}

function toggleSecurityMode(
  provider: WireHostRouteProviderConfig,
  mode: WireHostRouteSecurityMode,
  event: Event,
): void {
  toggleListValue(provider.securityModes, mode, (event.target as HTMLInputElement).checked);
}

function setTransportTls(config: WireTransportTargetConfig, event: Event): void {
  const requested = (event.target as HTMLInputElement).checked;
  config.tls = config.name === "quic" || (config.name === "websocket" && requested);
  if (config.tls) {
    config.security ??= defaultSecurity();
    if (config.name === "websocket" && config.endpoint.startsWith("ws://")) {
      config.endpoint = `wss://${config.endpoint.slice("ws://".length)}`;
    }
  } else {
    delete config.security;
    if (config.name === "websocket" && config.endpoint.startsWith("wss://")) {
      config.endpoint = `ws://${config.endpoint.slice("wss://".length)}`;
    }
  }
}

function syncWebSocketTls(config: WireTransportTargetConfig): void {
  if (config.name !== "websocket") {
    return;
  }
  config.tls = config.endpoint.startsWith("wss://");
  if (config.tls) {
    config.security ??= defaultSecurity();
  } else {
    delete config.security;
  }
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
  if (manifestValidationError.value) {
    return;
  }
  try {
    await navigator.clipboard.writeText(manifestJson.value);
    copyState.value = "copied";
  } catch {
    copyState.value = "failed";
  }
}

function downloadManifest(): void {
  if (manifestValidationError.value) {
    return;
  }
  const blob = new Blob([`${manifestJson.value}\n`], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = outputKind.value === "target"
    ? `${targetName.value.trim() || "nnrp-wire-target"}.json`
    : `${scenarioManifestName.value.trim() || "nnrp-host-route-scenarios"}.json`;
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
      <div class="manifest-generator__output-switch" role="radiogroup">
        <label>
          <input v-model="outputKind" type="radio" value="target" />
          <span>{{ messages.targetOutput }}</span>
        </label>
        <label>
          <input v-model="outputKind" type="radio" value="scenarios" />
          <span>{{ messages.scenarioOutput }}</span>
        </label>
      </div>

      <div class="manifest-generator__layout">
        <section class="manifest-generator__panel">
          <div class="manifest-generator__grid">
            <label v-if="outputKind === 'target'">
              <span>{{ messages.targetLabel }}</span>
              <input v-model="targetName" :placeholder="messages.targetPlaceholder" />
            </label>

            <label v-else>
              <span>{{ messages.manifestName }}</span>
              <input v-model="scenarioManifestName" />
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
              <input :value="recommendedPath" readonly />
            </label>

            <label>
              <span>{{ messages.schemaLabel }}</span>
              <input v-model="activeSchemaPath" />
            </label>
          </div>

          <label class="manifest-generator__check">
            <input v-model="includeSchema" type="checkbox" />
            <span>{{ messages.schemaToggle }}</span>
          </label>

          <template v-if="outputKind === 'target'">
            <h4>{{ messages.modesHeading }}</h4>
            <div class="manifest-generator__checks">
              <label v-for="mode in selectedPreset.modes" :key="mode" class="manifest-generator__check">
                <input v-model="selectedModes[mode]" type="checkbox" />
                <span>{{ mode }}</span>
              </label>
            </div>

            <h4>{{ messages.transportsHeading }}</h4>
            <div class="manifest-generator__stack">
              <div
                v-for="transport in selectedPreset.transports"
                :key="transport"
                class="manifest-generator__transport"
              >
                <div class="manifest-generator__row">
                  <label class="manifest-generator__check">
                    <input v-model="selectedTransports[transport].enabled" type="checkbox" />
                    <span>{{ transport }}</span>
                  </label>
                  <input
                    v-model="selectedTransports[transport].endpoint"
                    :placeholder="messages.endpointPlaceholder"
                    @input="syncWebSocketTls(selectedTransports[transport])"
                  />
                  <label class="manifest-generator__check">
                    <input
                      :checked="selectedTransports[transport].tls"
                      :disabled="transport !== 'websocket'"
                      type="checkbox"
                      @change="setTransportTls(selectedTransports[transport], $event)"
                    />
                    <span>TLS</span>
                  </label>
                </div>
                <div
                  v-if="selectedTransports[transport].tls && selectedTransports[transport].security"
                  class="manifest-generator__security"
                >
                  <strong>{{ messages.tlsSecurityHeading }}</strong>
                  <label>
                    <span>{{ messages.serverName }}</span>
                    <input v-model="selectedTransports[transport].security!.server_name" />
                  </label>
                  <label>
                    <span>{{ messages.trustedCertificate }}</span>
                    <input v-model="selectedTransports[transport].security!.trusted_certificate_der_path" />
                  </label>
                  <label>
                    <span>{{ messages.certificate }}</span>
                    <input v-model="selectedTransports[transport].security!.certificate_der_path" />
                  </label>
                  <label>
                    <span>{{ messages.privateKey }}</span>
                    <input v-model="selectedTransports[transport].security!.private_key_pkcs8_der_path" />
                  </label>
                </div>
              </div>
            </div>

            <h4>{{ messages.hostProvidersHeading }}</h4>
            <p class="manifest-generator__note">{{ messages.hostRouteNote }}</p>
            <div class="manifest-generator__stack">
              <div
                v-for="provider in selectedPreset.hostRouteProviders"
                :key="provider.providerId"
                class="manifest-generator__provider"
              >
                <div class="manifest-generator__provider-head">
                  <strong>{{ provider.providerId }}</strong>
                  <span>{{ provider.transport }}</span>
                </div>
                <div class="manifest-generator__checks">
                  <label class="manifest-generator__check">
                    <input v-model="selectedHostProviders[provider.providerId].enabled" type="checkbox" />
                    <span>{{ messages.enabled }}</span>
                  </label>
                  <label class="manifest-generator__check">
                    <input v-model="selectedHostProviders[provider.providerId].installed" type="checkbox" />
                    <span>{{ messages.installed }}</span>
                  </label>
                </div>
                <div class="manifest-generator__option-group">
                  <span>{{ messages.platforms }}</span>
                  <div class="manifest-generator__checks">
                    <label v-for="platform in hostPlatforms" :key="platform" class="manifest-generator__check">
                      <input
                        :checked="selectedHostProviders[provider.providerId].platforms.includes(platform)"
                        type="checkbox"
                        @change="togglePlatform(selectedHostProviders[provider.providerId], platform, $event)"
                      />
                      <span>{{ platform }}</span>
                    </label>
                  </div>
                </div>
                <div class="manifest-generator__option-group">
                  <span>{{ messages.securityModes }}</span>
                  <div class="manifest-generator__checks">
                    <label v-for="mode in hostSecurityModes" :key="mode" class="manifest-generator__check">
                      <input
                        :checked="selectedHostProviders[provider.providerId].securityModes.includes(mode)"
                        type="checkbox"
                        @change="toggleSecurityMode(selectedHostProviders[provider.providerId], mode, $event)"
                      />
                      <span>{{ mode }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <p v-else class="manifest-generator__note">{{ messages.hostRouteNote }}</p>

          <h4>{{ messages.scenariosHeading }}</h4>
          <div class="manifest-generator__stack">
            <label v-for="scenario in visibleScenarios" :key="scenario.id" class="manifest-generator__check">
              <input v-model="selectedScenarios[scenario.id]" type="checkbox" />
              <span><strong>{{ scenario.id }}</strong> - {{ scenario.summary[currentLocale] }}</span>
            </label>
          </div>

          <h4 v-if="outputKind === 'target'">{{ messages.limitsHeading }}</h4>
          <div v-if="outputKind === 'target'" class="manifest-generator__grid">
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
              <button type="button" :disabled="Boolean(manifestValidationError)" @click="copyManifest">
                {{ copyState === "copied" ? messages.copied : messages.copy }}
              </button>
              <button
                type="button"
                :disabled="Boolean(manifestValidationError)"
                @click="downloadManifest"
              >
                {{ messages.download }}
              </button>
              <span v-if="copyState === 'failed'" class="manifest-generator__status--error">
                {{ messages.copyFailed }}
              </span>
            </div>
          </div>

          <p
            v-if="manifestValidationError"
            class="manifest-generator__status manifest-generator__status--error"
          >
            {{ manifestValidationError }}
          </p>

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
  border-radius: 8px;
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

.manifest-generator__output-switch {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  justify-self: start;
  overflow: hidden;
  border: 1px solid var(--nnrp-border-strong);
  border-radius: 8px;
}

.manifest-generator__output-switch label {
  position: relative;
  cursor: pointer;
}

.manifest-generator__output-switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.manifest-generator__output-switch span {
  display: block;
  min-width: 130px;
  padding: 9px 14px;
  text-align: center;
  color: var(--vp-c-text-2);
  background: var(--nnrp-surface);
}

.manifest-generator__output-switch label + label span {
  border-left: 1px solid var(--nnrp-border-strong);
}

.manifest-generator__output-switch input:checked + span {
  color: var(--vp-c-text-1);
  background: var(--vp-c-brand-soft);
  font-weight: 700;
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

.manifest-generator__grid label,
.manifest-generator__security label {
  display: grid;
  gap: 8px;
}

.manifest-generator__grid label > span,
.manifest-generator__security label > span,
.manifest-generator__check span {
  font-size: 13px;
}

.manifest-generator__grid label > span,
.manifest-generator__security label > span,
.manifest-generator__option-group > span {
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.manifest-generator input,
.manifest-generator select {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 12px;
  border: 1px solid var(--nnrp-border);
  border-radius: 6px;
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

.manifest-generator__stack {
  display: grid;
  gap: 10px;
}

.manifest-generator__row {
  display: grid;
  grid-template-columns: minmax(110px, auto) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.manifest-generator__transport,
.manifest-generator__provider,
.manifest-generator__stack > .manifest-generator__check {
  display: grid;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--nnrp-border);
}

.manifest-generator__transport:first-child,
.manifest-generator__provider:first-child,
.manifest-generator__stack > .manifest-generator__check:first-child {
  border-top: 1px solid var(--nnrp-border);
}

.manifest-generator__security {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding-left: 122px;
}

.manifest-generator__security > strong {
  grid-column: 1 / -1;
  font-size: 13px;
}

.manifest-generator__provider-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.manifest-generator__provider-head span,
.manifest-generator__note {
  color: var(--vp-c-text-2);
}

.manifest-generator__option-group {
  display: grid;
  gap: 8px;
}

.manifest-generator__note {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.manifest-generator__row .manifest-generator__check {
  color: var(--vp-c-text-1);
  font-weight: 700;
}

.manifest-generator__status {
  padding: 14px 16px;
  border: 1px solid var(--nnrp-border);
  border-radius: 8px;
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
  border-radius: 8px;
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
  border-radius: 6px;
  background: var(--nnrp-surface);
  color: var(--vp-c-text-1);
  font-weight: 700;
  cursor: pointer;
}

.manifest-generator__actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .manifest-generator__header,
  .manifest-generator__panel {
    padding: 16px;
  }

  .manifest-generator__grid,
  .manifest-generator__row,
  .manifest-generator__security {
    grid-template-columns: 1fr;
  }

  .manifest-generator__security {
    padding-left: 0;
  }

  .manifest-generator__output-switch {
    width: 100%;
  }

  .manifest-generator__output-switch span {
    min-width: 0;
  }

  .manifest-generator__section-head {
    flex-direction: column;
  }

  .manifest-generator__actions {
    justify-content: flex-start;
  }
}
</style>
