import type { NormalizedDocDriftConfig } from "../config/schema";
import { AggregatedDriftResult, DriftItem } from "../model/types";

interface PromptInput {
  item: DriftItem;
  attachmentUrls: string[];
  verificationCommands: string[];
  allowlist: string[];
  confidenceThreshold: number;
  customAppend?: string;
}

function attachmentBlock(attachmentUrls: string[]): string {
  return attachmentUrls.map((url, index) => `- ATTACHMENT ${index + 1}: ${url}`).join("\n");
}

export function buildAutogenPrompt(input: PromptInput): string {
  const base = [
    "You are Devin. Task: update API reference docs to match actual code/spec changes.",
    "",
    "EVIDENCE (attachments):",
    attachmentBlock(input.attachmentUrls),
    "",
    "Rules (hard):",
    `1) Only modify files under: ${input.allowlist.join(", ")}`,
    "2) Make the smallest change that makes docs correct.",
    "3) Run verification commands and record results:",
    ...input.verificationCommands.map((cmd) => `   - ${cmd}`),
    "4) Open ONE pull request for this doc area with a clear title.",
    "5) Keep a reviewer-friendly PR description: what changed, why docs were wrong, how to validate.",
    "",
    "Structured Output:",
    "- Maintain structured output in the provided JSON schema.",
    "- Update it immediately when you:",
    "  a) finish planning (filesToEdit, summary, confidence),",
    "  b) begin editing (status=EDITING),",
    "  c) start/finish verification (status=VERIFYING + verification.results),",
    "  d) open PR (status=OPENED_PR + pr.url),",
    "  e) get blocked (status=BLOCKED + questions),",
    "  f) complete (status=DONE).",
    "",
    `Goal: Produce a PR for doc area ${input.item.docArea} using only the evidence.`,
  ].join("\n");
  if (input.customAppend) {
    return base + "\n\n---\n\nCustom instructions:\n\n" + input.customAppend;
  }
  return base;
}

export function buildConceptualPrompt(input: PromptInput): string {
  const base = [
    "You are Devin. Task: propose minimal edits to conceptual docs potentially impacted by code changes. i..e GUIDES",
    "",
    "EVIDENCE (attachments):",
    attachmentBlock(input.attachmentUrls),
    "",
    "Rules (hard):",
    `1) Only modify files under: ${input.allowlist.join(", ")}`,
    "2) Do NOT invent product policy. If unclear, ask 2-3 targeted questions instead of guessing.",
    `3) Prefer OPEN_ISSUE when confidence < ${input.confidenceThreshold.toFixed(2)}.`,
    "4) If you open a PR, keep it extremely small and include a checklist of assumptions.",
    "",
    "Structured Output:",
    "- Update at planning, editing, verifying, open-pr, blocked, done milestones.",
    "- If blocked, fill blocked.questions with concrete, reviewer-actionable questions.",
    "",
    "Goal: either open a very small PR with confidence or open an issue/comment with crisp questions and suggested patch text.",
  ].join("\n");
  if (input.customAppend) {
    return base + "\n\n---\n\nCustom instructions:\n\n" + input.customAppend;
  }
  return base;
}

/** Whole-docsite prompt for single-session runs */
export function buildWholeDocsitePrompt(input: {
  aggregated: AggregatedDriftResult;
  config: NormalizedDocDriftConfig;
  attachmentUrls: string[];
  runGate?: "spec_export_invalid" | "spec_drift" | "conceptual_only" | "infer" | "none";
  trigger?: "push" | "manual" | "schedule" | "pull_request";
  prNumber?: number;
  /** When set, Devin must UPDATE this existing PR instead of opening a new one */
  existingDocdriftPr?: { number: number; url: string; headRef: string };
  branchPrefix: string;
  branchStrategy: "single" | "per-pr";
}): string {
  const excludeNote =
    input.config.exclude?.length > 0
      ? `\n6) NEVER modify files matching these patterns: ${input.config.exclude.join(", ")}`
      : "";
  const requireReviewNote =
    input.config.requireHumanReview?.length > 0
      ? `\n7) If you touch files under: ${input.config.requireHumanReview.join(", ")} — note it in the PR description (a follow-up issue will flag for human review).`
      : "";
  const allowNewFiles = input.config.policy.allowNewFiles ?? false;
  const newFilesRule = allowNewFiles
    ? "8) You MAY add new articles, create new folders, and change information architecture when warranted."
    : "8) You may ONLY edit existing files. Do NOT create new files, new articles, or new folders. Do NOT change information architecture.";
  const driftSummary = input.aggregated.summary?.trim();
  const openapiPublished = input.config.openapi?.published;
  const openapiGenerated = input.config.openapi?.generated;
  const specLine =
    openapiPublished && openapiGenerated
      ? `Update ${openapiPublished} to match the generated spec (${openapiGenerated}). The attachments contain the full diff.`
      : "Update published docs to match the evidence (attachments).";
  const driftBlock =
    driftSummary &&
    [
      "DRIFT DETECTED (you must fix this):",
      "---",
      driftSummary,
      "---",
      specLine,
      "",
    ].join("\n");

  const specExportInvalidBlock =
    input.runGate === "spec_export_invalid"
      ? [
          "SPEC EXPORT INVALID (fix before updating docs):",
          "---",
          "The spec export is incomplete. The exported spec does not accurately reflect the implementation (e.g. missing requestBody on POST endpoints, feature-flagged params, preview flags).",
          "---",
          driftSummary ? `Issues: ${driftSummary}` : "See attachments for validation details.",
          "---",
          "You MUST complete these steps IN ORDER:",
          "1) Fix the spec source: Edit route annotations (@swagger), export script, or schema definitions under the path mappings (see PATH MAPPINGS below—the match paths are where the API/spec source lives). Add missing requestBody, parameters, or schemas so the export produces a complete spec.",
          "2) Run the export command (see verification commands below).",
          "3) Update the published spec and docs to match the newly generated spec.",
          "",
        ].join("\n")
      : "";

  const inferBlock =
    input.runGate === "infer"
      ? [
          "INFER MODE: No API spec diff was available. These file changes may impact docs.",
          "Infer what documentation might need updates from the changed files. Update or create docs as needed.",
          "Do NOT invent APIs; only document what you can infer from the code changes.",
          "",
        ].join("\n")
      : "";

  const branchBlock = (() => {
    if (input.branchStrategy === "single") {
      // Single-branch strategy: always use branchPrefix, sync with main, update existing PR if it exists
      if (input.existingDocdriftPr) {
        return [
          "",
          "CRITICAL: An existing doc-drift PR already exists.",
          `You MUST UPDATE that PR — do NOT create a new one.`,
          `- Existing PR: #${input.existingDocdriftPr.number} (${input.existingDocdriftPr.url})`,
          `- Branch to update: ${input.existingDocdriftPr.headRef}`,
          "Checkout that branch, pull latest main, apply your doc changes, push. The existing PR will update.",
          "Do NOT open a new pull request.",
          "",
        ].join("\n");
      }
      return [
        "",
        `Use branch name ${input.branchPrefix}. Create from main if it doesn't exist.`,
        "Pull latest main, apply your doc changes, push.",
        `If a PR from branch ${input.branchPrefix} exists, update it; otherwise create one.`,
        "",
      ].join("\n");
    } else {
      // Per-pr strategy: one branch per source PR
      if (input.trigger !== "pull_request" || !input.prNumber) return "";
      if (input.existingDocdriftPr) {
        return [
          "",
          "CRITICAL: An existing doc-drift PR already exists for this API PR.",
          `You MUST UPDATE that PR — do NOT create a new one.`,
          `- Existing PR: #${input.existingDocdriftPr.number} (${input.existingDocdriftPr.url})`,
          `- Branch to update: ${input.existingDocdriftPr.headRef}`,
          "Checkout that branch, pull latest main, apply your doc changes, push. The existing PR will update.",
          "Do NOT open a new pull request.",
          "",
        ].join("\n");
      }
      return [
        "",
        "This run was triggered by an open API PR. Open a **draft** pull request.",
        `In the PR description, link to the API PR (#${input.prNumber}) and state: "Merge the API PR first, then review this doc PR."`,
        `Use branch name ${input.branchPrefix}/pr-${input.prNumber} (required for future runs to update this PR).`,
        "",
      ].join("\n");
    }
  })();

  const pathMappings = input.config.pathMappings ?? [];
  const pathMappingsBlock =
    pathMappings.length > 0
      ? [
          "PATH MAPPINGS (when these code paths change, consider these docs for updates):",
          ...pathMappings.map(
            (p) => `- ${p.match} → ${p.impacts.join(", ")}`
          ),
          "",
        ].join("\n")
      : "";

  // When spec_export_invalid, merge pathMappings match paths into allowlist so Devin can edit spec source
  const effectiveAllowlist =
    input.runGate === "spec_export_invalid" && pathMappings.length > 0
      ? [...new Set([...input.config.policy.allowlist, ...pathMappings.map((p) => p.match)])]
      : input.config.policy.allowlist;

  const base = [
    "You are Devin. Task: update the entire docsite to match the API and code changes.",
    "",
    specExportInvalidBlock,
    driftBlock ?? "",
    inferBlock,
    pathMappingsBlock,
    "EVIDENCE (attachments):",
    input.attachmentUrls.map((url, i) => `- ATTACHMENT ${i + 1}: ${url}`).join("\n"),
    "",
    "Rules (hard):",
    `1) Only modify files under: ${effectiveAllowlist.join(", ")}`,
    "2) Make the smallest change that makes docs correct.",
    "3) Update API reference (OpenAPI) and any impacted guides in one PR.",
    "4) Run verification commands and record results:",
    ...input.config.policy.verification.commands.map((c) => `   - ${c}`),
    "5) Open exactly ONE pull request with a clear title and reviewer-friendly description." +
      branchBlock,
    `6) Docsite scope: ${input.config.docsite.join(", ")}` +
      excludeNote +
      requireReviewNote +
      `\n${newFilesRule}`,
    "",
    "Structured Output:",
    "- Maintain structured output in the provided JSON schema.",
    "- Update it at: planning, editing, verifying, open-pr, blocked, done.",
    "- If blocked, fill blocked.questions with concrete questions.",
    "",
    "Goal: Produce ONE PR that updates the whole docsite (API reference + guides) using only the evidence.",
  ].join("\n");
  if (input.config.devin.customInstructionContent) {
    return base + "\n\n---\n\nCustom instructions:\n\n" + input.config.devin.customInstructionContent;
  }
  return base;
}
