# docdrift.yaml — Configuration Reference

This document describes every field in the repo-local config file `docdrift.yaml`: what is required, what is optional, defaults, and valid options.

---

## IDE support (autocomplete, validation)

Add at the top of `docdrift.yaml`:

```yaml
# yaml-language-server: $schema=./docdrift.schema.json
```

Or in consuming repos, reference the published schema:

```yaml
# yaml-language-server: $schema=https://unpkg.com/@devinnn/docdrift/docdrift.schema.json
```

Requires the [Red Hat YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) (commonly bundled in Cursor/VS Code).

---

## CLI

The config is used by `docdrift detect` and `docdrift run`. Both commands accept optional `--base` and `--head` SHAs:

| Option   | Required | Default |
| -------- | -------- | ------- |
| `--base` | No       | In CI: `GITHUB_BASE_SHA`. Else: `git merge-base origin/main HEAD` (or `main`/`master`). |
| `--head` | No       | `GITHUB_SHA` in CI, else `HEAD`. |

You can run `docdrift run` or `docdrift detect` with no arguments; base and head are resolved automatically.

---

## Top-level

| Field               | Required | Type   | Description                                                                 |
| ------------------- | -------- | ------ | --------------------------------------------------------------------------- |
| `version`           | **Yes**  | number | Must be `1`. Reserved for future config schema versions.                     |
| `devin`             | **Yes**  | object | Devin API and session settings.                                              |
| `policy`            | **Yes**  | object | PR caps, confidence, allowlist, verification, slaDays, slaLabel.             |
| `openapi` + `docsite` | **Yes*** | object + string | **Simple config**: API spec (gate) and docsite path. Required if no docAreas. |
| `exclude`           | No       | array  | Glob paths we never touch. Default `[]`.                                    |
| `requireHumanReview`| No       | array  | Glob paths that trigger a review issue when the PR touches them. Default `[]`. |
| `docAreas`          | **Yes*** | array  | **Legacy**: One or more doc areas. Required if no openapi+docsite.           |

\* Config must include either `(openapi + docsite)` or `docAreas` (at least one area).

---

## `devin`

Settings for Devin API (sessions, ACU limits, visibility).

| Field                  | Required | Type    | Default        | Description                                                                                                                                                                      |
| ---------------------- | -------- | ------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiVersion`           | **Yes**  | string  | —              | Must be `"v1"`.                                                                                                                                                                  |
| `unlisted`             | No       | boolean | `true`         | If `true`, sessions are unlisted.                                                                                                                                               |
| `maxAcuLimit`          | No       | integer | `2`            | Max ACU (compute) limit for a session. Must be a positive integer.                                                                                                               |
| `tags`                 | No       | array   | `["docdrift"]` | Tags attached to Devin sessions (e.g. for filtering in `docdrift status`). Each tag must be a non-empty string.                                                                  |
| `customInstructions`   | No       | array   | —              | Paths to markdown (or other) files, relative to the directory of `docdrift.yaml`. Contents are concatenated and appended to both autogen and conceptual Devin prompts. Missing files cause config load to fail. |

**Example:**

```yaml
devin:
  apiVersion: v1
  unlisted: true
  maxAcuLimit: 2
  tags:
    - docdrift
  customInstructions:
    - "./docs/devin-instructions.md"
    - ".docdrift/prompt-append.md"
```

---

## `policy`

Global policy: PR caps, confidence gating, allowlist, and verification commands.

### `policy.prCaps`

| Field             | Required | Type    | Default | Description                                                                 |
| ----------------- | -------- | ------- | ------- | --------------------------------------------------------------------------- |
| `maxPrsPerDay`    | No       | integer | `1`     | Maximum PRs that can be opened per day (across all doc areas). Must be ≥ 1. |
| `maxFilesTouched` | No       | integer | `12`    | Maximum files a single PR may touch. Must be ≥ 1.                           |

### `policy.confidence`

| Field                | Required | Type   | Default | Description                                                                                                                            |
| -------------------- | -------- | ------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `autopatchThreshold` | No       | number | `0.8`   | Confidence score between `0` and `1`. Above this threshold, the engine may open/update a PR; at or below, it may escalate to an issue. |

### `policy.allowlist`

| Field       | Required | Type  | Default | Description                                                                                                                                       |
| ----------- | -------- | ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowlist` | **Yes**  | array | —       | Glob-style paths (e.g. `"docs/**"`, `"openapi/**"`). Only paths matching this list may be modified by generated PRs. At least one entry required. |

### `policy.verification`

| Field      | Required | Type  | Default | Description                                                                                                                                                                                                                          |
| ---------- | -------- | ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `commands` | **Yes**  | array | —       | Commands run after patching to verify docs (e.g. `npm run docs:check`). At least one required. Each entry must be a non-empty string. The **binary** of each command must exist on the runner (e.g. `npm` for `npm run docs:check`). |

**Example:**

```yaml
policy:
  prCaps:
    maxPrsPerDay: 1
    maxFilesTouched: 12
  confidence:
    autopatchThreshold: 0.8
  allowlist:
    - "docs/**"
    - "openapi/**"
  verification:
    commands:
      - "npm run docs:check"
  slaDays: 7
  slaLabel: docdrift
```

### `policy.slaDays` and `policy.slaLabel`

| Field       | Required | Type   | Default | Description                                                                                                                                 |
| ----------- | -------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `slaDays`   | No       | number | `7`     | Days before opening an issue to nudge merging doc-drift PRs. Set to `0` to disable.                                                         |
| `slaLabel`  | No       | string | `"docdrift"` | Label used to identify doc-drift PRs for the SLA check. Only these PRs are considered (no other open PRs count).                         |
| `allowNewFiles` | No    | boolean| `false` | If `false`: Devin may only edit existing files (no new articles, folders, or IA changes). If `true`: Devin may add articles, create folders, change information architecture. Mainly for conceptual/guides. |

---

## Simple config (`openapi` + `docsite`)

When you provide `openapi` and `docsite`, docdrift runs in **single-session mode**: one Devin session for the whole docsite, one PR, and an optional issue for human review or SLA.

| Field              | Required | Type   | Description                                                                 |
| ------------------ | -------- | ------ | --------------------------------------------------------------------------- |
| `openapi`          | **Yes**  | object | How to detect API drift. `export`, `generated`, `published`.                 |
| `docsite`          | **Yes**  | string | Root path(s) of the docsite.                                                 |
| `exclude`          | No       | array  | Glob paths we never touch.                                                   |
| `requireHumanReview` | No     | array  | When the PR touches these paths, we open an issue to direct human attention. |
| `pathMappings`     | No       | array  | When these **code** paths change, these **doc** paths may need updates (heuristic). See [pathMappings (heuristic)](#pathmappings-heuristic) below. |

**Example:**

```yaml
openapi:
  export: "npm run openapi:export"
  generated: "openapi/generated.json"
  published: "apps/docs-site/openapi/openapi.json"
docsite: "apps/docs-site"
exclude: ["apps/docs-site/blog/**"]
requireHumanReview: ["apps/docs-site/docs/guides/**"]
```

### `pathMappings` (heuristic)

#### Why `pathMappings` and `docsite` serve different roles

| Field           | Role                  | What it does                                                                 |
| --------------- | --------------------- | ---------------------------------------------------------------------------- |
| **`docsite`**   | Scope                 | Tells Devin *where* the docs live (root path). Used for prompt scope.        |
| **`pathMappings`** | Targeted mapping  | Tells docdrift *which* docs to consider when *which* code changes.           |

Without `pathMappings`, Devin gets OpenAPI drift and the docsite root. It does *not* get explicit hints about conceptual docs (guides, MDX, tutorials) that may be stale when non-API code changes. With `pathMappings`, when changed files match a `match` pattern, we add the corresponding `impacts` to the evidence bundle and include the mappings in the prompt. Devin then knows: "When `definition/users.yml` changed, consider `pages/guides/users.mdx`."

#### How it works

1. OpenAPI drift is detected (gate passes).
2. We compute changed files between base and head SHAs.
3. For each `pathMappings` rule, if any changed file matches `match`, we add `impacts` to the evidence.
4. The mappings are injected into the Devin prompt so they are visible up front.
5. All `impacts` are automatically added to `requireHumanReview`, so a follow-up issue is opened when Devin touches them.

#### Schema

| Field     | Required | Description                                                             |
| --------- | -------- | ----------------------------------------------------------------------- |
| `match`   | **Yes**  | Glob pattern for **code** paths that, when changed, may impact docs.   |
| `impacts` | **Yes**  | **Doc** paths that may need updates when `match` changes. At least one. |

---

#### Best practices

- **Be specific.** Prefer `src/auth/**` over `src/**` so you only surface docs when auth-related code changes.
- **Group related impacts.** One `match` can have multiple `impacts`; list all docs that logically depend on that code.
- **Align with repo layout.** Match how your API, SDK, or feature code is organized; paths should reflect real coupling.
- **Start small.** Add a few high-value mappings first (e.g. auth, billing, core APIs), then expand.
- **Use globs consistently.** Both `match` and `impacts` support globs (`**`, `*`); ensure paths are relative to the repo root.

---

#### Fern

Fern projects typically have: `definition/` (API defs), `generators.yml`, `pages/` (MDX guides). API reference comes from OpenAPI or Fern Definition; guides are hand-written. When definition files or generated SDK code change, guides may be stale.

**Example:**

```yaml
pathMappings:
  - match: "definition/**"
    impacts: ["pages/getting-started.mdx", "pages/guides/**", "pages/api/**"]
  - match: "packages/api/**"
    impacts: ["pages/api/**", "pages/guides/*.mdx"]
  - match: "generators.yml"
    impacts: ["pages/getting-started.mdx", "pages/sdks/**"]
```

**Power user:** If you split APIs (`apis/` in multi-API workspaces), map each API definition path to its docs:

```yaml
pathMappings:
  - match: "apis/rest/**"
    impacts: ["pages/api/rest/**", "pages/guides/rest-*.mdx"]
  - match: "apis/events/**"
    impacts: ["pages/api/events/**", "pages/guides/events.mdx"]
```

---

#### Mintlify

Mintlify uses `docs/` (MDX), `mint.json`, and often OpenAPI for API reference. Feature code in `src/` or `api/` drives guides and examples.

**Example:**

```yaml
pathMappings:
  - match: "src/features/**"
    impacts: ["docs/guides/**"]
  - match: "api/**"
    impacts: ["docs/api/**", "docs/guides/*.mdx"]
  - match: "src/lib/**"
    impacts: ["docs/guides/integration.mdx", "docs/reference/**"]
```

**Power user:** Map SDK or client packages to their usage docs:

```yaml
pathMappings:
  - match: "packages/sdk-typescript/**"
    impacts: ["docs/sdks/typescript.mdx", "docs/guides/quickstart.mdx"]
  - match: "packages/sdk-python/**"
    impacts: ["docs/sdks/python.mdx"]
```

---

#### Power user: Monorepo with multiple doc surfaces

When docs and code live in different packages, map by package:

```yaml
pathMappings:
  - match: "packages/core/**"
    impacts: ["docs/core/**", "docs/guides/architecture.mdx"]
  - match: "packages/api-gateway/**"
    impacts: ["docs/api/**", "docs/guides/authentication.mdx"]
  - match: "apps/admin/**"
    impacts: ["docs/guides/admin/**"]
```

#### `apps/` monorepo (API + docsite)

When API and docsite live under `apps/` (e.g. `apps/api`, `apps/docs-site`), map API changes to doc impacts:

```yaml
pathMappings:
  - match: "apps/api/**"
    impacts: ["apps/docs-site/docs/**", "apps/docs-site/openapi/**"]
```

Use `apps/**` in `policy.allowlist` so Devin can modify both docsite and published OpenAPI under `apps/`.

---

## Blocked runs and issues

Issues are created **only** when:

1. **`requireHumanReview`** — A doc-drift PR was opened and it touches paths matched by `requireHumanReview`. We open a *review* issue to direct human attention to that PR.
2. **7-day SLA** — A doc-drift PR has been open for `slaDays` or more. We open an issue to nudge merging.
3. **`DEVIN_API_KEY` missing** — The workflow ran but `DEVIN_API_KEY` is not set. We open an issue so you can add the secret.

We **do not** create "docs drift requires input"–style issues when Devin reports blocked (evidence questions), policy `OPEN_ISSUE`, or sessions that finish with no PR. Those outcomes are reported in commit comments only.

### What is a blocked run?

A **blocked run** means the Devin session ended without opening a PR (e.g. `BLOCKED`, `NO_CHANGE`). The run completes and posts a commit comment; no issue is created.

### How runs get blocked

| Cause | Description |
| ----- | ----------- |
| **Devin reports blocked** | Devin hits a blocker (ambiguous requirements, unclear policy, needs human input) and sets `status: "BLOCKED"` in its structured output. |
| **Session completed with no PR** | Devin finished but didn't open a PR (e.g. `NO_CHANGE`). |
| **Policy: PR cap reached** | The policy returns `UPDATE_EXISTING_PR` but there is no existing doc-drift PR to update. Outcome is **BLOCKED** ("PR cap reached"). |
| **API key missing** | If `DEVIN_API_KEY` is not set, we don't start a session and treat it as blocked. |

### When issues are created

| Condition | Issue created? |
| --------- | --------------- |
| **PR opened** and touches `requireHumanReview` paths | Yes — "Docs out of sync — review doc drift PR" |
| **PR opened** and no `requireHumanReview` paths touched | No |
| **Doc-drift PR open ≥ `slaDays`** | Yes — "Docs out of sync — merge doc drift PR(s)" |
| **Policy `OPEN_ISSUE`** (policy chose issue instead of PR) | No |
| **Session `BLOCKED`** (Devin reported blocked, evidence questions) | No |
| **Session `NO_CHANGE`** (finished but didn't open PR) | No |
| **`DEVIN_API_KEY` missing** | Yes — "Configuration required — set DEVIN_API_KEY" |

---

## `docAreas` (legacy)

Array of **doc areas**. Each area has a name, a mode, owners, detection rules, and patch behavior. At least one doc area is required.

### Doc area: root fields

| Field    | Required | Type   | Description                                                                                        |
| -------- | -------- | ------ | -------------------------------------------------------------------------------------------------- |
| `name`   | **Yes**  | string | Unique identifier for this doc area (non-empty). Used in drift reports, state, and Devin metadata. |
| `mode`   | **Yes**  | string | **Options:** `autogen` \| `conceptual`. See [Mode](#mode) below.                                   |
| `owners` | **Yes**  | object | Ownership/review metadata.                                                                         |
| `detect` | **Yes**  | object | How to detect drift for this area. Must include at least one of `openapi` or `paths`.              |
| `patch`  | **Yes**  | object | How to patch (targets, human confirmation).                                                        |

### `owners`

| Field       | Required | Type  | Description                                                                                                                         |
| ----------- | -------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `reviewers` | **Yes**  | array | List of reviewer identifiers (e.g. team slugs like `datastack/api-owners`). At least one required; each must be a non-empty string. |

### `detect`

Exactly one or both of `openapi` and `paths` must be present. If both are set, both detection methods apply.

#### Option A: `detect.openapi`

Use for **autogen** doc areas: compare generated OpenAPI spec to published spec.

| Field           | Required | Type   | Description                                                                                                                           |
| --------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `exportCmd`     | **Yes**  | string | Command that generates the current spec (e.g. `npm run openapi:export`). Non-empty. The command’s binary must exist at validate time. |
| `generatedPath` | **Yes**  | string | Path to the **generated** spec file (output of `exportCmd`). Non-empty.                                                               |
| `publishedPath` | **Yes**  | string | Path to the **published** spec file (e.g. in `docs/`). Non-empty. Drift = diff between generated and published.                       |

#### Option B: `detect.paths`

Use for **conceptual** (or autogen) areas: when code paths change, which doc paths are considered impacted.

| Field         | Required | Type   | Description                                                                                                                   |
| ------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `paths`       | No\*     | array  | List of path rules. _Required if `openapi` is not set._                                                                       |
| **Each rule** |          |        |                                                                                                                               |
| `match`       | **Yes**  | string | Glob pattern for **code** paths (e.g. `apps/api/src/auth/**`). Non-empty.                                                     |
| `impacts`     | **Yes**  | array  | List of **doc** paths impacted when `match` changes (e.g. `["docs/guides/auth.md"]`). At least one non-empty string per rule. |

### `patch`

| Field                      | Required | Type    | Default | Description                                                                                                                               |
| -------------------------- | -------- | ------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `targets`                  | No       | array   | —       | List of doc file paths that may be updated by an autogen PR. Optional; if omitted for an **autogen** area, validation may emit a warning. |
| `requireHumanConfirmation` | No       | boolean | `false` | If `true`, the engine treats this area as human-in-the-loop (e.g. open an issue instead of auto-opening a PR).                            |

### Mode

- **`autogen`** — Docs can be updated automatically from a single source of truth (e.g. OpenAPI). Typically uses `detect.openapi` and `patch.targets`. Low-noise PRs when confidence is above threshold.
- **`conceptual`** — Docs require human judgment. Typically uses `detect.paths` and often `requireHumanConfirmation: true`. Drift leads to issue escalation with targeted questions rather than direct PRs.

---

## Full example

```yaml
version: 1

devin:
  apiVersion: v1
  unlisted: true
  maxAcuLimit: 2
  tags:
    - docdrift

policy:
  prCaps:
    maxPrsPerDay: 1
    maxFilesTouched: 12
  confidence:
    autopatchThreshold: 0.8
  allowlist:
    - "docs/**"
    - "openapi/**"
  verification:
    commands:
      - "npm run docs:check"

docAreas:
  - name: api_reference
    mode: autogen
    owners:
      reviewers: ["datastack/api-owners"]
    detect:
      openapi:
        exportCmd: "npm run openapi:export"
        generatedPath: "openapi/generated.json"
        publishedPath: "docs/reference/openapi.json"
    patch:
      targets:
        - "docs/reference/openapi.json"
        - "docs/reference/api.md"

  - name: auth_guide
    mode: conceptual
    owners:
      reviewers: ["datastack/platform", "datastack/security"]
    detect:
      paths:
        - match: "apps/api/src/auth/**"
          impacts: ["docs/guides/auth.md"]
    patch:
      requireHumanConfirmation: true
```

---

## Validation notes

- **Schema:** All required fields and types are enforced by the config loader (see `src/config/schema.ts`). Invalid or missing required fields cause load/validate to fail.
- **Runtime:** `docdrift validate` also checks that the **binary** of each command in `policy.verification.commands` and each `detect.openapi.exportCmd` exists on the system.
- **Warnings:** You may get warnings if an **autogen** area has no `patch.targets`, or a **conceptual** area has no `detect.paths` rules.
