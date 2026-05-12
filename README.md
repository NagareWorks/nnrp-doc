# nnrp-doc

Documentation site for NNRP, built with VitePress and driven by Deno tasks.

## Goals

1. Publish NNRP documentation as a GitHub Pages site.
2. Keep user-facing protocol pages separate from repository-developer design documents.
3. Render all content from Markdown.
4. Support i18n from the beginning.
5. Use a Vue-related static-site stack without depending on a Node.js workflow for local commands.

## Structure

- `docs/`: site content.
- `docs/.vitepress/`: VitePress config.
- `docs/.vitepress/theme/`: shared theme CSS for version switch cards and packet diagrams.
- `docs/users/`: user-facing documentation.
- `docs/developers/`: repository-developer documentation and design docs.
- `docs/en/`: English counterparts for the same page tree.
- `.github/workflows/`: GitHub Pages deployment workflow.

## Commands

```powershell
deno task dev
deno task build
deno task preview
```

`deno task dev` 会先重建 `docs/.vitepress/cache`，并确保 `docs/.vitepress/dist` 存在，避免在切换自定义主题结构后留下陈旧缓存，同时避免 Deno watcher 因目标目录不存在而崩溃。

`deno task build` 不再自动删除 `.vitepress` 下的任何目录，避免在另一个终端开着 `deno task dev` 时触发 Deno/VitePress 的文件监视器崩溃。

如果你明确需要手动清理缓存，请单独运行：

```powershell
deno task clean-cache
```

## GitHub Pages

The site is configured with base path `/nnrp-doc/`, assuming the repository name stays `nnrp-doc`.
