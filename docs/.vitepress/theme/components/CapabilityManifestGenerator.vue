<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";
import {
  capabilityManifestSchemaPath,
  type CapabilityVersionPreset,
  type CapabilityCategory,
  type CapabilityOption,
  type SupportedLocale
} from "./capabilityManifestShared";

type CapabilityPresetDocument = {
  generated_at: string;
  source: string;
  presets: CapabilityVersionPreset[];
};

type Messages = {
  title: string;
  subtitle: string;
  versionLabel: string;
  implementationLabel: string;
  implementationPlaceholder: string;
  schemaToggle: string;
  schemaLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  recommendedPath: string;
  selectedCount: string;
  capabilitiesHeading: string;
  previewHeading: string;
  copy: string;
  copied: string;
  copyFailed: string;
  download: string;
  share: string;
  shareCopied: string;
  shareFailed: string;
  selectAll: string;
  selectMandatory: string;
  clear: string;
  helper: string;
  statusLabels: Record<CapabilityCategory, string>;
  combinationLabel: string;
  emptyState: string;
  schemaHelper: string;
  selectedState: string;
  loadingCatalog: string;
  loadFailed: string;
};

const localeMessages: Record<SupportedLocale, Messages> = {
  zh: {
    title: "低代码 Capability Manifest 生成器",
    subtitle: "选择协议版本、填写实现标识、勾选已完成能力，即时生成可复制的 capability manifest JSON。",
    versionLabel: "协议版本",
    implementationLabel: "implementation_name",
    implementationPlaceholder: "例如 nnrp-py、nnrp-cs、acme-runtime",
    schemaToggle: "包含可选 $schema 字段",
    schemaLabel: "$schema 路径",
    searchLabel: "筛选能力",
    searchPlaceholder: "按 token、层级或说明筛选",
    recommendedPath: "推荐文件路径",
    selectedCount: "已选择 {selected} / {total} 项能力",
    capabilitiesHeading: "能力清单",
    previewHeading: "生成结果",
    copy: "复制 JSON",
    copied: "已复制",
    copyFailed: "复制失败，请手动复制",
    download: "下载文件",
    share: "复制分享链接",
    shareCopied: "链接已复制",
    shareFailed: "分享失败，请手动复制地址栏链接",
    selectAll: "全选",
    selectMandatory: "选择 mandatory 集",
    clear: "清空",
    helper: "生成器只负责拼装 JSON，不替你判断哪些 token 应该被对外声明。是否能声明某个能力，仍以对应版本的能力列表与 conformance baseline 为准。",
    statusLabels: {
      mandatory: "mandatory",
      optional: "optional",
      experimental: "experimental",
      deprecated: "deprecated"
    },
    combinationLabel: "组合要求",
    emptyState: "没有匹配到能力。请调整筛选词。",
    schemaHelper: "默认值使用文档中推荐的相对 schema 路径。",
    selectedState: "当前",
    loadingCatalog: "正在读取当前版本的 capability baseline...",
    loadFailed: "读取 capability baseline 失败。请稍后刷新页面，或检查构建时导出的 JSON 是否存在。"
  },
  en: {
    title: "Low-Code Capability Manifest Generator",
    subtitle: "Choose a protocol line, enter your implementation identifier, and tick completed capabilities to generate a copy-ready capability manifest JSON.",
    versionLabel: "Protocol Version",
    implementationLabel: "implementation_name",
    implementationPlaceholder: "For example nnrp-py, nnrp-cs, or acme-runtime",
    schemaToggle: "Include the optional $schema field",
    schemaLabel: "$schema path",
    searchLabel: "Filter capabilities",
    searchPlaceholder: "Filter by token, layer, or description",
    recommendedPath: "Recommended file path",
    selectedCount: "Selected {selected} / {total} capabilities",
    capabilitiesHeading: "Capability List",
    previewHeading: "Generated Output",
    copy: "Copy JSON",
    copied: "Copied",
    copyFailed: "Copy failed, please copy manually",
    download: "Download file",
    share: "Copy share link",
    shareCopied: "Link copied",
    shareFailed: "Share failed, please copy the URL manually",
    selectAll: "Select all",
    selectMandatory: "Select mandatory set",
    clear: "Clear",
    helper: "The generator only assembles JSON. It does not decide which tokens you should claim publicly; the versioned capability catalog and the conformance baseline remain the source of truth.",
    statusLabels: {
      mandatory: "mandatory",
      optional: "optional",
      experimental: "experimental",
      deprecated: "deprecated"
    },
    combinationLabel: "Combination Rule",
    emptyState: "No capabilities match the current filter.",
    schemaHelper: "The default value uses the recommended relative schema path from the docs.",
    selectedState: "Current",
    loadingCatalog: "Loading the current capability baseline...",
    loadFailed: "Failed to load the capability baseline. Refresh the page later or verify that the build exported the JSON artifact."
  }
};

const { localeIndex, site } = useData();

const currentLocale = computed<SupportedLocale>(() => (localeIndex.value === "zh" ? "zh" : "en"));
const messages = computed(() => localeMessages[currentLocale.value]);

const versionPresets = ref<CapabilityVersionPreset[]>([]);
const selectedVersion = ref("");
const implementationName = ref("");
const includeSchema = ref(true);
const schemaPath = ref(capabilityManifestSchemaPath);
const filterText = ref("");
const selectedTokens = ref<string[]>([]);
const copyState = ref<"idle" | "copied" | "failed">("idle");
const shareState = ref<"idle" | "copied" | "failed">("idle");
const isLoadingCatalog = ref(true);
const loadError = ref("");
const hasInitializedFromQuery = ref(false);
const versionMenuRoot = ref<HTMLElement | null>(null);
const versionMenuOpen = ref(false);

const selectedPreset = computed(() => {
  return versionPresets.value.find((preset) => preset.version === selectedVersion.value) ?? versionPresets.value[0] ?? null;
});

const availableTokenSet = computed(() => new Set((selectedPreset.value?.capabilities ?? []).map((item) => item.token)));

watch(
  () => selectedVersion.value,
  () => {
    selectedTokens.value = selectedTokens.value.filter((token) => availableTokenSet.value.has(token));
    resetFeedbackState();
  }
);

const selectedTokenSet = computed(() => new Set(selectedTokens.value));

const orderedSelectedTokens = computed(() => {
  return (selectedPreset.value?.capabilities ?? [])
    .filter((item) => selectedTokenSet.value.has(item.token))
    .map((item) => item.token);
});

const filteredCapabilities = computed(() => {
  const query = filterText.value.trim().toLowerCase();

  if (!query) {
    return selectedPreset.value?.capabilities ?? [];
  }

  return (selectedPreset.value?.capabilities ?? []).filter((capability) => {
    const haystack = [
      capability.token,
      capability.layers,
      capability.description[currentLocale.value],
      capability.combination?.[currentLocale.value] ?? ""
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
});

const manifestJson = computed(() => {
  const manifest: Record<string, unknown> = {
    implementation_name: implementationName.value.trim(),
    protocol_version: selectedPreset.value?.version ?? "",
    supports: orderedSelectedTokens.value
  };

  if (includeSchema.value && schemaPath.value.trim()) {
    manifest.$schema = schemaPath.value.trim();
  }

  return JSON.stringify(manifest, null, 2);
});

const selectedCountText = computed(() => {
  return messages.value.selectedCount
    .replace("{selected}", String(orderedSelectedTokens.value.length))
    .replace("{total}", String(selectedPreset.value?.capabilities.length ?? 0));
});

function buildPresetDocumentUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URL(`${site.value.base}conformance/capability-manifest-presets.json`, window.location.origin).toString();
}

async function loadCapabilityPresets(): Promise<void> {
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

    const document = await response.json() as CapabilityPresetDocument;
    versionPresets.value = document.presets;

    if (!selectedVersion.value) {
      selectedVersion.value = document.presets[1]?.version ?? document.presets[0]?.version ?? "";
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error);
  } finally {
    isLoadingCatalog.value = false;
  }
}

function isTokenSelected(token: string): boolean {
  return selectedTokenSet.value.has(token);
}

function toggleToken(token: string): void {
  const next = new Set(selectedTokens.value);
  if (next.has(token)) {
    next.delete(token);
  } else {
    next.add(token);
  }

  selectedTokens.value = Array.from(next);
  resetFeedbackState();
}

function selectAll(): void {
  selectedTokens.value = selectedPreset.value?.capabilities.map((item) => item.token) ?? [];
  resetFeedbackState();
}

function selectMandatory(): void {
  selectedTokens.value = (selectedPreset.value?.capabilities ?? [])
    .filter((item) => item.categories.includes("mandatory"))
    .map((item) => item.token);
  resetFeedbackState();
}

function clearSelection(): void {
  selectedTokens.value = [];
  resetFeedbackState();
}

function closeVersionMenu(): void {
  versionMenuOpen.value = false;
}

function toggleVersionMenu(): void {
  if (versionPresets.value.length === 0) {
    return;
  }

  versionMenuOpen.value = !versionMenuOpen.value;
}

function selectVersion(version: string): void {
  if (!versionPresets.value.some((preset) => preset.version === version)) {
    return;
  }

  selectedVersion.value = version;
  closeVersionMenu();
}

function categoryLabels(option: CapabilityOption): string {
  return option.categories.map((category) => messages.value.statusLabels[category]).join(" / ");
}

async function copyJson(): Promise<void> {
  try {
    await navigator.clipboard.writeText(manifestJson.value);
    copyState.value = "copied";
  } catch {
    copyState.value = "failed";
  }
}

function resetFeedbackState(): void {
  copyState.value = "idle";
  shareState.value = "idle";
}

function sanitizeFileNamePart(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildShareUrl(): string | null {
  if (typeof window === "undefined" || !selectedPreset.value) {
    return null;
  }

  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("protocol_version", selectedPreset.value.version);

  const trimmedImplementationName = implementationName.value.trim();
  if (trimmedImplementationName) {
    url.searchParams.set("implementation_name", trimmedImplementationName);
  }

  if (!includeSchema.value) {
    url.searchParams.set("include_schema", "0");
  } else if (schemaPath.value.trim() && schemaPath.value.trim() !== capabilityManifestSchemaPath) {
    url.searchParams.set("schema_path", schemaPath.value.trim());
  }

  if (orderedSelectedTokens.value.length > 0) {
    url.searchParams.set("supports", orderedSelectedTokens.value.join(","));
  }

  return url.toString();
}

function syncQueryToLocation(): void {
  const shareUrl = buildShareUrl();
  if (!shareUrl || typeof window === "undefined") {
    return;
  }

  window.history.replaceState({}, "", shareUrl);
}

function hydrateFromQuery(): void {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const requestedVersion = params.get("protocol_version");
  if (requestedVersion && versionPresets.value.some((preset) => preset.version === requestedVersion)) {
    selectedVersion.value = requestedVersion;
  }

  implementationName.value = params.get("implementation_name") ?? "";

  const includeSchemaParam = params.get("include_schema");
  includeSchema.value = includeSchemaParam !== "0";
  schemaPath.value = params.get("schema_path") ?? capabilityManifestSchemaPath;

  const requestedTokens = (params.get("supports") ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  selectedTokens.value = requestedTokens.filter((token) => availableTokenSet.value.has(token));
}

async function copyShareLink(): Promise<void> {
  const shareUrl = buildShareUrl();
  if (!shareUrl) {
    shareState.value = "failed";
    return;
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    shareState.value = "copied";
  } catch {
    shareState.value = "failed";
  }
}

function downloadJson(): void {
  if (typeof window === "undefined" || !selectedPreset.value) {
    return;
  }

  const implementationPart = sanitizeFileNamePart(implementationName.value) || "capability-manifest";
  const versionPart = sanitizeFileNamePart(selectedPreset.value.version);
  const fileName = `${implementationPart}-${versionPart}.capabilities.json`;
  const blob = new Blob([manifestJson.value + "\n"], { type: "application/json;charset=utf-8" });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(objectUrl);
}

function handleDocumentClick(event: MouseEvent): void {
  if (!versionMenuRoot.value) {
    return;
  }

  const clickTarget = event.target;

  if (clickTarget instanceof Node && !versionMenuRoot.value.contains(clickTarget)) {
    closeVersionMenu();
  }
}

function handleDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    closeVersionMenu();
  }
}

onMounted(async () => {
  await loadCapabilityPresets();
  if (selectedPreset.value) {
    hydrateFromQuery();
    syncQueryToLocation();
    hasInitializedFromQuery.value = true;
  }

  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleDocumentKeydown);
});

watch(
  [selectedVersion, implementationName, includeSchema, schemaPath, orderedSelectedTokens],
  () => {
    if (!hasInitializedFromQuery.value) {
      return;
    }

    syncQueryToLocation();
  }
);
</script>

<template>
  <section class="capability-manifest-generator">
    <header class="capability-manifest-generator__hero">
      <div>
        <h2>{{ messages.title }}</h2>
        <p>{{ messages.subtitle }}</p>
      </div>
      <p class="capability-manifest-generator__helper">{{ messages.helper }}</p>
    </header>

    <div class="capability-manifest-generator__layout">
      <div class="capability-manifest-generator__panel capability-manifest-generator__panel--form">
        <p v-if="isLoadingCatalog" class="capability-manifest-generator__status">
          {{ messages.loadingCatalog }}
        </p>
        <p v-else-if="loadError" class="capability-manifest-generator__status capability-manifest-generator__status--error">
          {{ messages.loadFailed }}
          <span>{{ loadError }}</span>
        </p>
        <template v-else-if="selectedPreset">
        <div class="capability-manifest-generator__grid">
          <div ref="versionMenuRoot" class="capability-manifest-generator__field">
            <span>{{ messages.versionLabel }}</span>
            <div class="capability-manifest-generator__picker">
              <button
                type="button"
                class="capability-manifest-generator__picker-button"
                :class="{ 'is-open': versionMenuOpen }"
                :aria-expanded="versionMenuOpen ? 'true' : 'false'"
                :aria-haspopup="'menu'"
                :aria-label="messages.versionLabel"
                @click="toggleVersionMenu"
              >
                <span class="capability-manifest-generator__picker-value">{{ selectedPreset.version }}</span>
                <span class="capability-manifest-generator__picker-caption">{{ selectedPreset.title[currentLocale] }}</span>
                <span class="capability-manifest-generator__picker-icon" aria-hidden="true"></span>
              </button>
              <Transition name="capability-version-menu">
                <div v-if="versionMenuOpen" class="capability-manifest-generator__picker-menu" role="menu" :aria-label="messages.versionLabel">
                  <button
                    v-for="preset in versionPresets"
                    :key="preset.version"
                    type="button"
                    class="capability-manifest-generator__picker-option"
                    :class="{ 'is-active': preset.version === selectedVersion }"
                    role="menuitemradio"
                    :aria-checked="preset.version === selectedVersion ? 'true' : 'false'"
                    @click="selectVersion(preset.version)"
                  >
                    <span class="capability-manifest-generator__picker-option-title">{{ preset.version }}</span>
                    <span class="capability-manifest-generator__picker-option-subtitle">{{ preset.title[currentLocale] }}</span>
                    <span v-if="preset.version === selectedVersion" class="capability-manifest-generator__picker-option-state">{{ messages.selectedState }}</span>
                  </button>
                </div>
              </Transition>
            </div>
          </div>

          <label class="capability-manifest-generator__field">
            <span>{{ messages.implementationLabel }}</span>
            <input v-model="implementationName" type="text" :placeholder="messages.implementationPlaceholder">
          </label>
        </div>

        <div class="capability-manifest-generator__version-note">
          <strong>{{ selectedPreset.title[currentLocale] }}</strong>
          <p>{{ selectedPreset.note[currentLocale] }}</p>
          <p>
            <span>{{ messages.recommendedPath }}:</span>
            <code>{{ selectedPreset.recommendedPath }}</code>
          </p>
        </div>

        <label class="capability-manifest-generator__toggle">
          <input v-model="includeSchema" type="checkbox">
          <span>{{ messages.schemaToggle }}</span>
        </label>

        <label v-if="includeSchema" class="capability-manifest-generator__field">
          <span>{{ messages.schemaLabel }}</span>
          <input v-model="schemaPath" type="text">
          <small>{{ messages.schemaHelper }}</small>
        </label>

        <div class="capability-manifest-generator__toolbar">
          <label class="capability-manifest-generator__field capability-manifest-generator__field--search">
            <span>{{ messages.searchLabel }}</span>
            <input v-model="filterText" type="search" :placeholder="messages.searchPlaceholder">
          </label>

          <div class="capability-manifest-generator__actions">
            <button type="button" @click="selectAll">{{ messages.selectAll }}</button>
            <button type="button" @click="selectMandatory">{{ messages.selectMandatory }}</button>
            <button type="button" @click="clearSelection">{{ messages.clear }}</button>
          </div>
        </div>

        <div class="capability-manifest-generator__section-head">
          <h3>{{ messages.capabilitiesHeading }}</h3>
          <span>{{ selectedCountText }}</span>
        </div>

        <div v-if="filteredCapabilities.length" class="capability-manifest-generator__capabilities">
          <label
            v-for="capability in filteredCapabilities"
            :key="capability.token"
            class="capability-manifest-generator__capability"
            :class="{ 'is-selected': isTokenSelected(capability.token) }"
          >
            <input
              :checked="isTokenSelected(capability.token)"
              type="checkbox"
              @change="toggleToken(capability.token)"
            >
            <div>
              <div class="capability-manifest-generator__capability-head">
                <strong>{{ capability.token }}</strong>
                <span>{{ capability.layers }}</span>
              </div>
              <p>{{ capability.description[currentLocale] }}</p>
              <div class="capability-manifest-generator__meta">
                <span class="capability-manifest-generator__badge">{{ categoryLabels(capability) }}</span>
                <span v-if="capability.combination">{{ messages.combinationLabel }}: {{ capability.combination[currentLocale] }}</span>
              </div>
            </div>
          </label>
        </div>
        <p v-else class="capability-manifest-generator__empty">{{ messages.emptyState }}</p>
        </template>
      </div>

      <aside class="capability-manifest-generator__panel capability-manifest-generator__panel--preview">
        <div class="capability-manifest-generator__section-head capability-manifest-generator__section-head--preview">
          <h3>{{ messages.previewHeading }}</h3>
          <div class="capability-manifest-generator__actions capability-manifest-generator__actions--preview">
            <button type="button" class="capability-manifest-generator__copy" :disabled="!selectedPreset" @click="copyJson">
              {{ copyState === "copied" ? messages.copied : copyState === "failed" ? messages.copyFailed : messages.copy }}
            </button>
            <button type="button" class="capability-manifest-generator__copy" :disabled="!selectedPreset" @click="copyShareLink">
              {{ shareState === "copied" ? messages.shareCopied : shareState === "failed" ? messages.shareFailed : messages.share }}
            </button>
            <button type="button" class="capability-manifest-generator__copy" :disabled="!selectedPreset" @click="downloadJson">
              {{ messages.download }}
            </button>
          </div>
        </div>

        <pre class="capability-manifest-generator__code"><code>{{ manifestJson }}</code></pre>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.capability-manifest-generator {
  display: grid;
  gap: 20px;
  margin: 24px 0 32px;
}

.capability-manifest-generator__hero {
  display: grid;
  gap: 14px;
  padding: 22px 24px;
  border: 1px solid rgba(19, 68, 84, 0.16);
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(10, 58, 66, 0.07), rgba(196, 96, 38, 0.09));
}

.capability-manifest-generator__hero h2 {
  margin: 0 0 8px;
  font-size: 26px;
}

.capability-manifest-generator__hero p,
.capability-manifest-generator__version-note p,
.capability-manifest-generator__capability p,
.capability-manifest-generator__helper,
.capability-manifest-generator__empty {
  margin: 0;
  color: var(--vp-c-text-2);
}

.capability-manifest-generator__layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.capability-manifest-generator__panel {
  display: grid;
  gap: 16px;
  min-width: 0;
  padding: 20px;
  border: 1px solid rgba(19, 68, 84, 0.16);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
}

.capability-manifest-generator__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.capability-manifest-generator__field {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.capability-manifest-generator__field span,
.capability-manifest-generator__toggle span {
  font-size: 13px;
  font-weight: 700;
}

.capability-manifest-generator__field input {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 12px;
  border: 1px solid rgba(19, 68, 84, 0.18);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.capability-manifest-generator__picker {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid rgba(19, 68, 84, 0.18);
  border-radius: 12px;
  background:
    linear-gradient(135deg, rgba(10, 58, 66, 0.05), rgba(196, 96, 38, 0.08)),
    var(--vp-c-bg-soft);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.capability-manifest-generator__picker:hover {
  border-color: rgba(19, 68, 84, 0.28);
  transform: translateY(-1px);
}

.capability-manifest-generator__picker:focus-within,
.capability-manifest-generator__picker-button.is-open {
  border-color: rgba(15, 118, 110, 0.45);
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14), 0 10px 24px rgba(15, 23, 42, 0.08);
}

.capability-manifest-generator__picker-button {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2px;
  width: 100%;
  padding: 10px 40px 10px 14px;
  border: 0;
  background: transparent;
  color: var(--vp-c-text-1);
  font-size: 13px;
  line-height: 1.2;
  cursor: pointer;
  text-align: left;
}

.capability-manifest-generator__picker-button:focus {
  outline: none;
}

.capability-manifest-generator__picker-value {
  font-size: 14px;
  font-weight: 700;
}

.capability-manifest-generator__picker-caption {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.capability-manifest-generator__picker-icon {
  position: absolute;
  right: 14px;
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--vp-c-text-2);
  border-bottom: 2px solid var(--vp-c-text-2);
  transform: translateY(-1px) rotate(45deg);
  pointer-events: none;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.capability-manifest-generator__picker-button.is-open .capability-manifest-generator__picker-icon {
  transform: translateY(1px) rotate(225deg);
  border-color: #0f766e;
}

.capability-manifest-generator__picker-menu {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: 0;
  z-index: 20;
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid rgba(19, 68, 84, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(14px);
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.16);
}

.capability-manifest-generator__picker-option {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 12px;
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: var(--vp-c-text-1);
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.capability-manifest-generator__picker-option:hover {
  transform: translateY(-1px);
  border-color: rgba(15, 118, 110, 0.22);
  background: linear-gradient(135deg, rgba(10, 58, 66, 0.06), rgba(196, 96, 38, 0.08));
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}

.capability-manifest-generator__picker-option.is-active {
  border-color: rgba(15, 118, 110, 0.26);
  background: linear-gradient(135deg, rgba(10, 58, 66, 0.08), rgba(196, 96, 38, 0.12));
}

.capability-manifest-generator__picker-option-title {
  font-size: 14px;
  font-weight: 700;
}

.capability-manifest-generator__picker-option-subtitle {
  grid-column: 1;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.capability-manifest-generator__picker-option-state {
  align-self: start;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.12);
  color: #0f766e;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.capability-version-menu-enter-active,
.capability-version-menu-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.capability-version-menu-enter-from,
.capability-version-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.capability-manifest-generator__field small {
  color: var(--vp-c-text-3);
}

.capability-manifest-generator__version-note {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(10, 58, 66, 0.05), rgba(196, 96, 38, 0.07));
}

.capability-manifest-generator__version-note strong {
  font-size: 15px;
}

.capability-manifest-generator__version-note code {
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.05);
}

.capability-manifest-generator__toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}

.capability-manifest-generator__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: end;
}

.capability-manifest-generator__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.capability-manifest-generator__actions button,
.capability-manifest-generator__copy {
  padding: 10px 14px;
  border: 1px solid rgba(15, 118, 110, 0.22);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(10, 58, 66, 0.08), rgba(196, 96, 38, 0.12));
  color: var(--vp-c-text-1);
  font-weight: 700;
  cursor: pointer;
}

.capability-manifest-generator__actions button:disabled,
.capability-manifest-generator__copy:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.capability-manifest-generator__status {
  margin: 0;
  padding: 14px 16px;
  border: 1px solid rgba(19, 68, 84, 0.16);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(10, 58, 66, 0.05), rgba(196, 96, 38, 0.07));
  color: var(--vp-c-text-2);
}

.capability-manifest-generator__status span {
  display: block;
  margin-top: 6px;
  word-break: break-word;
}

.capability-manifest-generator__status--error {
  border-color: rgba(190, 24, 93, 0.24);
  background: linear-gradient(135deg, rgba(190, 24, 93, 0.06), rgba(196, 96, 38, 0.08));
}

.capability-manifest-generator__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.capability-manifest-generator__section-head h3 {
  margin: 0;
  font-size: 18px;
}

.capability-manifest-generator__section-head span {
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.capability-manifest-generator__capabilities {
  display: grid;
  gap: 10px;
}

.capability-manifest-generator__capability {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(19, 68, 84, 0.16);
  border-radius: 16px;
  background: var(--vp-c-bg-soft);
  cursor: pointer;
}

.capability-manifest-generator__capability.is-selected {
  border-color: rgba(15, 118, 110, 0.28);
  background: linear-gradient(135deg, rgba(10, 58, 66, 0.07), rgba(196, 96, 38, 0.1));
}

.capability-manifest-generator__capability input {
  margin-top: 3px;
}

.capability-manifest-generator__capability-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: baseline;
  margin-bottom: 6px;
}

.capability-manifest-generator__capability-head span {
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 700;
}

.capability-manifest-generator__meta {
  display: grid;
  gap: 6px;
  margin-top: 10px;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.capability-manifest-generator__badge {
  width: fit-content;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.11);
  color: #0f766e;
  font-weight: 700;
}

.capability-manifest-generator__section-head--preview {
  align-items: flex-start;
}

.capability-manifest-generator__code {
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

.capability-manifest-generator__actions--preview {
  justify-content: flex-start;
}

@media (max-width: 720px) {
  .capability-manifest-generator__grid,
  .capability-manifest-generator__toolbar {
    grid-template-columns: 1fr;
  }

  .capability-manifest-generator__hero,
  .capability-manifest-generator__panel {
    padding: 16px;
  }

  .capability-manifest-generator__section-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>