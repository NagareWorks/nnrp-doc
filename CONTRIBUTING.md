# Contributing to nnrp-doc

This repository publishes the NNRP documentation site, so contribution flow needs to keep the published docs stable while still allowing preview work to move quickly.

## Branch Strategy

`master` is the stable branch for published or publish-ready documentation.

This repository normally stays single-branch unless a preview line needs coordinated documentation integration. If a multi-repository preview needs a shared integration branch, use `develop` for active preview documentation and cut `release/<version>` only when the documentation is ready to freeze with the SDK and conformance work.

Use short-lived topic branches for day-to-day work:

- `docs/<scope>-<topic>` for documentation-only changes
- `feature/<scope>-<topic>` for site or tooling capabilities
- `fix/<scope>-<topic>` for documentation, site, or tooling fixes
- `chore/<scope>-<topic>` for maintenance and dependency updates

Rules:

- Branch from `master` while the repository remains single-branch.
- Branch from `develop` when a preview documentation integration branch exists.
- Keep topic branches focused on one slice of work.
- Do not treat `release/<version>` as an integration branch; it is only for frozen release-candidate documentation.
- Delete release branches after publication unless an explicitly maintained docs line needs to stay open.

## Validation Expectations

Before opening or merging a PR, run:

```powershell
deno task build
```

If the build regenerates capability preset timestamps without semantic changes, do not include that generated timestamp noise in the documentation commit.
