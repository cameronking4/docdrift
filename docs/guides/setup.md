# Setup Guide

Get `docdrift.yaml` and GitHub workflows in place. You can use **Manual** (local detection) or **Devin PR** (Devin creates a PR; you merge and pull).

## `docdrift setup` — Interactive setup

When you run `docdrift setup`, you choose:

| Option | Flow | Setup complete when |
| ------ | ---- | ------------------- |
| **Manual** | Local fingerprint + heuristic + a few questions → files written locally | `docdrift.yaml`, `.docdrift/DocDrift.md`, workflows, and `.gitignore` are written in your repo |
| **Devin PR** | Devin analyzes the repo, creates branch `docdrift/setup`, commits, and opens a PR | PR is created; you merge the PR and run `git pull` to get the files |

**Manual** does not require `DEVIN_API_KEY`. **Devin PR** requires `DEVIN_API_KEY` and the repo added in Devin's Machine.

For Devin PR, setup is complete once the PR exists. The CLI does not write any files locally; you get the PR URL and can optionally checkout the branch to review or edit before merging. After merging, run `git pull` to get the config.

## `docdrift generate-yaml` — Scriptable config generation

Same two paths (Manual vs Devin PR when interactive). With options for CI/scripted use:

| Option | Description |
| ------ | ----------- |
| `--output <path>` | Write config to path (default: `docdrift.yaml`) |
| `--force` | Overwrite existing file without prompting |
| `--open-pr` | (Devin path) Devin creates branch `docdrift/setup`, commits, pushes, and opens a PR |

```bash
# Interactive setup — choose Manual or Devin PR
npx @devinnn/docdrift setup

# Generate config (scriptable; non-interactive defaults to Manual)
npx @devinnn/docdrift generate-yaml
npx @devinnn/docdrift generate-yaml --output docdrift.yaml --force

# Generate config and have Devin open a PR
npx @devinnn/docdrift generate-yaml --open-pr
```

Parsing uses a strict output block (`<docdrift_setup_output>...</docdrift_setup_output>`) from the Devin session transcript, with a fallback to markdown blocks (`**docdriftYaml:**` + code fences) when needed.

## Next steps

- See [Configuration](configuration.md) for modes and spec providers
- See [Configuration Reference](../../docdrift-yml.md) for full `docdrift.yaml` schema
