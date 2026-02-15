/**
 * Prompt for Devin setup session — Devin analyzes the repo and generates
 * docdrift.yaml, DocDrift.md, and GitHub workflow. The repo is already in
 * Devin's Machine, so Devin has full context.
 */

/** XML tag used as strict delimiter for fallback parsing from chat transcript */
export const DOCDRIFT_SETUP_OUTPUT_TAG = "docdrift_setup_output";

function attachmentBlock(urls: string[]): string {
  return urls.map((url, i) => `- ATTACHMENT ${i + 1}: ${url}`).join("\n");
}

function strictOutputBlock(): string {
  return [
    "",
    "STRICT OUTPUT FORMAT (REQUIRED FOR PARSING):",
    "You MUST include this exact block in your final message so we can reliably parse it.",
    "Format: open with <" +
      DOCDRIFT_SETUP_OUTPUT_TAG +
      ">, then valid JSON, then close with </" +
      DOCDRIFT_SETUP_OUTPUT_TAG +
      ">.",
    "Example (escape quotes in strings as \\\"):",
    "",
    `<${DOCDRIFT_SETUP_OUTPUT_TAG}>`,
    '{"docdriftYaml":"# yaml...","docDriftMd":"# DocDrift...","workflowYml":"name: docdrift...","summary":"OpenAPI at..."}',
    `</${DOCDRIFT_SETUP_OUTPUT_TAG}>`,
    "",
    "Rules: Valid JSON only. Newlines in YAML/yml strings become \\n. Escape \" as \\\".",
  ].join("\n");
}

export function buildSetupPrompt(
  attachmentUrls: string[],
  options?: { openPr?: boolean }
): string {
  const openPr = options?.openPr ?? false;
  const createFilesBlock = openPr
    ? [
        "",
        "CREATE A PULL REQUEST:",
        "- Create branch docdrift/setup from main",
        "- Create docdrift.yaml, .docdrift/DocDrift.md, .github/workflows/docdrift.yml in the repo",
        "- Commit with message: [docdrift] Add docdrift configuration",
        "- Push and open a PR to main with title: [docdrift] Add docdrift configuration",
        "- In the PR description, explain what was inferred (openapi export, docsite path, verification commands)",
        "- You MUST still emit the strict output block below so we can validate the config",
      ].join("\n")
    : "Do NOT create files in the repo. Only produce the structured output and the strict output block.";

  return [
    "You are Devin. Task: set up docdrift for this repository.",
    "",
    "This repo is already loaded in your environment. Analyze it and produce the docdrift configuration files.",
    "",
    "ATTACHMENTS (read these for spec and schema):",
    attachmentBlock(attachmentUrls),
    "",
    "REQUIREMENTS:",
    "",
    "1) docdrift.yaml (REQUIRED)",
    "   - Use version: 2",
    "   - Use specProviders format with format: openapi3",
    "   - Infer: current (type: export, command, outputPath), published path",
    "   - Set docsite to your docs root (e.g. docs, apps/docs-site)",
    "   - devin: apiVersion v1, unlisted true, maxAcuLimit 2, tags [docdrift]",
    "   - If you find an OpenAPI/swagger file or export script, use it",
    "   - policy: prCaps, confidence, allowlist (paths Devin may edit), verification.commands (e.g. npm run docs:build, npm run build)",
    "   - Add schema comment at top: # yaml-language-server: $schema=https://unpkg.com/@devinnn/docdrift/docdrift.schema.json",
    "",
    "2) .docdrift/DocDrift.md (RECOMMENDED)",
    "   - Starter custom instructions: PR title prefix [docdrift], tone, project-specific guidance",
    "   - If you include this, set devin.customInstructions: [.docdrift/DocDrift.md] in docdrift.yaml",
    "",
    "3) .github/workflows/docdrift.yml (RECOMMENDED)",
    "   - CRITICAL: Use npx @devinnn/docdrift (not npx docdrift)",
    "   - Steps: checkout, setup-node 20, Determine SHAs (base/head for push or PR), Validate config, Run Doc Drift",
    "   - Env: DEVIN_API_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA",
    "   - Skip when PR head ref starts with docdrift/ (avoid feedback loop)",
    "   - Upload .docdrift artifacts (drift_report.json, metrics.json, evidence, state.json)",
    "   - Note: docdrift-sla-check.yml (daily cron for PRs open 7+ days) is added automatically",
    "",
    "OUTPUT:",
    "Emit your final output in the provided structured output schema if possible.",
    "- docdriftYaml: complete YAML string (no leading/trailing comments about the task)",
    "- docDriftMd: content for .docdrift/DocDrift.md, or empty string to omit",
    "- workflowYml: content for .github/workflows/docdrift.yml, or empty string to omit",
    "- summary: what you inferred (openapi export, docsite path, verification commands)",
    createFilesBlock,
    strictOutputBlock(),
  ].join("\n");
}
