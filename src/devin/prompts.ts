import { DriftItem } from "../model/types";

interface PromptInput {
  item: DriftItem;
  attachmentUrls: string[];
  verificationCommands: string[];
  allowlist: string[];
  confidenceThreshold: number;
}

function attachmentBlock(attachmentUrls: string[]): string {
  return attachmentUrls.map((url, index) => `- ATTACHMENT ${index + 1}: ${url}`).join("\n");
}

export function buildAutogenPrompt(input: PromptInput): string {
  return [
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
    `Goal: Produce a PR for doc area ${input.item.docArea} using only the evidence.`
  ].join("\n");
}

export function buildConceptualPrompt(input: PromptInput): string {
  return [
    "You are Devin. Task: propose minimal edits to conceptual docs potentially impacted by code changes.",
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
    "Goal: either open a very small PR with confidence or open an issue/comment with crisp questions and suggested patch text."
  ].join("\n");
}
