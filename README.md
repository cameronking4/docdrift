# Devin Doc Drift (Client E: DataStack)

Docs that never lie: detect drift between merged code and docs, then open low-noise, evidence-grounded remediation via Devin sessions.

## Table of contents

- [Deliverables](#deliverables)
- [Quick start](#quick-start)
- [Modes & spec providers](#modes--spec-providers)
- [Guides](#guides)
- [Project docs layout](#project-docs-layout)

---

## Deliverables

- **npm package**: [@devinnn/docdrift](https://www.npmjs.com/package/@devinnn/docdrift) — TypeScript CLI (`docdrift`)
  - `validate` — Validate docdrift.yaml
  - `detect --base <sha> --head <sha>` — Check for drift
  - `run --base <sha> --head <sha>` — Full run with Devin
  - `status --since 24h` — Show run status
  - `sla-check` — Check for doc-drift PRs open 7+ days and open a reminder issue
  - `setup` — Interactive setup (Devin analyzes repo, generates v2 docdrift.yaml)
  - `generate-yaml` — Generate config from repo fingerprint `[--output path] [--force]`
  - `export` — Export DeepWiki to static MDX `[--repo owner/name] [--out path] [--fail-on-secrets]`
- GitHub Action: `.github/workflows/devin-doc-drift.yml`
- Repo-local config: `docdrift.yaml`
- Demo API + OpenAPI exporter + driftable docs
- PR template + [Loom script](loom.md)

---

## Quick start

```bash
# Interactive setup (requires DEVIN_API_KEY; add repo in Devin Machine first)
npx @devinnn/docdrift setup

# Or generate config only (scriptable)
npx @devinnn/docdrift generate-yaml --output docdrift.yaml --force
```

→ [**Setup guide**](docs/guides/setup.md) — Setup options, prerequisites

---

## Modes & spec providers

| Mode | When it runs |
| ---- | -------------- |
| **strict** (default) | Only when spec drift is detected (OpenAPI, GraphQL, etc.). No spec drift → no Devin session. |
| **auto** | Also when pathMappings match (file changes hit `match` patterns). |

| Spec formats | openapi3, swagger2, graphql, fern, postman |

→ [**Configuration**](docs/guides/configuration.md) — Modes, spec providers, full config

---

## Guides

| Guide | What’s inside |
| ----- | -------------- |
| [Setup](docs/guides/setup.md) | `setup` vs `generate-yaml`, prerequisites |
| [Configuration](docs/guides/configuration.md) | Modes, spec providers; links to full schema |
| [How it works](docs/guides/how-it-works.md) | Detection, gate, core flow, low-noise design |
| [Ecosystems](docs/guides/ecosystems.md) | OpenAPI, FastAPI, Fern, GraphQL, Mintlify, Postman, monorepos |
| [Local development](docs/guides/local-development.md) | Local usage, demo without GitHub |
| [CI & GitHub](docs/guides/ci-github.md) | GitHub Actions, secrets, demo on GitHub |
| [Using in another repo](docs/guides/consuming-repo.md) | Published package, CLI, GitHub Actions |
| [Publishing](docs/guides/publishing.md) | Publishing the npm package |
| [Export](docs/guides/export.md) | DeepWiki static snapshot to MDX |
| [Loom script](loom.md) | Recording script for demos |

### Reference

- [docdrift.yaml](docdrift-yml.md) — Full configuration schema and validation

---

## Project docs layout (this repo)

| Path | Purpose |
| ---- | ------- |
| `apps/docs-site/openapi/openapi.json` | Published OpenAPI spec (docdrift updates when drift detected) |
| `apps/docs-site/docs/api/` | API reference MDX (`npm run docs:gen`) |
| `apps/docs-site/docs/guides/` | Conceptual guides (auth, etc.) |

Generated spec from code: `openapi/generated.json` (`npm run openapi:export`). Drift = generated vs published differ.

---

## Why low-noise

- **Single session, single PR** — One Devin session for the whole docsite
- **Gate on spec diff** — No session when no drift (strict mode)
- **requireHumanReview** — Issue when PR touches guides/prose
- **7-day SLA** — Reminder issue for stale doc-drift PRs
- **Confidence gating** — Allowlist, exclude, idempotency

→ [**How it works**](docs/guides/how-it-works.md) — Detection, flow, evidence bundle
