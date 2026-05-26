---
layout: home
head:
  - - script
    - {}
    - |
      (() => {
        const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
        const isChinese = languages.some((language) => /^zh\b/i.test(language || ""));
        window.location.replace(new URL(isChinese ? "zh/" : "en/", window.location.href));
      })();
---

<noscript>
  <div class="language-fallback">
    <a class="landing-action primary" href="zh/">简体中文</a>
    <a class="landing-action" href="en/">English</a>
  </div>
</noscript>
