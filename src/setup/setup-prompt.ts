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
        "- Create docdrift.yaml, .docdrift/DocDrift.md, .github/workflows/docdrift.yml, .github/workflows/docdrift-baseline-update.yml in the repo",
        "- Commit with message: [docdrift] Add docdrift configuration",
        "- Push and open a PR to main with title: [docdrift] Add docdrift configuration",
        "- In the PR description, explain what was inferred (openapi export, docsite path, verification commands)",
        "- You MUST still emit the strict output block below in your final message so we can validate and show a summary.",
      ].join("\n")
    : "Do NOT create files in the repo. Only produce the strict output block below.";

  return [
    "You are Devin. Task: set up docdrift package and configuration for this repository. Docdrift is a package that helps you detect and remediate documentation drift with future Devin sessions.",
    "",
    "This repo is already loaded in your environment. Analyze it and produce the docdrift configuration files.",
    "",
    "ATTACHMENTS (read these for full reference):",
    "- 1: docdrift.schema.json — JSON Schema (types, validation, structure)",
    "- 2: docdrift-yml.md — full config reference, examples, pathMappings, policy",
    "- 3: docdrift.example.yaml — complete example config (adapt paths to the repo)",
    "",
    attachmentBlock(attachmentUrls),
    "",
    "REQUIREMENTS:",
    "",
    "1) docdrift.yaml (REQUIRED)",
    "   - Use version: 2",
    "   - Set docsite to your docs root (e.g. docs, apps/docs-site, content/docs)",
    "   - If OpenAPI/swagger exists or an export script exists:",
    "     * Include specProviders with format: openapi3",
    "     * current: { type: export, command: \"npm run <script>\", outputPath: \"path/to/generated.json\" }",
    "     * published: path to the PUBLISHED SPEC FILE (e.g. apps/docs-site/openapi/openapi.json), NOT the docsite root",
    "   - If NO OpenAPI/swagger/export script exists:",
    "     * Do NOT include specProviders",
    "     * Use pathMappings only (e.g. match: app/api/** impacts: [content/docs/**])",
    "   - devin: apiVersion v1, unlisted true, maxAcuLimit 2, tags [docdrift]",
    "   - If you find an OpenAPI/swagger file or export script, use it",
    "   - policy: prCaps, confidence, allowlist (paths Devin may edit), verification.commands (e.g. npm run docs:build, npm run build)",
    "   - Add schema comment at top: # yaml-language-server: $schema=https://unpkg.com/@devinnn/docdrift@latest/docdrift.schema.json",
    "   - lastKnownBaseline (optional): commit SHA where docs were last in sync. Blank = assume drift until first docdrift PR merge. Omit for first install; run `docdrift baseline set` after merging the first docdrift PR to update.",
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
    "   - Note: docdrift-sla-check.yml and docdrift-baseline-update.yml are added automatically",
    "   - docdrift-baseline-update: on PR closed (merged), when head ref is docdrift or docdrift/*, runs 'docdrift baseline set' and commits",
    "",
    "OUTPUT:",
    "Emit the strict output block below (required for parsing).",
    "- docdriftYaml: complete YAML string (no leading/trailing comments about the task)",
    "- docDriftMd: content for .docdrift/DocDrift.md, or empty string to omit",
    "- workflowYml: content for .github/workflows/docdrift.yml, or empty string to omit",
    "- summary: what you inferred (openapi export, docsite path, verification commands)",
    createFilesBlock,
    strictOutputBlock(),
  ].join("\n");
}
