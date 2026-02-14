# docdrift.yaml — Configuration Reference

This document describes every field in the repo-local config file `docdrift.yaml`: what is required, what is optional, defaults, and valid options.

---

## Top-level

| Field      | Required | Type   | Description |
|-----------|----------|--------|-------------|
| `version` | **Yes**  | number | Must be `1`. Reserved for future config schema versions. |
| `devin`   | **Yes**  | object | Devin API and session settings. |
| `policy`  | **Yes**  | object | PR caps, confidence, allowlist, and verification. |
| `docAreas`| **Yes**  | array  | One or more doc areas (each defines what to detect and how to patch). |

---

## `devin`

Settings for Devin API (sessions, ACU limits, visibility).

| Field         | Required | Type    | Default     | Description |
|---------------|----------|---------|-------------|-------------|
| `apiVersion`  | **Yes**  | string  | —           | Must be `"v1"`. |
| `unlisted`   | No       | boolean | `true`      | If `true`, sessions are unlisted. |
| `maxAcuLimit`| No       | integer | `2`         | Max ACU (compute) limit for a session. Must be a positive integer. |
| `tags`       | No       | array   | `["docdrift"]` | Tags attached to Devin sessions (e.g. for filtering in `docdrift status`). Each tag must be a non-empty string. |

**Example:**

```yaml
devin:
  apiVersion: v1
  unlisted: true
  maxAcuLimit: 2
  tags:
    - docdrift
```

---

## `policy`

Global policy: PR caps, confidence gating, allowlist, and verification commands.

### `policy.prCaps`

| Field             | Required | Type    | Default | Description |
|-------------------|----------|---------|---------|-------------|
| `maxPrsPerDay`    | No       | integer | `1`     | Maximum PRs that can be opened per day (across all doc areas). Must be ≥ 1. |
| `maxFilesTouched`  | No       | integer | `12`    | Maximum files a single PR may touch. Must be ≥ 1. |

### `policy.confidence`

| Field                 | Required | Type   | Default | Description |
|-----------------------|----------|--------|---------|-------------|
| `autopatchThreshold`  | No       | number | `0.8`   | Confidence score between `0` and `1`. Above this threshold, the engine may open/update a PR; at or below, it may escalate to an issue. |

### `policy.allowlist`

| Field        | Required | Type  | Default | Description |
|--------------|----------|-------|---------|-------------|
| `allowlist`  | **Yes**  | array | —       | Glob-style paths (e.g. `"docs/**"`, `"openapi/**"`). Only paths matching this list may be modified by generated PRs. At least one entry required. |

### `policy.verification`

| Field       | Required | Type  | Default | Description |
|-------------|----------|-------|---------|-------------|
| `commands`  | **Yes**  | array | —       | Commands run after patching to verify docs (e.g. `npm run docs:check`). At least one required. Each entry must be a non-empty string. The **binary** of each command must exist on the runner (e.g. `npm` for `npm run docs:check`). |

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
```

---

## `docAreas`

Array of **doc areas**. Each area has a name, a mode, owners, detection rules, and patch behavior. At least one doc area is required.

### Doc area: root fields

| Field   | Required | Type   | Description |
|---------|----------|--------|-------------|
| `name`  | **Yes**  | string | Unique identifier for this doc area (non-empty). Used in drift reports, state, and Devin metadata. |
| `mode`  | **Yes**  | string | **Options:** `autogen` \| `conceptual`. See [Mode](#mode) below. |
| `owners`| **Yes**  | object | Ownership/review metadata. |
| `detect`| **Yes**  | object | How to detect drift for this area. Must include at least one of `openapi` or `paths`. |
| `patch` | **Yes**  | object | How to patch (targets, human confirmation). |

### `owners`

| Field        | Required | Type  | Description |
|--------------|----------|-------|-------------|
| `reviewers`  | **Yes**  | array | List of reviewer identifiers (e.g. team slugs like `datastack/api-owners`). At least one required; each must be a non-empty string. |

### `detect`

Exactly one or both of `openapi` and `paths` must be present. If both are set, both detection methods apply.

#### Option A: `detect.openapi`

Use for **autogen** doc areas: compare generated OpenAPI spec to published spec.

| Field           | Required | Type  | Description |
|-----------------|----------|-------|-------------|
| `exportCmd`     | **Yes**  | string| Command that generates the current spec (e.g. `npm run openapi:export`). Non-empty. The command’s binary must exist at validate time. |
| `generatedPath` | **Yes**  | string| Path to the **generated** spec file (output of `exportCmd`). Non-empty. |
| `publishedPath` | **Yes**  | string| Path to the **published** spec file (e.g. in `docs/`). Non-empty. Drift = diff between generated and published. |

#### Option B: `detect.paths`

Use for **conceptual** (or autogen) areas: when code paths change, which doc paths are considered impacted.

| Field   | Required | Type  | Description |
|---------|----------|-------|-------------|
| `paths` | No*     | array | List of path rules. *Required if `openapi` is not set.* |
| **Each rule** |       |       | |
| `match`  | **Yes**  | string| Glob pattern for **code** paths (e.g. `apps/api/src/auth/**`). Non-empty. |
| `impacts`| **Yes**  | array | List of **doc** paths impacted when `match` changes (e.g. `["docs/guides/auth.md"]`). At least one non-empty string per rule. |

### `patch`

| Field                     | Required | Type    | Default | Description |
|---------------------------|----------|---------|---------|-------------|
| `targets`                 | No       | array   | —       | List of doc file paths that may be updated by an autogen PR. Optional; if omitted for an **autogen** area, validation may emit a warning. |
| `requireHumanConfirmation`| No       | boolean | `false`| If `true`, the engine treats this area as human-in-the-loop (e.g. open an issue instead of auto-opening a PR). |

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
