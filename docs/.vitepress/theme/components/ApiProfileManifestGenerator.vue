<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useData } from "vitepress";
import {
  apiProfileCapabilityManifestSchemaPath,
  type ApiProfilePreset,
  type SupportedLocale
} from "./capabilityManifestShared";

type PresetDocument = {
  generated_at: string;
  source: string;
  api_profiles?: ApiProfilePreset[];
};

type Messages = {
  title: string;
  subtitle: string;
  adapterLabel: string;
  adapterPlaceholder: string;
  schemaToggle: string;
  schemaLabel: string;
  profileLabel: string;
  recommendedPath: string;
  operationHeading: string;
  recipesHeading: string;
  previewHeading: string;
  copy: string;
  copied: string;
  copyFailed: string;
  download: string;
  include: string;
  streaming: string;
  nonStreaming: string;
  toolCalls: string;
  cancellation: string;
  extensionsLabel: string;
  extensionsPlaceholder: string;
  loadingCatalog: string;
  loadFailed: string;
  noProfiles: string;
};

const localeMessages: Record<SupportedLocale, Messages> = {
  zh: {
    title: "OpenAI API Profile 能力声明生成器",
    subtitle: "生成 adapter 侧声明，用于 OpenAI-compatible NNRP API profile 的声明式 recipe 与执行计划选择。",
    adapterLabel: "adapter",
    adapterPlaceholder: "例如 vllm-nnrp-adapter、acme-openai-nnrp",
    schemaToggle: "包含可选 $schema 字段",
    schemaLabel: "$schema 路径",
    profileLabel: "API profile",
    recommendedPath: "推荐文件路径",
    operationHeading: "Operation 声明",
    recipesHeading: "Recipe 覆盖",
    previewHeading: "生成结果",
    copy: "复制 JSON",
    copied: "已复制",
    copyFailed: "复制失败，请手动复制",
    download: "下载文件",
    include: "启用",
    streaming: "streaming",
    nonStreaming: "non_streaming",
    toolCalls: "tool_calls",
    cancellation: "cancellation",
    extensionsLabel: "extensions",
    extensionsPlaceholder: "每行一个扩展名；默认 critical=false",
    loadingCatalog: "正在读取 API profile baseline...",
    loadFailed: "读取 API profile baseline 失败。请刷新页面或检查构建产物。",
    noProfiles: "当前构建没有导出 API profile baseline。"
  },
  en: {
    title: "OpenAI API Profile Capability Generator",
    subtitle: "Generate the adapter-owned declaration used to select declarative recipes for the OpenAI-compatible NNRP API profile.",
    adapterLabel: "adapter",
    adapterPlaceholder: "For example vllm-nnrp-adapter or acme-openai-nnrp",
    schemaToggle: "Include the optional $schema field",
    schemaLabel: "$schema path",
    profileLabel: "API profile",
    recommendedPath: "Recommended file path",
    operationHeading: "Operation Declaration",
    recipesHeading: "Recipe Coverage",
    previewHeading: "Generated Output",
    copy: "Copy JSON",
    copied: "Copied",
    copyFailed: "Copy failed, please copy manually",
    download: "Download file",
    include: "Enabled",
    streaming: "streaming",
    nonStreaming: "non_streaming",
    toolCalls: "tool_calls",
    cancellation: "cancellation",
    extensionsLabel: "extensions",
    extensionsPlaceholder: "One extension name per line; defaults to critical=false",
    loadingCatalog: "Loading API profile baseline...",
    loadFailed: "Failed to load the API profile baseline. Refresh the page or verify the build artifact.",
    noProfiles: "This build did not export an API profile baseline."
  }
};

const { localeIndex, site } = useData();

const currentLocale = computed<SupportedLocale>(() => (localeIndex.value === "zh" ? "zh" : "en"));
const messages = computed(() => localeMessages[currentLocale.value]);

const profilePresets = ref<ApiProfilePreset[]>([]);
const selectedProfileKey = ref("");
const adapterName = ref("");
const includeSchema = ref(true);
const schemaPath = ref(apiProfileCapabilityManifestSchemaPath);
const extensionText = ref("");
const enabledOperations = ref<Record<string, boolean>>({});
const operationFlags = ref<Record<string, {
  streaming: boolean;
  nonStreaming: boolean;
  toolCalls: boolean;
  cancellation: boolean;
}>>({});
const copyState = ref<"idle" | "copied" | "failed">("idle");
const isLoadingCatalog = ref(true);
const loadError = ref("");

const selectedPreset = computed(() =>
  profilePresets.value.find((preset) => `${preset.profile}/${preset.level}` === selectedProfileKey.value) ??
    profilePresets.value[0] ??
    null
);

const selectedOperations = computed(() => {
  const preset = selectedPreset.value;
  if (!preset) {
    return [];
  }

  return preset.operations
    .filter((operation) => enabledOperations.value[operation.name])
    .map((operation) => {
      const flags = operationFlags.value[operation.name] ?? operation;
      return {
        name: operation.name,
        streaming: flags.streaming,
        non_streaming: flags.nonStreaming,
        tool_calls: flags.toolCalls,
        cancellation: flags.cancellation
      };
    });
});

const extensionEntries = computed(() =>
  extensionText.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((name) => ({ name, critical: false }))
);

const manifestJson = computed(() => {
  const preset = selectedPreset.value;
  const manifest: Record<string, unknown> = {
    adapter: adapterName.value.trim(),
    profile: preset?.profile ?? "",
    schema_version: preset?.schemaVersion ?? "",
    compatibility_levels: preset ? [preset.level] : [],
    operations: selectedOperations.value,
    extensions: extensionEntries.value
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

function hydratePresetDefaults(preset: ApiProfilePreset): void {
  selectedProfileKey.value = `${preset.profile}/${preset.level}`;
  enabledOperations.value = Object.fromEntries(preset.operations.map((operation) => [operation.name, true]));
  operationFlags.value = Object.fromEntries(
    preset.operations.map((operation) => [
      operation.name,
      {
        streaming: operation.streaming,
        nonStreaming: operation.nonStreaming,
        toolCalls: operation.toolCalls,
        cancellation: operation.cancellation
      }
    ])
  );
}

async function loadApiProfilePresets(): Promise<void> {
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
    profilePresets.value = document.api_profiles ?? [];
    if (profilePresets.value[0]) {
      hydratePresetDefaults(profilePresets.value[0]);
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error);
  } finally {
    isLoadingCatalog.value = false;
  }
}

function setOperationEnabled(name: string, value: boolean): void {
  enabledOperations.value = { ...enabledOperations.value, [name]: value };
}

function setOperationFlag(
  name: string,
  flag: "streaming" | "nonStreaming" | "toolCalls" | "cancellation",
  value: boolean
): void {
  operationFlags.value = {
    ...operationFlags.value,
    [name]: {
      ...operationFlags.value[name],
      [flag]: value
    }
  };
}

async function copyJson(): Promise<void> {
  try {
    await navigator.clipboard.writeText(manifestJson.value);
    copyState.value = "copied";
  } catch {
    copyState.value = "failed";
  }
}

function sanitizeFileNamePart(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function downloadJson(): void {
  if (typeof window === "undefined" || !selectedPreset.value) {
    return;
  }

  const adapterPart = sanitizeFileNamePart(adapterName.value) || "api-profile-capabilities";
  const profilePart = sanitizeFileNamePart(`${selectedPreset.value.profile}-${selectedPreset.value.level}`);
  const fileName = `${adapterPart}-${profilePart}.json`;
  const blob = new Blob([manifestJson.value + "\n"], { type: "application/json;charset=utf-8" });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(objectUrl);
}

onMounted(loadApiProfilePresets);
</script>

<template>
  <section class="api-profile-generator">
    <header class="api-profile-generator__hero">
      <div>
        <h2>{{ messages.title }}</h2>
        <p>{{ messages.subtitle }}</p>
      </div>
    </header>

    <div class="api-profile-generator__layout">
      <div class="api-profile-generator__panel">
        <p v-if="isLoadingCatalog" class="api-profile-generator__status">
          {{ messages.loadingCatalog }}
        </p>
        <p v-else-if="loadError" class="api-profile-generator__status api-profile-generator__status--error">
          {{ messages.loadFailed }}
          <span>{{ loadError }}</span>
        </p>
        <p v-else-if="profilePresets.length === 0" class="api-profile-generator__status">
          {{ messages.noProfiles }}
        </p>

        <template v-else-if="selectedPreset">
          <div class="api-profile-generator__grid">
            <label class="api-profile-generator__field">
              <span>{{ messages.profileLabel }}</span>
              <select v-model="selectedProfileKey">
                <option
                  v-for="preset in profilePresets"
                  :key="`${preset.profile}/${preset.level}`"
                  :value="`${preset.profile}/${preset.level}`"
                >
                  {{ preset.title[currentLocale] }}
                </option>
              </select>
            </label>

            <label class="api-profile-generator__field">
              <span>{{ messages.adapterLabel }}</span>
              <input v-model="adapterName" type="text" :placeholder="messages.adapterPlaceholder">
            </label>
          </div>

          <div class="api-profile-generator__note">
            <strong>{{ selectedPreset.title[currentLocale] }}</strong>
            <p>{{ selectedPreset.note[currentLocale] }}</p>
            <p>
              <span>{{ messages.recommendedPath }}:</span>
              <code>{{ selectedPreset.recommendedPath }}</code>
            </p>
          </div>

          <label class="api-profile-generator__toggle">
            <input v-model="includeSchema" type="checkbox">
            <span>{{ messages.schemaToggle }}</span>
          </label>

          <label v-if="includeSchema" class="api-profile-generator__field">
            <span>{{ messages.schemaLabel }}</span>
            <input v-model="schemaPath" type="text">
          </label>

          <div class="api-profile-generator__section-head">
            <h3>{{ messages.operationHeading }}</h3>
          </div>

          <div class="api-profile-generator__operations">
            <div
              v-for="operation in selectedPreset.operations"
              :key="operation.name"
              class="api-profile-generator__operation"
            >
              <label class="api-profile-generator__operation-title">
                <input
                  :checked="enabledOperations[operation.name]"
                  type="checkbox"
                  @change="setOperationEnabled(operation.name, ($event.target as HTMLInputElement).checked)"
                >
                <strong>{{ operation.name }}</strong>
                <span>{{ messages.include }}</span>
              </label>

              <div class="api-profile-generator__flags">
                <label>
                  <input
                    :checked="operationFlags[operation.name]?.streaming"
                    type="checkbox"
                    @change="setOperationFlag(operation.name, 'streaming', ($event.target as HTMLInputElement).checked)"
                  >
                  <span>{{ messages.streaming }}</span>
                </label>
                <label>
                  <input
                    :checked="operationFlags[operation.name]?.nonStreaming"
                    type="checkbox"
                    @change="setOperationFlag(operation.name, 'nonStreaming', ($event.target as HTMLInputElement).checked)"
                  >
                  <span>{{ messages.nonStreaming }}</span>
                </label>
                <label>
                  <input
                    :checked="operationFlags[operation.name]?.toolCalls"
                    type="checkbox"
                    @change="setOperationFlag(operation.name, 'toolCalls', ($event.target as HTMLInputElement).checked)"
                  >
                  <span>{{ messages.toolCalls }}</span>
                </label>
                <label>
                  <input
                    :checked="operationFlags[operation.name]?.cancellation"
                    type="checkbox"
                    @change="setOperationFlag(operation.name, 'cancellation', ($event.target as HTMLInputElement).checked)"
                  >
                  <span>{{ messages.cancellation }}</span>
                </label>
              </div>
            </div>
          </div>

          <label class="api-profile-generator__field">
            <span>{{ messages.extensionsLabel }}</span>
            <textarea v-model="extensionText" rows="3" :placeholder="messages.extensionsPlaceholder"></textarea>
          </label>

          <div class="api-profile-generator__section-head">
            <h3>{{ messages.recipesHeading }}</h3>
          </div>

          <div class="api-profile-generator__recipes">
            <div v-for="recipe in selectedPreset.recipes" :key="recipe.id" class="api-profile-generator__recipe">
              <strong>{{ recipe.id }}</strong>
              <p>{{ recipe.summary[currentLocale] }}</p>
              <code>{{ recipe.requiredCapabilities.join(", ") }}</code>
            </div>
          </div>
        </template>
      </div>

      <aside class="api-profile-generator__panel api-profile-generator__panel--preview">
        <div class="api-profile-generator__section-head api-profile-generator__section-head--preview">
          <h3>{{ messages.previewHeading }}</h3>
          <div class="api-profile-generator__actions">
            <button type="button" :disabled="!selectedPreset" @click="copyJson">
              {{ copyState === "copied" ? messages.copied : copyState === "failed" ? messages.copyFailed : messages.copy }}
            </button>
            <button type="button" :disabled="!selectedPreset" @click="downloadJson">
              {{ messages.download }}
            </button>
          </div>
        </div>

        <pre class="api-profile-generator__code"><code>{{ manifestJson }}</code></pre>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.api-profile-generator {
  display: grid;
  gap: 20px;
  margin: 24px 0 32px;
}

.api-profile-generator__hero,
.api-profile-generator__panel {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--nnrp-border);
  border-radius: 20px;
  background: var(--nnrp-elevated-bg);
  box-shadow: var(--nnrp-shadow);
}

.api-profile-generator__hero {
  background: var(--nnrp-surface);
}

.api-profile-generator__hero h2,
.api-profile-generator__section-head h3 {
  margin: 0;
}

.api-profile-generator__hero p,
.api-profile-generator__note p,
.api-profile-generator__recipe p,
.api-profile-generator__status {
  margin: 0;
  color: var(--vp-c-text-2);
}

.api-profile-generator__layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.api-profile-generator__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.api-profile-generator__field {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.api-profile-generator__field span,
.api-profile-generator__toggle span {
  font-size: 13px;
  font-weight: 700;
}

.api-profile-generator__field input,
.api-profile-generator__field select,
.api-profile-generator__field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 12px;
  border: 1px solid var(--nnrp-border);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.api-profile-generator__note,
.api-profile-generator__operation,
.api-profile-generator__recipe,
.api-profile-generator__status {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid var(--nnrp-border);
  border-radius: 16px;
  background: var(--nnrp-surface);
}

.api-profile-generator__status--error {
  border-color: rgba(190, 24, 93, 0.24);
  background: linear-gradient(135deg, rgba(190, 24, 93, 0.12), rgba(196, 96, 38, 0.1));
}

.api-profile-generator__status span {
  display: block;
  margin-top: 6px;
}

.api-profile-generator__note code,
.api-profile-generator__recipe code {
  width: fit-content;
  padding: 2px 6px;
  border-radius: 8px;
  background: var(--nnrp-soft-bg);
}

.api-profile-generator__toggle,
.api-profile-generator__operation-title,
.api-profile-generator__flags label {
  display: flex;
  align-items: center;
  gap: 10px;
}

.api-profile-generator__operation-title span {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.api-profile-generator__flags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.api-profile-generator__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.api-profile-generator__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.api-profile-generator__actions button {
  padding: 10px 14px;
  border: 1px solid var(--nnrp-border-strong);
  border-radius: 999px;
  background: var(--nnrp-surface);
  color: var(--vp-c-text-1);
  font-weight: 700;
  cursor: pointer;
}

.api-profile-generator__actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.api-profile-generator__operations,
.api-profile-generator__recipes {
  display: grid;
  gap: 10px;
}

.api-profile-generator__code {
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

@media (max-width: 720px) {
  .api-profile-generator__grid {
    grid-template-columns: 1fr;
  }

  .api-profile-generator__hero,
  .api-profile-generator__panel {
    padding: 16px;
  }

  .api-profile-generator__section-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
