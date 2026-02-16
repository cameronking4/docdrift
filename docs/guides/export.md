# docdrift export: DeepWiki Static Snapshot

Export DeepWiki documentation to static Markdown/MDX files for your docs site. The `export` command fetches wiki structure and contents via the DeepWiki MCP server and writes deterministic files with manifest-driven stable filenames.

## Quick start

```bash
# Export from current repo (infers repo from git remote)
npx @devinnn/docdrift export

# Export a specific repo
npx @devinnn/docdrift export --repo owner/repo

# Write to a custom directory
npx @devinnn/docdrift export --out docs

# Fail if secrets detected (recommended in CI)
npx @devinnn/docdrift export --fail-on-secrets
```

## Output structure

Export writes to `docs/deepwiki/` (or `--out/deepwiki`):

```
docs/deepwiki/
  _meta.json          # generatedAt, repo, sourceCommit
  nav.json            # hierarchy for Docusaurus/Next.js
  .docdrift-manifest.json   # pageId -> outPath mapping (stable filenames)
  pages/
    overview.mdx
    architecture.mdx
    ...
```

Each `.mdx` file includes frontmatter:

```yaml
---
title: "Architecture"
source: deepwiki
repo: owner/name
topic_id: <id>
generated: true
last_synced: "2026-02-15"
---
```

## Repo indexing

- **Public repos**: Index at [deepwiki.com](https://deepwiki.com) to make your repo available. No auth required for export.
- **Private repos**: Use a [Devin account](https://devin.ai/) and set `DEVIN_API_KEY`; the export will use the private MCP server at `mcp.devin.ai`.

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--repo owner/name` | Inferred from git | Target repository |
| `--out path` | `docs` | Output directory (deepwiki/ created inside) |
| `--mode local\|pr\|commit` | `local` | `pr` and `commit` planned for Phase 3 |
| `--server public\|private\|auto` | `auto` | MCP server: public (no auth) or private (DEVIN_API_KEY) |
| `--fail-on-secrets` | `true` in CI, `false` locally | Exit 1 if banned patterns detected |

## Fail-on-secrets

When `--fail-on-secrets` is enabled (or in CI), export scans content for:

- AWS keys (`AKIA...`)
- Private keys (`-----BEGIN PRIVATE KEY-----`)
- Token patterns (`ghp_`, `xoxb-`, `glpat-`)
- Internal domains (`.corp`, `.internal`, `svc.cluster.local`)
- Risky phrases (`password=`, `secret:`, etc.)

On match, the process exits with status 1 and reports the offending file and line.

## Steering with .devin/wiki.json

Add `.devin/wiki.json` in your repo to constrain what DeepWiki generates (public-safe config, page structure). docdrift export fetches whatever the MCP returns; the steering config is applied when DeepWiki indexes your repo.

## GitHub Action

```yaml
# .github/workflows/docdrift-export.yml
name: docdrift-export
on:
  schedule:
    - cron: "0 2 * * 0"  # weekly
  workflow_dispatch:
jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx @devinnn/docdrift export --fail-on-secrets
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Optional for private repos:
          # DEVIN_API_KEY: ${{ secrets.DEVIN_API_KEY }}
```
