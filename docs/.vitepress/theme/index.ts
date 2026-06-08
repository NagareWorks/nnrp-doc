import { h } from "vue";
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import ApiProfileManifestGenerator from "./components/ApiProfileManifestGenerator.vue";
import CapabilityManifestGenerator from "./components/CapabilityManifestGenerator.vue";
import SDKLanguageSwitch from "./components/SDKLanguageSwitch.vue";
import WireConformanceManifestGenerator from "./components/WireConformanceManifestGenerator.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("ApiProfileManifestGenerator", ApiProfileManifestGenerator);
    app.component("CapabilityManifestGenerator", CapabilityManifestGenerator);
    app.component("WireConformanceManifestGenerator", WireConformanceManifestGenerator);
  },
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      "nav-bar-content-after": () => h(SDKLanguageSwitch, { placement: "header" }),
      "nav-screen-content-after": () => h(SDKLanguageSwitch, { placement: "screen-menu" }),
    });
  },
} satisfies Theme;
