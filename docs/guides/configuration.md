# Configuration

Modes, spec providers, and key config concepts.

## Auto vs strict modes

| Mode | When drift is detected | Use case |
| ---- | ---------------------- | -------- |
| **strict** (default) | Only when **spec drift** is detected (OpenAPI, GraphQL, etc.). No spec drift → no Devin session. | API-first teams; gate only on real API changes. |
| **auto** | Also runs when **pathMappings** match (changed files hit `match` patterns) even if no spec drift. Devin infers docs from file changes. | Conceptual docs, guides, or path-only setups. |

```yaml
# docdrift.yaml
mode: strict   # only on spec drift
# or
mode: auto     # also on pathMapping matches
```

## Branch strategy (single branch / low noise)

By default, docdrift uses a **single branch** for all runs to minimize PR noise:

| Strategy | Default | Behavior |
| -------- | ------- | -------- |
| **`single`** | Yes | One branch (e.g. `docdrift`) for all runs. If an open PR from that branch exists, Devin updates it instead of opening a new one. |
| **`per-pr`** | No | One branch per source PR (e.g. `docdrift-abc1234`). Each upstream PR gets its own docdrift PR. |

```yaml
# docdrift.yaml — explicit low-noise (default)
branchStrategy: single
branchPrefix: docdrift
```

See [docdrift.yaml reference](../../docdrift-yml.md#branch-strategy-single-branch--low-noise) for details.

## Spec providers

Docdrift supports several API spec formats. Configure via `specProviders`:

| Format | Description |
| ------ | ----------- |
| **openapi3** | OpenAPI 3.x (default) |
| **swagger2** | OpenAPI 2.0 / Swagger 2.0 |
| **graphql** | GraphQL schema |
| **fern** | Fern API definition |
| **postman** | Postman Collection JSON |

Each provider defines `current` (source of truth: `export`, `local`, or `url`) and `published` (docs path to update):

```yaml
specProviders:
  - format: openapi3
    current:
      type: export
      command: "npm run openapi:export"
      outputPath: "openapi/generated.json"
    published: "apps/docs-site/openapi/openapi.json"
```

## Baseline drift detection (`lastKnownBaseline`)

When `lastKnownBaseline` is set to a commit SHA, docdrift compares the current exported spec to the **published OpenAPI spec at that commit**. If they differ, drift is detected (API changed since last sync). When blank, we assume drift (first install). The `docdrift-baseline-update` workflow updates it automatically when a docdrift PR is merged.

```yaml
# docdrift.yaml
lastKnownBaseline: abc123   # optional; omit for first install
```

See [docdrift.yaml — lastKnownBaseline](../../docdrift-yml.md#lastknownbaseline-baseline-drift-detection) for full details.

## Full configuration reference

For every field, schema, and validation rule, see [docdrift.yaml Reference](../../docdrift-yml.md).
