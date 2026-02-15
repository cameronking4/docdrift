# How Docdrift Works

Detection, gating, core flow, and why it stays low-noise.

## Why this is low-noise

- **Single session, single PR** — One Devin session handles the whole docsite (API reference + guides).
- **Gate on API spec diff** — We only run when spec drift is detected (strict mode); no session for docs-check-only failures.
- **requireHumanReview** — When the PR touches guides/prose, we open an issue after the PR to direct attention.
- **7-day SLA** — If a doc-drift PR is open 7+ days, we open a reminder issue (configurable `slaDays`; use `sla-check` CLI or cron workflow).
- Confidence gating and allowlist/exclude enforcement.
- Idempotency key prevents duplicate actions for same repo/SHAs/action.

## Detection and gate

- **Gate:** We only run a Devin session when **spec drift** is detected (strict mode). No drift → no session. In auto mode, pathMapping matches also trigger a run.
- **Tier 1:** Spec drift (generated vs published)
- **Tier 2:** Heuristic path impacts from pathMappings (e.g. `apps/api/src/auth/**` → guides)

### Output artifacts (under `.docdrift/`)

- `drift_report.json`
- `metrics.json` (after `run`)

When you run docdrift as a package (e.g. `npx docdrift` or from another repo), all of this is written to **that repo's** `.docdrift/` — i.e. the current working directory where the CLI is invoked, not inside the package. Add `.docdrift/` to the consuming repo's `.gitignore` if you don't want to commit run artifacts.

## Core flow (`docdrift run`)

1. Validate config and command availability.
2. Build drift report. **Gate:** If no drift (strict mode: spec only; auto mode: spec or pathMappings), exit (no session).
3. Policy decision (`OPEN_PR | UPDATE_EXISTING_PR | OPEN_ISSUE | NOOP`).
4. Build one aggregated evidence bundle for the whole docsite.
5. One Devin session with whole-docsite prompt; poll to terminal status.
6. If PR opened and touches `requireHumanReview` paths → create issue to direct attention.
7. Surface result via GitHub commit comment; open issue on blocked/low-confidence paths.
8. Persist state (including `lastDocDriftPrUrl` for SLA); write `.docdrift/metrics.json`.

## Where the docs are (this repo)

| Path | Purpose |
| ---- | ------- |
| `apps/docs-site/openapi/openapi.json` | Published OpenAPI spec (docdrift updates this when drift is detected). |
| `apps/docs-site/docs/api/` | API reference MDX generated from the spec (`npm run docs:gen`). |
| `apps/docs-site/docs/guides/auth.md` | Conceptual auth guide (updated only for conceptual drift). |

The docsite is a Docusaurus app with `docusaurus-plugin-openapi-docs`. The **generated** spec from code lives at `openapi/generated.json` (from `npm run openapi:export`). Drift = generated vs published differ. Verification runs `docs:gen` and `docs:build` so the docsite actually builds.

## How Devin updates them

1. **Evidence bundle** — Docdrift builds a tarball with the drift report, spec diff, and impacted doc snippets, and uploads it to the Devin API as session attachments.
2. **Devin session** — Devin is prompted (see `src/devin/prompts.ts`) to update only files under the allowlist (`openapi/**`, `apps/docs-site/**`), make minimal correct edits, run verification (`npm run docs:gen`, `npm run docs:build`), and open **one PR** per doc area with a clear description.
3. **PR** — Devin updates `apps/docs-site/openapi/openapi.json` to match the current API, runs `docs:gen` to regenerate API reference MDX, and opens a pull request. You review and merge; the docsite builds and the docs are updated.

So the "fix" is a **PR opened by Devin** that you merge; the repo's docs don't change until that PR is merged.
