import fs from "node:fs";
import path from "node:path";
import type { OnboardingChoices } from "./interactive-form";

const DOCDRIFT_DIR = ".docdrift";
const CUSTOM_INSTRUCTIONS_FILE = ".docdrift/DocDrift.md";
const GITIGNORE_BLOCK = `
# Docdrift run artifacts
.docdrift/evidence
.docdrift/*.log
.docdrift/state.json
.docdrift/run-output.json
`;

const WORKFLOW_CONTENT = `name: docdrift

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]
  workflow_dispatch:

jobs:
  docdrift:
    if: github.event_name != 'pull_request' || !startsWith(github.event.pull_request.head.ref, 'docdrift/')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - run: npm install

      - name: Determine SHAs
        id: shas
        run: |
          if [ "\$\{\{ github.event_name \}\}" = "pull_request" ]; then
            HEAD_SHA="\$\{\{ github.event.pull_request.head.sha \}\}"
            BASE_SHA="\$\{\{ github.event.pull_request.base.sha \}\}"
          else
            HEAD_SHA="\$\{\{ github.sha \}\}"
            BASE_SHA="\$\{\{ github.event.before \}\}"
            if [ -z "$BASE_SHA" ] || [ "$BASE_SHA" = "0000000000000000000000000000000000000000" ]; then
              BASE_SHA="$(git rev-parse HEAD^)"
            fi
          fi
          echo "head=\${HEAD_SHA}" >> $GITHUB_OUTPUT
          echo "base=\${BASE_SHA}" >> $GITHUB_OUTPUT
          echo "pr_number=\$\{\{ github.event.pull_request.number || '' \}\}" >> $GITHUB_OUTPUT

      - name: Restore docdrift state
        uses: actions/cache/restore@v4
        id: docdrift-cache
        with:
          path: .docdrift
          key: docdrift-state-\$\{\{ github.event_name \}\}-\$\{\{ github.event.pull_request.number || 'main' \}\}-\$\{\{ github.run_id \}\}
          restore-keys: |
            docdrift-state-\$\{\{ github.event_name \}\}-\$\{\{ github.event.pull_request.number || 'main' \}\}-

      - name: Validate config
        run: npx @devinnn/docdrift validate

      - name: Run Doc Drift
        env:
          DEVIN_API_KEY: \$\{\{ secrets.DEVIN_API_KEY \}\}
          GITHUB_TOKEN: \$\{\{ secrets.GITHUB_TOKEN \}\}
          GITHUB_REPOSITORY: \$\{\{ github.repository \}\}
          GITHUB_SHA: \$\{\{ github.sha \}\}
          GITHUB_EVENT_NAME: \$\{\{ github.event_name \}\}
          GITHUB_PR_NUMBER: \$\{\{ steps.shas.outputs.pr_number \}\}
        run: |
          PR_ARGS=""
          if [ -n "$GITHUB_PR_NUMBER" ]; then
            PR_ARGS="--trigger pull_request --pr-number $GITHUB_PR_NUMBER"
          fi
          npx @devinnn/docdrift run --base \$\{\{ steps.shas.outputs.base \}\} --head \$\{\{ steps.shas.outputs.head \}\} $PR_ARGS

      - name: Save docdrift state
        if: always()
        uses: actions/cache/save@v4
        with:
          path: .docdrift
          key: docdrift-state-\$\{\{ github.event_name \}\}-\$\{\{ github.event.pull_request.number || 'main' \}\}-\$\{\{ github.run_id \}\}

      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: docdrift-artifacts
          path: |
            .docdrift/drift_report.json
            .docdrift/metrics.json
            .docdrift/run-output.json
            .docdrift/evidence/**
            .docdrift/state.json
`;

const SLA_CHECK_WORKFLOW_CONTENT = `name: docdrift-sla-check

on:
  schedule:
    # Run daily at 09:00 UTC (checks for doc-drift PRs open 7+ days)
    - cron: "0 9 * * *"
  workflow_dispatch:

jobs:
  sla-check:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - run: npm install

      - name: Validate config
        run: npx @devinnn/docdrift validate

      - name: Run SLA check
        env:
          GITHUB_TOKEN: \$\{\{ secrets.GITHUB_TOKEN \}\}
          GITHUB_REPOSITORY: \$\{\{ github.repository \}\}
        run: npx @devinnn/docdrift sla-check
`;

export function ensureDocdriftDir(cwd: string): void {
  const dir = path.resolve(cwd, DOCDRIFT_DIR);
  fs.mkdirSync(dir, { recursive: true });
}

const CUSTOM_INSTRUCTIONS_TEMPLATE = `# DocDrift custom instructions

- **PR titles:** Start every pull request title with \`[docdrift]\`.
- Add project-specific guidance for Devin here (e.g. terminology, tone, what to avoid).
`;

export function createCustomInstructionsFile(cwd: string): void {
  const filePath = path.resolve(cwd, CUSTOM_INSTRUCTIONS_FILE);
  ensureDocdriftDir(cwd);
  fs.writeFileSync(filePath, CUSTOM_INSTRUCTIONS_TEMPLATE.trimStart(), "utf8");
}

const GITIGNORE_ENTRIES = [
  ".docdrift/evidence",
  ".docdrift/*.log",
  ".docdrift/state.json",
  ".docdrift/run-output.json",
];

function hasGitignoreBlock(content: string): boolean {
  return GITIGNORE_ENTRIES.every((e) => content.includes(e));
}

export function ensureGitignore(cwd: string): void {
  const gitignorePath = path.resolve(cwd, ".gitignore");
  let content = "";
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, "utf8");
    if (hasGitignoreBlock(content)) return;
  }
  const toAppend = content.endsWith("\n") ? GITIGNORE_BLOCK.trimStart() : GITIGNORE_BLOCK;
  fs.writeFileSync(gitignorePath, content + toAppend, "utf8");
}

export function addSlaCheckWorkflow(cwd: string): void {
  const workflowsDir = path.resolve(cwd, ".github", "workflows");
  fs.mkdirSync(workflowsDir, { recursive: true });
  fs.writeFileSync(path.join(workflowsDir, "docdrift-sla-check.yml"), SLA_CHECK_WORKFLOW_CONTENT, "utf8");
}

export function addGitHubWorkflow(cwd: string): void {
  const workflowsDir = path.resolve(cwd, ".github", "workflows");
  fs.mkdirSync(workflowsDir, { recursive: true });
  fs.writeFileSync(path.join(workflowsDir, "docdrift.yml"), WORKFLOW_CONTENT, "utf8");
  addSlaCheckWorkflow(cwd);
}

export function runOnboarding(cwd: string, choices: OnboardingChoices): { created: string[] } {
  const created: string[] = [];
  ensureDocdriftDir(cwd);
  created.push(".docdrift/");

  if (choices.addCustomInstructions) {
    createCustomInstructionsFile(cwd);
    created.push("DocDrift.md");
  }

  if (choices.addGitignore) {
    ensureGitignore(cwd);
    created.push(".gitignore");
  }

  if (choices.addWorkflow) {
    addGitHubWorkflow(cwd);
    created.push(".github/workflows/docdrift.yml");
    created.push(".github/workflows/docdrift-sla-check.yml");
  }

  return { created };
}
