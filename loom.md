# Loom Script (7-10 min)

## 0:00-0:45 - Problem framing

- DataStack docs drift from shipped API behavior.
- Goal: docs updates become an automatic byproduct of merged code.

## 0:45-2:30 - Architecture walkthrough

- Show `docdrift.yaml` doc areas (`api_reference`, `auth_guide`).
- Show CLI commands: validate, detect, run, status.
- Explain tiers (0 docs checks, 1 OpenAPI diff, 2 heuristics) and low-noise policy caps.

## 2:30-5:30 - Beat 1 (autogen)

- Merge a response field rename in API code.
- Trigger workflow.
- Show artifacts: `.docdrift/drift_report.json`, `.docdrift/evidence/` bundle.
- Open Devin session URL from logs.
- Show bundled PR created for `api_reference`.

## 5:30-7:30 - Beat 2 (conceptual)

- Merge auth behavior change under `apps/api/src/auth/**`.
- Workflow triggers conceptual drift.
- Show policy chooses issue escalation, not PR spam.
- Show issue with targeted questions.

## 7:30-9:00 - Enterprise readiness

- Idempotency key prevents duplicate outputs on reruns.
- PR caps and one-per-doc-area/day bundling.
- Structured output schemas for deterministic orchestration.

## 9:00-10:00 - Close

- Recap: accurate docs, low noise, human-in-loop where needed.

## Optional Loom add-ons (enterprise story)

- **Mintlify**: Same idea — spec lives in the docs repo and is wired into nav; docdrift keeps that spec (and any Mintlify metadata) in sync. Mention as “works with Mintlify-style docs repos.”
- **Fern**: “Docdrift creates the PR; Fern can generate a preview deployment so reviewers see before/after; optionally Fern SDK generation keeps docs and SDK in lockstep.”
- **Mendable**: After docs merge, trigger re-ingestion so the internal assistant stops returning stale answers — “closing the loop from docs wrong to people stop pinging engineers.”
