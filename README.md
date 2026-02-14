# Devin Doc Drift (Client E: DataStack)

Docs that never lie: detect drift between merged code and docs, then open low-noise, evidence-grounded remediation via Devin sessions.

## Deliverables
- TypeScript CLI package (`docdrift`)
  - `validate`
  - `detect --base <sha> --head <sha>`
  - `run --base <sha> --head <sha>`
  - `status --since 24h`
- GitHub Action: `/Users/cameronking/Desktop/sideproject/docdrift/.github/workflows/devin-doc-drift.yml`
- Repo-local config: `/Users/cameronking/Desktop/sideproject/docdrift/docdrift.yaml`
- Demo API + OpenAPI exporter + driftable docs
- PR template + Loom script

## Why this is low-noise
- One PR per doc area per day (bundling rule).
- Global PR/day cap.
- Confidence gating and allowlist enforcement.
- Conceptual docs default to issue escalation with targeted questions.
- Idempotency key prevents duplicate actions for same repo/SHAs/action.

## Detection tiers
- Tier 0: docs checks (`npm run docs:check`)
- Tier 1: OpenAPI drift (`openapi/generated.json` vs `docs/reference/openapi.json`)
- Tier 2: heuristic path impacts (e.g. `apps/api/src/auth/**` -> `docs/guides/auth.md`)

Output artifacts (under `.docdrift/`):
- `drift_report.json`
- `metrics.json` (after `run`)

When you run docdrift as a package (e.g. `npx docdrift` or from another repo), all of this is written to **that repo’s** `.docdrift/` — i.e. the current working directory where the CLI is invoked, not inside the package. Add `.docdrift/` to the consuming repo’s `.gitignore` if you don’t want to commit run artifacts.

## Core flow (`docdrift run`)
1. Validate config and command availability.
2. Build drift report.
3. Policy decision (`OPEN_PR | UPDATE_EXISTING_PR | OPEN_ISSUE | NOOP`).
4. Build evidence bundle (`.docdrift/evidence/<runId>/<docArea>` + tarball).
5. Upload attachments to Devin v1 and create session.
6. Poll session to terminal status.
7. Surface result via GitHub commit comment; open issue on blocked/low-confidence paths.
8. Persist state in `.docdrift/state.json` and write `.docdrift/metrics.json`.

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

## Using in another repo (published package)

Once published to npm, any repo can use the CLI locally or in GitHub Actions.

1. **In the consuming repo** add a `docdrift.yaml` at the root (see this repo’s `docdrift.yaml` and `docdrift-yml.md`).
2. **CLI**
   ```bash
   npx docdrift@latest validate
   npx docdrift@latest detect --base <base-sha> --head <head-sha>
   # With env for run:
   DEVIN_API_KEY=... GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo GITHUB_SHA=<sha> npx docdrift@latest run --base <base-sha> --head <head-sha>
   ```
3. **GitHub Actions** — add a step that runs the CLI (e.g. after checkout and setting base/head):
   ```yaml
   - run: npx docdrift@latest run --base ${{ steps.shas.outputs.base }} --head ${{ steps.shas.outputs.head }}
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
