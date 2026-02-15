# Using Docdrift in Another Repo

Once published to npm, any repo can use the CLI locally or in GitHub Actions.

## Setup

- **`npx @devinnn/docdrift setup`** — Interactive setup (requires `DEVIN_API_KEY`). Devin generates `docdrift.yaml`, `.docdrift/DocDrift.md`, and `.github/workflows/docdrift.yml`. Prerequisite: add your repo in Devin's Machine first.
- **`npx @devinnn/docdrift generate-yaml`** — Quick config generation for scripted use.
- **Manual** — Add `docdrift.yaml` manually (see [Configuration Reference](../../docdrift-yml.md)).

## CLI usage

```bash
npx @devinnn/docdrift validate
npx @devinnn/docdrift detect --base <base-sha> --head <head-sha>
# With env for run:
DEVIN_API_KEY=... GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo GITHUB_SHA=<sha> npx @devinnn/docdrift run --base <base-sha> --head <head-sha>
```

## GitHub Actions

Add a step that runs the CLI (e.g. after checkout and setting base/head):

```yaml
- run: npx @devinnn/docdrift run --base ${{ steps.shas.outputs.base }} --head ${{ steps.shas.outputs.head }}
  env:
    DEVIN_API_KEY: ${{ secrets.DEVIN_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_REPOSITORY: ${{ github.repository }}
    GITHUB_SHA: ${{ github.sha }}
```

Add repo secret `DEVIN_API_KEY`; `GITHUB_TOKEN` is provided by the runner.
