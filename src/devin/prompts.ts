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
  const base = [
    "You are Devin. Task: update the entire docsite to match the API and code changes.",
    "",
    "EVIDENCE (attachments):",
    input.attachmentUrls.map((url, i) => `- ATTACHMENT ${i + 1}: ${url}`).join("\n"),
    "",
    "Rules (hard):",
    `1) Only modify files under: ${input.config.policy.allowlist.join(", ")}`,
    "2) Make the smallest change that makes docs correct.",
    "3) Update API reference (OpenAPI) and any impacted guides in one PR.",
    "4) Run verification commands and record results:",
    ...input.config.policy.verification.commands.map((c) => `   - ${c}`),
    "5) Open exactly ONE pull request with a clear title and reviewer-friendly description.",
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
