# Loom Script (5–10 min) — DataStack Client Demo

*A 5–10 minute Loom video presenting DocDrift to DataStack (Client E).*

---

## Part 1: How the automation addresses DataStack's problem

### 0:00–0:45 — Problem framing

**DataStack's pain (in their words):**
> "We can't keep our internal docs or API references up to date. Our API docs are six months out of date. Engineers change endpoints and never update the docs. New hires and partner teams constantly ping us asking how things work because the docs are wrong. We know it's a problem but writing docs is the first thing that gets cut from any sprint."

**What we solve:**
- **Detect drift** — Compare generated API spec (from code) to what's published; no manual audits.
- **Docs as a byproduct** — When code is merged, drift is detected → Devin updates docs → you merge one PR.
- **Fewer support pings** — Accurate docs reduce "how does this work?" questions from new hires and partners.
- **Onboarding speed** — Docs stay current so onboarding doesn't rely on engineers' ad-hoc explanations.

**Core idea:** The fix isn't "write more docs"—it's **detect drift from real code, then remediate in one place.**

---

## Part 2: What makes Devin unique vs other coding agents

### 0:45–1:45 — Devin vs other tools

| Other coding agents (Copilot, Cursor, etc.) | Devin in DocDrift |
|---------------------------------------------|-------------------|
| Inline suggestions, one-off completions      | **End-to-end sessions** — reads evidence, plans, edits, runs verification, opens PR |
| Human must initiate every step              | **Programmatic API** — CI (GitHub Actions) can trigger a session on push/merge |
| No built-in PR workflow                      | **Creates real PRs** — Devin branches, commits, pushes, opens a review-ready PR |
| Limited context / no evidence bundle        | **Evidence bundle** — tarball of drift report, spec diff, impacted docs uploaded as attachments |
| No gate or policy                            | **Orchestrated by DocDrift** — gates on spec diff, policy engine (OPEN_PR vs ISSUE vs NOOP), caps |

**Why Devin fits doc drift:**
- **Autonomous software engineer** — Handles long-running tasks (update 10+ files, run `docs:gen`, `docs:build`, open PR) without hand-holding.
- **Session-based** — One Devin session per doc area; we poll until terminal status; structured output for deterministic orchestration.
- **CI-friendly** — Sessions created via API with `DEVIN_API_KEY`; idempotent runs; no duplicate work on reruns.

---

## Part 3: Demo beats

### 1:45–2:30 — Architecture walkthrough

- Show `docdrift.yaml` — spec providers (OpenAPI), docsite path, mode (strict vs auto), pathMappings, policy caps.
- CLI: `validate`, `detect --base <sha> --head <sha>`, `run`, `status`, `sla-check`.
- Tiers: Tier 0 (no drift), Tier 1 (spec drift), Tier 2 (pathMappings/heuristics); low-noise policy caps.

### 2:30–5:30 — Beat 1 (autogen / API reference)

- Merge a response field rename in API code.
- Workflow triggers on push to main.
- Artifacts: `.docdrift/drift_report.json`, `.docdrift/evidence/` bundle.
- Open Devin session URL from logs.
- Show bundled PR for `api_reference` — updated OpenAPI, regenerated MDX.

### 5:30–7:30 — Beat 2 (conceptual / guides)

- Merge auth behavior change under `apps/api/src/auth/**`.
- Workflow triggers conceptual drift (pathMappings).
- Policy chooses **issue escalation**, not PR spam (`requireHumanReview`).
- Show issue with targeted questions for human judgment.

### 7:30–9:00 — Enterprise readiness

- **Idempotency** — Same SHAs → no duplicate sessions/PRs.
- **PR caps** — `maxPrsPerDay`, `maxFilesTouched`; one-per-doc-area bundling.
- **Structured output** — Deterministic milestones (planning, editing, verifying, opened PR, done).

---

## Part 4: Proposed next steps

### Immediate problem

1. **Pilot on API reference** — Run `docdrift detect` on DataStack's main vs published spec; show first drift report (what's out of sync).
2. **One-time setup** — `npx @devinnn/docdrift setup` (Manual or Devin PR) to get `docdrift.yaml` and GitHub workflow.
3. **First real run** — Merge a small API change; let workflow trigger; review Devin's PR; merge and validate.

### Longer-term client relationship

1. **Expand coverage** — Add conceptual guides via pathMappings; tune `requireHumanReview` for sensitive prose.
2. **Ecosystem fit** — If using Mintlify, Fern, Postman, or GraphQL, add config; docdrift works with their layouts.
3. **7-day SLA** — Enable `sla-check` (cron) to surface doc-drift PRs open 7+ days; reminder issues for accountability.
4. **DeepWiki export** — After docs merge, trigger re-ingestion so internal assistants (e.g. Mendable) stop returning stale answers—"closing the loop from docs wrong to people stop pinging engineers."
5. **Metrics** — `.docdrift/metrics.json` and run history for visibility; iterate on thresholds and caps.

---

## 9:00–10:00 — Close

- **Recap:** Accurate docs, low noise, human-in-loop where needed.
- **Call to action:** Run `npx @devinnn/docdrift setup` to get started; we can walk through the first drift report together.

---

## Optional Loom add-ons (enterprise story)

- **Mintlify**: Same idea — spec lives in the docs repo and is wired into nav; docdrift keeps that spec (and any Mintlify metadata) in sync. Mention as "works with Mintlify-style docs repos."
- **Fern**: "Docdrift creates the PR; Fern can generate a preview deployment so reviewers see before/after; optionally Fern SDK generation keeps docs and SDK in lockstep."
- **Mendable**: After docs merge, trigger re-ingestion so the internal assistant stops returning stale answers — "closing the loop from docs wrong to people stop pinging engineers."
  