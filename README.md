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

Output artifact:
- `/Users/cameronking/Desktop/sideproject/docdrift/drift_report.json`

## Core flow (`docdrift run`)
1. Validate config and command availability.
2. Build drift report.
3. Policy decision (`OPEN_PR | UPDATE_EXISTING_PR | OPEN_ISSUE | NOOP`).
4. Build evidence bundle (`.docdrift/evidence/<runId>/<docArea>` + tarball).
5. Upload attachments to Devin v1 and create session.
6. Poll session to terminal status.
7. Surface result via GitHub commit comment; open issue on blocked/low-confidence paths.
8. Persist state in `.docdrift/state.json` and write `metrics.json`.

## Local usage
```bash
npm install
npx tsx src/cli.ts validate
npm run openapi:export
npx tsx src/cli.ts detect --base <sha> --head <sha>
DEVIN_API_KEY=... GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo GITHUB_SHA=<sha> npx tsx src/cli.ts run --base <sha> --head <sha>
```

## CI usage
- Add secret: `DEVIN_API_KEY`
- Push to `main` or run `workflow_dispatch`
- Action uploads:
  - `drift_report.json`
  - `.docdrift/evidence/**`
  - `metrics.json`

## Demo scenario
- Autogen drift: rename a field in `apps/api/src/model.ts`, merge to `main`, observe docs PR path.
- Conceptual drift: change auth behavior under `apps/api/src/auth/**`, merge to `main`, observe single escalation issue.

## Loom
See `/Users/cameronking/Desktop/sideproject/docdrift/loom.md` for the minute-by-minute recording script.
