<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData, useRoute, useRouter, withBase } from "vitepress";

const props = defineProps<{
  placement?: "header" | "screen-menu";
}>();

type LocaleMessage = {
  label: string;
  buttonPrefix: string;
  menuLabel: string;
  selectedLabel: string;
  quickStartSuffix: string;
};

type SDKLanguage = {
  value: string;
  label: string;
};

const SDK_LANGUAGE_STORAGE_KEY = "nnrp-sdk-language";
const sdkLanguages: SDKLanguage[] = [
  { value: "python", label: "Python" },
  { value: "csharp", label: "C#" },
  { value: "rust", label: "Rust" }
];
const localeMessages: Record<string, LocaleMessage> = {
  root: {
    label: "SDK Language",
    buttonPrefix: "Current",
    menuLabel: "Select SDK language",
    selectedLabel: "Selected",
    quickStartSuffix: "Quick Start"
  },
  en: {
    label: "SDK Language",
    buttonPrefix: "Current",
    menuLabel: "Select SDK language",
    selectedLabel: "Selected",
    quickStartSuffix: "Quick Start"
  },
  zh: {
    label: "SDK 语言",
    buttonPrefix: "当前",
    menuLabel: "选择 SDK 语言",
    selectedLabel: "已选择",
    quickStartSuffix: "快速使用"
  }
};

const route = useRoute();
const router = useRouter();
const { localeIndex, site } = useData();
const rootElement = ref<HTMLElement | null>(null);
const menuOpen = ref(false);
const selectedLanguage = ref(sdkLanguages[0].value);

// Strip the site base from route.path. When deployed to a sub-path (e.g. /nnrp-doc/),
// VitePress includes the base in route.path; we need the clean path for logic
// and then re-apply withBase only at navigation time.
const siteBase = computed(() => {
  const b = site.value.base || "/";
  return b === "/" ? "" : b.endsWith("/") ? b.slice(0, -1) : b;
});

const path = computed(() => {
  const raw = route.path ?? "";
  const base = siteBase.value;
  if (base && raw.startsWith(base)) {
    return raw.slice(base.length) || "/";
  }
  return raw;
});
const isSdkPath = computed(() => path.value.includes("/sdk/"));
const placementClass = computed(() => `sdk-language-switch--${props.placement ?? "header"}`);
const messages = computed(() => localeMessages[localeIndex.value] ?? localeMessages.root);
const currentLanguageLabel = computed(() => {
  return sdkLanguages.find((language) => language.value === selectedLanguage.value)?.label ?? sdkLanguages[0].label;
});
const localeBase = computed(() => {
  const localeLink = site.value.locales?.[localeIndex.value]?.link;

  if (typeof localeLink === "string" && localeLink.length > 0) {
    return localeLink.replace(/\/$/, "");
  }

  return localeIndex.value === "root" ? "" : `/${localeIndex.value}`;
});

function readStoredLanguage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedLanguage = window.localStorage.getItem(SDK_LANGUAGE_STORAGE_KEY);
  return sdkLanguages.some((language) => language.value === storedLanguage) ? storedLanguage : null;
}

function writeStoredLanguage(language: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SDK_LANGUAGE_STORAGE_KEY, language);
}

function resolveLanguageFromPath(currentPath: string): string | null {
  const matchedLanguage = sdkLanguages.find((language) => currentPath.includes(`/sdk/${language.value}/`));
  return matchedLanguage?.value ?? null;
}

function syncSelectedLanguage(currentPath: string): void {
  const languageFromPath = resolveLanguageFromPath(currentPath);

  if (languageFromPath) {
    selectedLanguage.value = languageFromPath;
    writeStoredLanguage(languageFromPath);
    return;
  }

  selectedLanguage.value = readStoredLanguage() ?? sdkLanguages[0].value;
}

function buildLanguageTarget(currentPath: string, language: string): string | null {
  if (!currentPath.includes("/sdk/")) {
    return null;
  }

  // Always navigate to the language overview when switching languages.
  // Attempting to preserve the current sub-path can 404 when the equivalent
  // page does not exist in the target language.
  return `${localeBase.value}/sdk/${language}/`;
}

function redirectToScopedSdkPath(currentPath: string): void {
  if (!currentPath.includes("/sdk/") || resolveLanguageFromPath(currentPath)) {
    return;
  }

  const redirectTarget = buildLanguageTarget(currentPath, selectedLanguage.value);

  if (!redirectTarget || redirectTarget === currentPath) {
    return;
  }

  router.go(withBase(redirectTarget));
}

function closeMenu(): void {
  menuOpen.value = false;
}

function toggleMenu(): void {
  menuOpen.value = !menuOpen.value;
}

function selectLanguage(language: string): void {
  if (!sdkLanguages.some((item) => item.value === language)) {
    return;
  }

  selectedLanguage.value = language;
  writeStoredLanguage(language);
  closeMenu();

  const targetPath = buildLanguageTarget(path.value, language);

  if (!targetPath || targetPath === path.value) {
    return;
  }

  router.go(withBase(targetPath));
}

function handleDocumentClick(event: MouseEvent): void {
  if (!rootElement.value) {
    return;
  }

  const clickTarget = event.target;

  if (clickTarget instanceof Node && !rootElement.value.contains(clickTarget)) {
    closeMenu();
  }
}

function handleDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    closeMenu();
  }
}

onMounted(() => {
  syncSelectedLanguage(path.value);
  redirectToScopedSdkPath(path.value);
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleDocumentKeydown);
});

watch(
  () => path.value,
  (currentPath) => {
    if (!currentPath.includes("/sdk/")) {
      return;
    }

    syncSelectedLanguage(currentPath);
    redirectToScopedSdkPath(currentPath);
  }
);
</script>

<template>
  <div v-if="isSdkPath" ref="rootElement" class="sdk-language-switch" :class="placementClass">
    <label class="sdk-language-switch__label" for="sdk-language-select">{{ messages.label }}</label>
    <div class="sdk-language-switch__control">
      <button
        id="sdk-language-select"
        type="button"
        class="sdk-language-switch__button"
        :class="{ 'is-open': menuOpen }"
        :aria-expanded="menuOpen ? 'true' : 'false'"
        :aria-haspopup="'menu'"
        :aria-label="messages.menuLabel"
        @click="toggleMenu"
      >
        <span class="sdk-language-switch__button-prefix">{{ messages.buttonPrefix }}</span>
        <span class="sdk-language-switch__button-value">{{ currentLanguageLabel }}</span>
        <span class="sdk-language-switch__icon" aria-hidden="true"></span>
      </button>
      <Transition name="sdk-language-menu">
        <div v-if="menuOpen" class="sdk-language-switch__menu" role="menu" :aria-label="messages.menuLabel">
          <button
            v-for="language in sdkLanguages"
            :key="language.value"
            type="button"
            class="sdk-language-switch__option"
            :class="{ 'is-active': language.value === selectedLanguage }"
            role="menuitemradio"
            :aria-checked="language.value === selectedLanguage ? 'true' : 'false'"
            @click="selectLanguage(language.value)"
          >
            <span class="sdk-language-switch__option-title">{{ language.label }}</span>
            <span class="sdk-language-switch__option-subtitle">{{ language.label }} {{ messages.quickStartSuffix }}</span>
            <span v-if="language.value === selectedLanguage" class="sdk-language-switch__option-state">{{ messages.selectedLabel }}</span>
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>