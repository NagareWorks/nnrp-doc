import { h } from "vue";
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import SDKLanguageSwitch from "./components/SDKLanguageSwitch.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      "nav-bar-content-after": () => h(SDKLanguageSwitch),
      "nav-screen-content-after": () => h(SDKLanguageSwitch)
    });
  }
} satisfies Theme;