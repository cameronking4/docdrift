# Setup Guide

Get `docdrift.yaml` and GitHub workflows in place. Both setup options use Devin to analyze your repo.

## `docdrift setup` — Interactive setup

Interactive setup. Devin analyzes your repo and generates config (requires `DEVIN_API_KEY`). Produces:

- `docdrift.yaml`
- `.docdrift/DocDrift.md` (custom instructions)
- `.github/workflows/docdrift.yml` and `docdrift-sla-check.yml`
- Updates `.gitignore`

**Prerequisite:** Add your repo in Devin's Machine first.

## `docdrift generate-yaml` — Scriptable config generation

Same Devin-backed config generation, with options for CI/scripted use:

| Option | Description |
| ------ | ----------- |
| `--output <path>` | Write config to path (default: `docdrift.yaml`) |
| `--force` | Overwrite existing file without prompting |

```bash
# Interactive setup with Devin
npx @devinnn/docdrift setup

# Generate config (Devin session, scriptable)
npx @devinnn/docdrift generate-yaml
npx @devinnn/docdrift generate-yaml --output docdrift.yaml --force
```

## Next steps

- See [Configuration](configuration.md) for modes and spec providers
- See [Configuration Reference](../../docdrift-yml.md) for full `docdrift.yaml` schema
