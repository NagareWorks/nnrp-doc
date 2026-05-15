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

`deno task dev` rebuilds `docs/.vitepress/cache` first and makes sure `docs/.vitepress/dist` exists. This avoids stale cache artifacts after theme structure changes and prevents the Deno watcher from failing when the target directory is missing.

`deno task build` does not delete any `.vitepress` directories automatically. This avoids crashing the Deno/VitePress file watcher when `deno task dev` is running in another terminal.

If you explicitly need to clear the cache, run:

```powershell
deno task clean-cache
```

## GitHub Pages

The site is configured with base path `/nnrp-doc/`, assuming the repository name stays `nnrp-doc`.

## License

This repository is released under the Apache License 2.0. See `LICENSE` for details.

