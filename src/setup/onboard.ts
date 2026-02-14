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

const WORKFLOW_CONTENT =
  "name: docdrift\n\non:\n  push:\n    branches: [\"main\"]\n  pull_request:\n    branches: [\"main\"]\n  workflow_dispatch:\n\njobs:\n  docdrift:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: write\n      pull-requests: write\n      issues: write\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 0\n\n      - uses: actions/setup-node@v4\n        with:\n          node-version: \"20\"\n\n      - run: npm install\n\n      - name: Determine SHAs\n        id: shas\n        run: |\n          if [ \"${{ github.event_name }}\" = \"pull_request\" ]; then\n            HEAD_SHA=\"${{ github.event.pull_request.head.sha }}\"\n            BASE_SHA=\"${{ github.event.pull_request.base.sha }}\"\n          else\n            HEAD_SHA=\"${{ github.sha }}\"\n            BASE_SHA=\"${{ github.event.before }}\"\n            if [ -z \"$BASE_SHA\" ] || [ \"$BASE_SHA\" = \"0000000000000000000000000000000000000000\" ]; then\n              BASE_SHA=\"$(git rev-parse HEAD^)\"\n            fi\n          fi\n          echo \"head=${HEAD_SHA}\" >> $GITHUB_OUTPUT\n          echo \"base=${BASE_SHA}\" >> $GITHUB_OUTPUT\n          echo \"pr_number=${{ github.event.pull_request.number || '' }}\" >> $GITHUB_OUTPUT\n\n      - name: Validate config\n        run: npx docdrift validate\n\n      - name: Run Doc Drift\n        env:\n          DEVIN_API_KEY: ${{ secrets.DEVIN_API_KEY }}\n          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n          GITHUB_REPOSITORY: ${{ github.repository }}\n          GITHUB_SHA: ${{ github.sha }}\n          GITHUB_EVENT_NAME: ${{ github.event_name }}\n          GITHUB_PR_NUMBER: ${{ steps.shas.outputs.pr_number }}\n        run: |\n          PR_ARGS=\"\"\n          if [ -n \"$GITHUB_PR_NUMBER\" ]; then\n            PR_ARGS=\"--trigger pull_request --pr-number $GITHUB_PR_NUMBER\"\n          fi\n          npx docdrift run --base ${{ steps.shas.outputs.base }} --head ${{ steps.shas.outputs.head }} $PR_ARGS\n\n      - name: Upload artifacts\n        if: always()\n        uses: actions/upload-artifact@v4\n        with:\n          name: docdrift-artifacts\n          path: |\n            .docdrift/drift_report.json\n            .docdrift/metrics.json\n            .docdrift/run-output.json\n            .docdrift/evidence/**\n            .docdrift/state.json\n";

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

export function addGitHubWorkflow(cwd: string): void {
  const workflowsDir = path.resolve(cwd, ".github", "workflows");
  fs.mkdirSync(workflowsDir, { recursive: true });
  const workflowPath = path.join(workflowsDir, "docdrift.yml");
  fs.writeFileSync(workflowPath, WORKFLOW_CONTENT, "utf8");
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
  }

  return { created };
}
