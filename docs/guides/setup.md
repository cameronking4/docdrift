# Setup Guide

Get `docdrift.yaml` and GitHub workflows in place. Both setup options use Devin to analyze your repo.

## `docdrift setup` — Interactive setup

Interactive setup. Devin analyzes your repo and generates config (requires `DEVIN_API_KEY`). Produces:

- `docdrift.yaml`
- `.docdrift/DocDrift.md` (custom instructions)
- `.github/workflows/docdrift.yml` and `docdrift-sla-check.yml`
- Updates `.gitignore`

**Prerequisite:** Add your repo in Devin's Machine first.

Setup prompts Devin to emit a strict output block (`<docdrift_setup_output>...</docdrift_setup_output>`) so we can reliably parse config even when structured output is not populated. We also fall back to parsing markdown blocks (`**docdriftYaml:**` + `\`\`\`yaml`) when needed.

## `docdrift generate-yaml` — Scriptable config generation

Same Devin-backed config generation, with options for CI/scripted use:

| Option | Description |
| ------ | ----------- |
| `--output <path>` | Write config to path (default: `docdrift.yaml`) |
| `--force` | Overwrite existing file without prompting |
| `--open-pr` | Devin creates branch `docdrift/setup`, commits, pushes, and opens a PR |

```bash
# Interactive setup with Devin
npx @devinnn/docdrift setup

# Generate config (Devin session, scriptable)
npx @devinnn/docdrift generate-yaml
npx @devinnn/docdrift generate-yaml --output docdrift.yaml --force

# Generate config and have Devin open a PR
npx @devinnn/docdrift generate-yaml --open-pr
```

## Next steps

- See [Configuration](configuration.md) for modes and spec providers
- See [Configuration Reference](../../docdrift-yml.md) for full `docdrift.yaml` schema
