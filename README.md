# Devin Doc Drift (Client E: DataStack)

Docs that never lie: detect drift between merged code and docs, then open low-noise, evidence-grounded remediation via Devin sessions.

## Deliverables

- **npm package**: [@devinnn/docdrift](https://www.npmjs.com/package/@devinnn/docdrift) — TypeScript CLI (`docdrift`)
  - `validate`
  - `detect --base <sha> --head <sha>`
  - `run --base <sha> --head <sha>`
  - `status --since 24h`
  - `sla-check` — Check for doc-drift PRs open 7+ days and open a reminder issue
- GitHub Action: `/Users/cameronking/Desktop/sideproject/docdrift/.github/workflows/devin-doc-drift.yml`
- Repo-local config: `/Users/cameronking/Desktop/sideproject/docdrift/docdrift.yaml`
- Demo API + OpenAPI exporter + driftable docs
- PR template + Loom script

## Why this is low-noise

- **Single session, single PR** — One Devin session handles the whole docsite (API reference + guides).
- **Gate on API spec diff** — We only run when OpenAPI drift is detected; no session for docs-check-only failures.
- **requireHumanReview** — When the PR touches guides/prose, we open an issue after the PR to direct attention.
- **7-day SLA** — If a doc-drift PR is open 7+ days, we open a reminder issue (configurable `slaDays`; use `sla-check` CLI or cron workflow).
- Confidence gating and allowlist/exclude enforcement.
- Idempotency key prevents duplicate actions for same repo/SHAs/action.

## Detection and gate

- **Gate:** We only run a Devin session when **OpenAPI drift** is detected. No drift → no session.
- Tier 1: OpenAPI drift (`openapi/generated.json` vs published spec)
- Tier 2: Heuristic path impacts from docAreas (e.g. `apps/api/src/auth/**` → guides)

Output artifacts (under `.docdrift/`):

- `drift_report.json`
- `metrics.json` (after `run`)

When you run docdrift as a package (e.g. `npx docdrift` or from another repo), all of this is written to **that repo’s** `.docdrift/` — i.e. the current working directory where the CLI is invoked, not inside the package. Add `.docdrift/` to the consuming repo’s `.gitignore` if you don’t want to commit run artifacts.

## Core flow (`docdrift run`)

1. Validate config and command availability.
2. Build drift report. **Gate:** If no OpenAPI drift, exit (no session).
3. Policy decision (`OPEN_PR | UPDATE_EXISTING_PR | OPEN_ISSUE | NOOP`).
4. Build one aggregated evidence bundle for the whole docsite.
5. One Devin session with whole-docsite prompt; poll to terminal status.
6. If PR opened and touches `requireHumanReview` paths → create issue to direct attention.
7. Surface result via GitHub commit comment; open issue on blocked/low-confidence paths.
8. Persist state (including `lastDocDriftPrUrl` for SLA); write `.docdrift/metrics.json`.

## Where the docs are (this repo)

| Path                                       | Purpose                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `apps/docs-site/openapi/openapi.json`      | Published OpenAPI spec (docdrift updates this when drift is detected).  |
| `apps/docs-site/docs/api/`                 | API reference MDX generated from the spec (`npm run docs:gen`).        |
| `apps/docs-site/docs/guides/auth.md`       | Conceptual auth guide (updated only for conceptual drift).              |

The docsite is a Docusaurus app with `docusaurus-plugin-openapi-docs`. The **generated** spec from code lives at `openapi/generated.json` (from `npm run openapi:export`). Drift = generated vs published differ. Verification runs `docs:gen` and `docs:build` so the docsite actually builds.

## How Devin updates them

1. **Evidence bundle** — Docdrift builds a tarball with the drift report, OpenAPI diff, and impacted doc snippets, and uploads it to the Devin API as session attachments.
2. **Devin session** — Devin is prompted (see `src/devin/prompts.ts`) to update only files under the allowlist (`openapi/**`, `apps/docs-site/**`), make minimal correct edits, run verification (`npm run docs:gen`, `npm run docs:build`), and open **one PR** per doc area with a clear description.
3. **PR** — Devin updates `apps/docs-site/openapi/openapi.json` to match the current API, runs `docs:gen` to regenerate API reference MDX, and opens a pull request. You review and merge; the docsite builds and the docs are updated.

So the “fix” is a **PR opened by Devin** that you merge; the repo’s docs don’t change until that PR is merged.

## Local usage

```bash
npm install
npx tsx src/cli.ts validate
npm run openapi:export
npx tsx src/cli.ts detect --base <sha> --head <sha>
DEVIN_API_KEY=... GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo GITHUB_SHA=<sha> npx tsx src/cli.ts run --base <sha> --head <sha>
```

## Local demo (no GitHub)

You can run a full end-to-end demo locally with no remote repo. Ensure `.env` has `DEVIN_API_KEY` (and optionally `GITHUB_TOKEN` only when you have a real repo).

1. **One-time setup (already done if you have two commits with drift)**
   - Git is inited; baseline commit has docs in sync with API.
   - A later commit changes `apps/api/src/model.ts` (e.g. `name` → `fullName`) and runs `npm run openapi:export`, so `openapi/generated.json` drifts from `docs/reference/openapi.json`.

2. **Run the pipeline**

   ```bash
   npm install
   npx tsx src/cli.ts validate
   npx tsx src/cli.ts detect --base b0f624f --head 6030902
   ```

   - Use your own `git log --oneline -3` to get `base` (older) and `head` (newer) SHAs if you recreated the demo.

3. **Run with Devin (no GitHub calls)**  
   Omit `GITHUB_TOKEN` so the CLI does not post comments or create issues. Devin session still runs; results are printed to stdout and written to `.docdrift/state.json` and `metrics.json`.

   ```bash
   export $(grep -v '^#' .env | xargs)
   unset GITHUB_TOKEN GITHUB_REPOSITORY GITHUB_SHA
   npx tsx src/cli.ts run --base b0f624f --head 6030902
   ```

   - `run` can take 1–3 minutes while the Devin session runs.

4. **What you’ll see**
   - `.docdrift/drift_report.json` — drift items (e.g. OpenAPI `name` → `fullName`).
   - `.docdrift/evidence/<runId>/` — evidence bundles and OpenAPI diff.
   - Stdout — per–doc-area outcome (e.g. PR opened by Devin or blocked).
   - `.docdrift/metrics.json` — counts and timing.

## CI usage

- Add secret: `DEVIN_API_KEY`
- Push to `main` or run `workflow_dispatch`
- Action uploads:
  - `.docdrift/drift_report.json`
  - `.docdrift/evidence/**`
  - `.docdrift/metrics.json`

## Run on GitHub

1. **Create a repo** on GitHub (e.g. `your-org/docdrift`), then add the remote and push:

   ```bash
   git remote add origin https://github.com/your-org/docdrift.git
   git push -u origin main
   ```

2. **Add secret**  
   Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - Name: `DEVIN_API_KEY`
   - Value: your Devin API key (same as in `.env` locally)

   `GITHUB_TOKEN` is provided automatically; the workflow uses it for commit comments and issues.

3. **Trigger the workflow**
   - **Push to `main`** — runs on every push (compares previous commit vs current).
   - **Manual run** — **Actions** tab → **devin-doc-drift** → **Run workflow** (uses `HEAD` and `HEAD^` as head/base).

## See it work (demo on GitHub)

This repo has **intentional drift**: the API has been expanded (new fields `fullName`, `avatarUrl`, `createdAt`, `role` and new endpoint `GET /v1/users` with pagination), but **docs are unchanged** (`docs/reference/openapi.json` and `docs/reference/api.md` still describe the old single-endpoint, `id`/`name`/`email` only). Running docdrift will detect that and hand a large diff to Devin to fix via a PR. To see it:

1. **Create a new GitHub repo** (e.g. `docdrift-demo`) so you have a clean place to run the workflow.
2. **Push this project with full history** (so both commits are on `main`):
   ```bash
   git remote add origin https://github.com/YOUR_ORG/docdrift-demo.git
   git push -u origin main
   ```
3. **Add secret** in that repo: **Settings** → **Secrets and variables** → **Actions** → `DEVIN_API_KEY` = your Devin API key.
4. **Trigger the workflow**
   - Either push another small commit (e.g. README tweak), or
   - **Actions** → **devin-doc-drift** → **Run workflow**.
5. **Where to look**
   - **Actions** → open the run → **Run Doc Drift** step: the step logs print JSON with `sessionUrl`, `prUrl`, and `outcome` per doc area. Open any `sessionUrl` in your browser to see the Devin session.
   - **Artifacts**: download **docdrift-artifacts** for `.docdrift/drift_report.json`, `.docdrift/metrics.json`, and evidence.
   - **Devin dashboard**: sessions are tagged `docdrift`; you’ll see the run there once the step completes (often 1–3 minutes).

## Using in another repo (published package)

Once published to npm, any repo can use the CLI locally or in GitHub Actions.

1. **Setup** — `npx @devinnn/docdrift setup` (requires `DEVIN_API_KEY`). Devin generates `docdrift.yaml`, `.docdrift/DocDrift.md`, and `.github/workflows/docdrift.yml`. Prerequisite: add your repo in Devin's Machine first. Or add `docdrift.yaml` manually (see `docdrift-yml.md`).
2. **CLI**
   ```bash
   npx @devinnn/docdrift validate
   npx @devinnn/docdrift detect --base <base-sha> --head <head-sha>
   # With env for run:
   DEVIN_API_KEY=... GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo GITHUB_SHA=<sha> npx @devinnn/docdrift run --base <base-sha> --head <head-sha>
   ```
3. **GitHub Actions** — add a step that runs the CLI (e.g. after checkout and setting base/head):
   ```yaml
   - run: npx @devinnn/docdrift run --base ${{ steps.shas.outputs.base }} --head ${{ steps.shas.outputs.head }}
     env:
       DEVIN_API_KEY: ${{ secrets.DEVIN_API_KEY }}
       GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
       GITHUB_REPOSITORY: ${{ github.repository }}
       GITHUB_SHA: ${{ github.sha }}
   ```
   Add repo secret `DEVIN_API_KEY`; `GITHUB_TOKEN` is provided by the runner.

## Publishing the package

- Set `"private": false` in `package.json` (or omit it).
- Set `"repository": { "type": "git", "url": "https://github.com/your-org/docdrift.git" }`.
- Run `pnpm build` (or `npm run build`), then `npm publish` (for a scoped package use `npm publish --access public`).
- Only the `dist/` directory is included (`files` in `package.json`). Consumers get the built CLI; they provide their own `docdrift.yaml` in their repo.

## Demo scenario

- Autogen drift: rename a field in `apps/api/src/model.ts`, merge to `main`, observe docs PR path.
- Conceptual drift: change auth behavior under `apps/api/src/auth/**`, merge to `main`, observe single escalation issue.

## Loom

See `/Users/cameronking/Desktop/sideproject/docdrift/loom.md` for the minute-by-minute recording script.
