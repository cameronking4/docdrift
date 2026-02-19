# How Docdrift Works

Detection, gating, core flow, and why it stays low-noise.

## Why this is low-noise

- **Pull request: commit-to-branch** (default) — When triggered by a pull request, Devin commits directly to the source PR branch. No separate docdrift PR; doc updates appear on the same PR. Set `devin.prStrategy: "separate-pr"` for a separate `docdrift/pr-N` PR.
- **Single branch strategy** (push/manual) — For push to main or manual runs, one branch (e.g. `docdrift`) for all runs; Devin updates the existing PR when present. Configurable via `branchStrategy: single` in `docdrift.yaml`.
- **Single session, single PR** — One Devin session handles the whole docsite (API reference + guides).
- **Gate on API spec diff** — We only run when spec drift is detected (strict mode); no session for docs-check-only failures.
- **Baseline drift detection** (`lastKnownBaseline`) — When set, we compare current export to the published spec at that commit. No drift since last sync → no session. The `docdrift-baseline-update` workflow updates it when any PR is merged to main.
- **requireHumanReview** — When the PR touches guides/prose, we open an issue after the PR to direct attention.
- **7-day SLA** — If a doc-drift PR is open 7+ days, we open a reminder issue (configurable `slaDays`; use `sla-check` CLI or cron workflow).
- Confidence gating and allowlist/exclude enforcement.
- Idempotency key prevents duplicate actions for same repo/SHAs/action.

## Detection and gate

- **Gate:** We only run a Devin session when **spec drift**, **baseline drift**, or **baseline missing** is detected. No drift → no session. In auto mode, pathMapping matches also trigger a run.
- **Tier 1:** Spec drift (generated vs published at HEAD)
- **Tier 1:** Baseline drift (generated vs published spec at `lastKnownBaseline` commit)
- **Tier 1:** Baseline missing (no `lastKnownBaseline` set → assume drift for first install)
- **Tier 2:** Heuristic path impacts from pathMappings (e.g. `apps/api/src/auth/**` → guides)

**lastKnownBaseline:** When set, drift = current export differs from the published OpenAPI spec at that commit. When blank, we assume drift (cold start). Updated automatically by the `docdrift-baseline-update` workflow when any PR is merged to main. See [docdrift.yaml](docdrift-yml.md#lastknownbaseline-baseline-drift-detection).

### Output artifacts (under `.docdrift/`)

- `drift_report.json`
- `metrics.json` (after `run`)

When you run docdrift as a package (e.g. `npx docdrift` or from another repo), all of this is written to **that repo's** `.docdrift/` — i.e. the current working directory where the CLI is invoked, not inside the package. Add `.docdrift/` to the consuming repo's `.gitignore` if you don't want to commit run artifacts.

## Core flow (`docdrift run`)

1. Validate config and command availability.
2. Build drift report. **Gate:** If no drift (strict mode: spec only; auto mode: spec or pathMappings), exit (no session).
3. **Pull request:** When trigger is `pull_request`, base/head SHAs come from the PR. With `devin.prStrategy: "commit-to-branch"` (default), Devin commits to the source PR branch; no separate docdrift PR. With `prStrategy: "separate-pr"`, create or update a `docdrift/pr-N` PR.
4. **Push/manual:** Policy decision (`OPEN_PR | UPDATE_EXISTING_PR | OPEN_ISSUE | NOOP`). With `branchStrategy: single`, we look for an existing open PR from the docdrift branch; if found, we instruct Devin to update it instead of opening a new one.
5. Build one aggregated evidence bundle for the whole docsite.
6. One Devin session with whole-docsite prompt; poll to terminal status.
7. If a PR was opened and touches `requireHumanReview` paths → create issue to direct attention.
8. Surface result via GitHub commit comment; open issue on blocked/low-confidence paths. (When `prStrategy: "commit-to-branch"`, we do not post a comment linking to a separate doc PR.)
9. Persist state (including `lastDocDriftPrUrl` for SLA when applicable); write `.docdrift/metrics.json`.

## Where the docs are (this repo)

| Path | Purpose |
| ---- | ------- |
| `apps/docs-site/openapi/openapi.json` | Published OpenAPI spec (docdrift updates this when drift is detected). |
| `apps/docs-site/docs/api/` | API reference MDX generated from the spec (`npm run docs:gen`). |
| `apps/docs-site/docs/guides/auth.md` | Conceptual auth guide (updated only for conceptual drift). |

The docsite is a Docusaurus app with `docusaurus-plugin-openapi-docs`. The **generated** spec from code lives at `openapi/generated.json` (from `npm run openapi:export`). Drift = generated vs published differ. Verification runs `docs:gen` and `docs:build` so the docsite actually builds.

## How Devin updates them

1. **Evidence bundle** — Docdrift builds a tarball with the drift report, spec diff, and impacted doc snippets, and uploads it to the Devin API. When the trigger is **pull request**, base/head SHAs are the PR’s base and head (the PR branch is what Devin evaluates).
2. **Devin session** — Devin is prompted to update only files under the allowlist, make minimal correct edits, and run verification. **Pull request (commit-to-branch):** Devin checks out the source PR branch, applies doc changes, commits and pushes; no new PR. **Push/manual or separate-pr:** Devin opens one PR or updates the existing docdrift branch PR.
3. **Outcome** — **Commit-to-branch:** Doc commits appear on the developer’s PR. **Separate PR:** Devin opens a docdrift PR; you review and merge. Either way, the docsite builds after merge.

So the "fix" is either **commits on the same PR** (commit-to-branch) or a **PR opened by Devin** (push/separate-pr); the repo’s docs don’t change until those commits or that PR is merged.
