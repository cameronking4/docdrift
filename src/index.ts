import path from "path";
import type { DocAreaConfig } from "./config/schema";
import { loadConfig, loadNormalizedConfig } from "./config/load";
import { validateRuntimeConfig } from "./config/validate";
import { buildDriftReport, type RunGate } from "./detect";
import { buildEvidenceBundle, writeMetrics } from "./evidence/bundle";
import {
  createIssue,
  findExistingDocdriftPrByBranch,
  findExistingDocdriftPrForSource,
  listOpenPrsWithLabel,
  postCommitComment,
  postPrComment,
  renderBlockedIssueBody,
  renderRequireHumanReviewIssueBody,
  renderRunComment,
  renderSlaIssueBody,
} from "./github/client";
import { RunResult } from "./model/types";
import { decidePolicy, applyDecisionToState } from "./policy/engine";
import { loadState, saveState } from "./policy/state";
import { logInfo, logWarn } from "./utils/log";
import { buildAutogenPrompt, buildConceptualPrompt, buildWholeDocsitePrompt } from "./devin/prompts";
import { matchesGlob } from "./utils/glob";
import { PatchPlanSchema } from "./devin/schemas";
import {
  devinCreateSession,
  devinListSessions,
  devinUploadAttachment,
  pollUntilTerminal,
} from "./devin/v1";

interface DetectOptions {
  baseSha: string;
  headSha: string;
  trigger?: "push" | "manual" | "schedule" | "pull_request";
  prNumber?: number;
}

interface SessionOutcome {
  outcome: "PR_OPENED" | "ISSUE_OPENED" | "NO_CHANGE" | "BLOCKED";
  summary: string;
  sessionUrl?: string;
  prUrl?: string;
  issueUrl?: string;
  questions?: string[];
  verification: Array<{ command: string; result: string }>;
}

function parseStructured(session: any): any {
  return session?.structured_output ?? session?.data?.structured_output ?? {};
}

function inferPrUrl(session: any, structured: any): string | undefined {
  if (typeof structured?.pr?.url === "string") {
    return structured.pr.url;
  }
  if (typeof session?.pull_request_url === "string") {
    return session.pull_request_url;
  }
  if (typeof session?.pr_url === "string") {
    return session.pr_url;
  }
  return undefined;
}

function inferQuestions(structured: any): string[] {
  const questions = structured?.blocked?.questions;
  if (Array.isArray(questions)) {
    return questions.map(String);
  }
  return [
    "Which conceptual docs should be updated for this behavior change?",
    "What are the exact user-visible semantics after this merge?",
  ];
}

/** True when we have a real GitHub repo and a full commit SHA (e.g. in CI). Skip commit comment when false (local run). */
function canPostCommitComment(repository: string, commitSha: string): boolean {
  if (!repository || repository === "local/docdrift") return false;
  return /^[0-9a-f]{40}$/i.test(commitSha);
}

async function executeSessionSingle(input: {
  apiKey: string;
  repository: string;
  item: { docArea: string; mode: string };
  aggregated: import("./model/types").AggregatedDriftResult;
  attachmentPaths: string[];
  config: import("./config/schema").NormalizedDocDriftConfig;
  runGate: import("./detect").RunGate;
  trigger: import("./model/types").TriggerKind;
  prNumber?: number;
  existingDocdriftPr?: { number: number; url: string; headRef: string };
  branchPrefix: string;
  branchStrategy: "single" | "per-pr";
}): Promise<SessionOutcome> {
  const attachmentUrls: string[] = [];
  for (const attachmentPath of input.attachmentPaths) {
    const url = await devinUploadAttachment(input.apiKey, attachmentPath);
    attachmentUrls.push(url);
  }

  const prompt = buildWholeDocsitePrompt({
    repository: input.repository,
    aggregated: input.aggregated,
    config: input.config,
    attachmentUrls,
    runGate: input.runGate,
    trigger: input.trigger,
    prNumber: input.prNumber,
    existingDocdriftPr: input.existingDocdriftPr,
    branchPrefix: input.branchPrefix,
    branchStrategy: input.branchStrategy,
  });

  const session = await devinCreateSession(input.apiKey, {
    prompt,
    unlisted: input.config.devin.unlisted,
    max_acu_limit: input.config.devin.maxAcuLimit,
    tags: [...new Set([...(input.config.devin.tags ?? []), "docdrift", input.item.docArea])],
    attachments: attachmentUrls,
    structured_output: {
      schema: PatchPlanSchema,
    },
    metadata: {
      repository: input.repository,
      docArea: input.item.docArea,
      mode: input.item.mode,
    },
  });

  const finalSession = await pollUntilTerminal(input.apiKey, session.session_id);
  const structured = parseStructured(finalSession);
  const status = String(finalSession.status_enum ?? finalSession.status ?? "").toLowerCase();
  const prUrl = inferPrUrl(finalSession, structured);
  const verificationCommands = Array.isArray(structured?.verification?.commands)
    ? structured.verification.commands.map(String)
    : input.config.policy.verification.commands;
  const verificationResults = Array.isArray(structured?.verification?.results)
    ? structured.verification.results.map(String)
    : verificationCommands.map(() => "not reported");

  const verification = verificationCommands.map((command: string, idx: number) => ({
    command,
    result: verificationResults[idx] ?? "not reported",
  }));

  if (prUrl) {
    return {
      outcome: "PR_OPENED",
      summary: String(structured?.summary ?? "PR opened by Devin"),
      sessionUrl: session.url,
      prUrl,
      verification,
    };
  }

  if (status === "blocked" || structured?.status === "BLOCKED") {
    return {
      outcome: "BLOCKED",
      summary: String(structured?.blocked?.reason ?? structured?.summary ?? "Session blocked"),
      sessionUrl: session.url,
      questions: inferQuestions(structured),
      verification,
    };
  }

  return {
    outcome: "NO_CHANGE",
    summary: String(structured?.summary ?? "Session completed without PR"),
    sessionUrl: session.url,
    verification,
  };
}

/** Human-friendly label for run gate (used in detect output) */
function runGateLabel(gate: RunGate): string {
  switch (gate) {
    case "spec_export_invalid":
      return "spec export incomplete";
    case "spec_drift":
      return "API spec drift";
    case "baseline_drift":
      return "baseline drift (API changed since last sync)";
    case "baseline_missing":
      return "baseline missing (assuming drift)";
    case "conceptual_only":
      return "path heuristics (no spec changes)";
    case "infer":
      return "inferred from file changes";
    case "none":
      return "none";
    default:
      return gate;
  }
}

/** Format signal kinds for display (e.g. openapi_diff → OpenAPI) */
function signalKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    spec_export_incomplete: "Spec export incomplete",
    openapi_diff: "OpenAPI",
    swagger2_diff: "Swagger 2",
    graphql_diff: "GraphQL",
    fern_diff: "Fern",
    postman_diff: "Postman",
    heuristic_path_impact: "Path heuristics",
    infer_mode: "Inferred",
    baseline_missing: "Baseline missing",
    baseline_drift: "Baseline drift",
  };
  return labels[kind] ?? kind;
}

export async function runDetect(options: DetectOptions): Promise<{ hasDrift: boolean }> {
  const config = loadConfig();
  const runtimeValidation = await validateRuntimeConfig(config);
  if (runtimeValidation.errors.length) {
    throw new Error(`Config validation failed:\n${runtimeValidation.errors.join("\n")}`);
  }
  const repo = process.env.GITHUB_REPOSITORY ?? "local/docdrift";
  const normalized = loadNormalizedConfig();

  const { report, runGate } = await buildDriftReport({
    config: normalized,
    repo,
    baseSha: options.baseSha,
    headSha: options.headSha,
    trigger: options.trigger ?? "manual",
    prNumber: options.prNumber,
  });

  if (report.items.length === 0) {
    logInfo("No documentation drift detected.");
    return { hasDrift: false };
  }

  const item = report.items[0]!;
  const gateLabel = runGateLabel(runGate);
  const signalLabels = [...new Set(item.signals.map((s) => signalKindLabel(s.kind)))].filter(Boolean);
  const sources = signalLabels.length > 0 ? signalLabels.join(", ") : gateLabel;

  logInfo("Documentation drift detected");
  console.log("");
  console.log("  What changed: " + (item.summary || "Docs are out of sync with code."));
  console.log("  Source:       " + sources);
  if (item.impactedDocs.length > 0) {
    const shown = item.impactedDocs.slice(0, 5);
    const more = item.impactedDocs.length - shown.length;
    const docList = shown.join(", ") + (more > 0 ? ` (+${more} more)` : "");
    console.log("  Impacted:     " + docList);
  }
  console.log("");
  logInfo("Next step: run `npx @devinnn/docdrift run` to remediate.");
  return { hasDrift: true };
}

export async function runDocDrift(options: DetectOptions): Promise<RunResult[]> {
  const config = loadConfig();
  const runtimeValidation = await validateRuntimeConfig(config);
  if (runtimeValidation.errors.length) {
    throw new Error(`Config validation failed:\n${runtimeValidation.errors.join("\n")}`);
  }
  const normalized = loadNormalizedConfig();
  const repo = process.env.GITHUB_REPOSITORY ?? "local/docdrift";
  const commitSha = process.env.GITHUB_SHA ?? options.headSha;
  const githubToken = process.env.GITHUB_TOKEN;
  const devinApiKey = process.env.DEVIN_API_KEY;

  const { report, aggregated, runInfo, evidenceRoot, runGate } =
    await buildDriftReport({
      config: normalized,
      repo,
      baseSha: options.baseSha,
      headSha: options.headSha,
      trigger: options.trigger ?? "manual",
      prNumber: options.prNumber,
    });

  // Gate: no run (spec drift, conceptual-only, or infer) — exit early, no session
  if (runGate === "none" || report.items.length === 0) {
    logInfo("No drift; skipping session");
    return [];
  }

  const item = report.items[0]!;
  const docAreaConfig: DocAreaConfig = {
    name: "docsite",
    mode: "autogen",
    owners: { reviewers: [] },
    detect: { openapi: { exportCmd: normalized.openapi.export, generatedPath: normalized.openapi.generated, publishedPath: normalized.openapi.published }, paths: [] },
    patch: { targets: [], requireHumanConfirmation: false },
  };

  let state = loadState();
  const startedAt = Date.now();
  const results: RunResult[] = [];
  const metrics = {
    driftItemsDetected: 1,
    prsOpened: 0,
    issuesOpened: 0,
    blockedCount: 0,
    timeToSessionTerminalMs: [] as number[],
    docAreaCounts: { docsite: 1 },
    noiseRateProxy: 0,
  };

  const decision = decidePolicy({
    item,
    docAreaConfig,
    config,
    state,
    repo,
    baseSha: options.baseSha,
    headSha: options.headSha,
  });

  if (decision.action === "NOOP") {
    results.push({
      docArea: item.docArea,
      decision,
      outcome: "NO_CHANGE",
      summary: decision.reason,
    });
    writeMetrics(metrics);
    return results;
  }

  if (decision.action === "UPDATE_EXISTING_PR") {
    const existingPr = state.areaLatestPr["docsite"];
    results.push({
      docArea: item.docArea,
      decision,
      outcome: existingPr ? "NO_CHANGE" : "BLOCKED",
      summary: existingPr ? `Bundled into existing PR: ${existingPr}` : "PR cap reached",
      prUrl: existingPr,
    });
    state = applyDecisionToState({
      state,
      decision,
      docArea: "docsite",
      outcome: existingPr ? "NO_CHANGE" : "BLOCKED",
      link: existingPr,
    });
    saveState(state);
    writeMetrics(metrics);
    return results;
  }

  const bundle = await buildEvidenceBundle({ runInfo, item, evidenceRoot });
  const attachmentPaths = bundle.attachmentPaths;

  let existingDocdriftPr: { number: number; url: string; headRef: string } | undefined;
  if (githubToken) {
    if (normalized.branchStrategy === "single") {
      // Single-branch strategy: look for PR from branchPrefix on every run
      existingDocdriftPr = (await findExistingDocdriftPrByBranch(githubToken, repo, normalized.branchPrefix)) ?? undefined;
      if (existingDocdriftPr) {
        logInfo("Found existing docdrift PR for single branch; will instruct Devin to update it", {
          existingPr: existingDocdriftPr.number,
          headRef: existingDocdriftPr.headRef,
        });
      }
    } else if (normalized.branchStrategy === "per-pr" && runInfo.trigger === "pull_request" && runInfo.prNumber) {
      // Per-pr strategy: only look when triggered by pull_request
      existingDocdriftPr = (await findExistingDocdriftPrForSource(githubToken, repo, runInfo.prNumber, normalized.branchPrefix)) ?? undefined;
      if (existingDocdriftPr) {
        logInfo("Found existing docdrift PR for source PR; will instruct Devin to update it", {
          existingPr: existingDocdriftPr.number,
          headRef: existingDocdriftPr.headRef,
        });
      }
    }
  }

  let sessionOutcome: SessionOutcome = {
    outcome: "NO_CHANGE",
    summary: "Skipped Devin session",
    verification: normalized.policy.verification.commands.map((command) => ({
      command,
      result: "not run",
    })),
  };

  if (devinApiKey) {
    const sessionStart = Date.now();
    sessionOutcome = await executeSessionSingle({
      apiKey: devinApiKey,
      repository: repo,
      item,
      aggregated: aggregated!,
      attachmentPaths,
      config: normalized,
      runGate,
      trigger: runInfo.trigger,
      prNumber: runInfo.prNumber,
      existingDocdriftPr,
      branchPrefix: normalized.branchPrefix,
      branchStrategy: normalized.branchStrategy,
    });
    metrics.timeToSessionTerminalMs.push(Date.now() - sessionStart);
  } else {
    logWarn("DEVIN_API_KEY not set; running fallback behavior", { docArea: item.docArea });
    sessionOutcome = {
      outcome: "BLOCKED",
      summary: "DEVIN_API_KEY missing; cannot start Devin session",
      questions: ["Set DEVIN_API_KEY in environment or GitHub Actions secrets"],
      verification: normalized.policy.verification.commands.map((command) => ({
        command,
        result: "not run",
      })),
    };
  }

  let issueUrl: string | undefined;

  if (sessionOutcome.outcome === "PR_OPENED" && sessionOutcome.prUrl) {
    metrics.prsOpened += 1;
    state.lastDocDriftPrUrl = sessionOutcome.prUrl;
    state.lastDocDriftPrOpenedAt = new Date().toISOString();

    if (githubToken && runInfo.trigger === "pull_request" && runInfo.prNumber && !existingDocdriftPr) {
      await postPrComment({
        token: githubToken,
        repository: repo,
        prNumber: runInfo.prNumber,
        body: `## Doc drift detected\n\nDraft doc PR: ${sessionOutcome.prUrl}\n\nMerge your API changes first, then review and merge this doc PR.`,
      });
    }

    const touchedRequireReview = (item.impactedDocs ?? []).filter((p) =>
      normalized.requireHumanReview.some((glob) => matchesGlob(glob, p))
    );
    if (githubToken && touchedRequireReview.length > 0) {
      issueUrl = await createIssue({
        token: githubToken,
        repository: repo,
        issue: {
          title: "[docdrift] Docs out of sync — review doc drift PR",
          body: renderRequireHumanReviewIssueBody({
            prUrl: sessionOutcome.prUrl,
            touchedPaths: touchedRequireReview,
          }),
          labels: ["docdrift"],
        },
      });
      metrics.issuesOpened += 1;
    }
  } else if (
    githubToken &&
    sessionOutcome.outcome === "BLOCKED" &&
    sessionOutcome.summary.includes("DEVIN_API_KEY")
  ) {
    issueUrl = await createIssue({
      token: githubToken,
      repository: repo,
      issue: {
        title: "[docdrift] Configuration required — set DEVIN_API_KEY",
        body: renderBlockedIssueBody({
          docArea: item.docArea,
          evidenceSummary: sessionOutcome.summary,
          questions: sessionOutcome.questions ?? [
            "Set DEVIN_API_KEY in GitHub Actions secrets or environment.",
          ],
          sessionUrl: sessionOutcome.sessionUrl,
        }),
        labels: ["docdrift"],
      },
    });
    metrics.issuesOpened += 1;
  }
  // Note: We do NOT create "docs drift requires input" issues for Devin-reported BLOCKED
  // (evidence questions) or for OPEN_ISSUE/NO_CHANGE. Issues are only created for:
  // (1) requireHumanReview when a PR touches those paths, (2) 7-day SLA reminders,
  // and (3) DEVIN_API_KEY missing. See docdrift-yml.md.

  if (sessionOutcome.outcome === "BLOCKED") {
    metrics.blockedCount += 1;
  }

  const result: RunResult = {
    docArea: item.docArea,
    decision,
    outcome: sessionOutcome.outcome,
    summary: sessionOutcome.summary,
    sessionUrl: sessionOutcome.sessionUrl,
    prUrl: sessionOutcome.prUrl,
    issueUrl,
  };
  results.push(result);

  state = applyDecisionToState({
    state,
    decision,
    docArea: "docsite",
    outcome: sessionOutcome.outcome,
    link: sessionOutcome.prUrl ?? issueUrl,
  });

  if (sessionOutcome.outcome === "PR_OPENED" && sessionOutcome.prUrl) {
    state.lastDocDriftPrUrl = sessionOutcome.prUrl;
    state.lastDocDriftPrOpenedAt = new Date().toISOString();
  }

  saveState(state);

  if (githubToken && canPostCommitComment(repo, commitSha)) {
    const body = renderRunComment({
      docArea: item.docArea,
      summary: sessionOutcome.summary,
      decision: decision.action,
      outcome: sessionOutcome.outcome,
      sessionUrl: sessionOutcome.sessionUrl,
      prUrl: sessionOutcome.prUrl,
      issueUrl,
      validation: sessionOutcome.verification,
    });
    await postCommitComment({
      token: githubToken,
      repository: repo,
      commitSha,
      body,
    });
  }

  const slaDays = normalized.policy.slaDays ?? 0;
  if (githubToken && slaDays > 0 && state.lastDocDriftPrUrl && state.lastDocDriftPrOpenedAt) {
    const openedAt = Date.parse(state.lastDocDriftPrOpenedAt);
    const daysOld = (Date.now() - openedAt) / (24 * 60 * 60 * 1000);
    const lastSla = state.lastSlaIssueOpenedAt ? Date.parse(state.lastSlaIssueOpenedAt) : 0;
    const slaCooldown = 6 * 24 * 60 * 60 * 1000;
    if (daysOld >= slaDays && Date.now() - lastSla > slaCooldown) {
      const slaIssueUrl = await createIssue({
        token: githubToken,
        repository: repo,
        issue: {
          title: "[docdrift] Docs out of sync — merge doc drift PR(s)",
          body: renderSlaIssueBody({
            prUrls: [state.lastDocDriftPrUrl],
            slaDays,
          }),
          labels: ["docdrift"],
        },
      });
      state.lastSlaIssueOpenedAt = new Date().toISOString();
      saveState(state);
    }
  }

  metrics.noiseRateProxy = metrics.prsOpened;
  writeMetrics(metrics);
  logInfo("Run complete", {
    items: 1,
    elapsedMs: Date.now() - startedAt,
  });

  return results;
}

export async function runValidate(): Promise<void> {
  const config = loadConfig();
  const runtimeValidation = await validateRuntimeConfig(config);
  if (runtimeValidation.errors.length) {
    throw new Error(`Config validation failed:\n${runtimeValidation.errors.join("\n")}`);
  }
  runtimeValidation.warnings.forEach((warning) => logWarn(warning));
  logInfo("Config is valid");
}

export async function runSlaCheck(): Promise<{ issueOpened: boolean }> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error("GITHUB_TOKEN is required for sla-check command");
  }
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) {
    throw new Error("GITHUB_REPOSITORY is required for sla-check command");
  }
  const normalized = loadNormalizedConfig();
  const slaDays = normalized.policy.slaDays ?? 0;
  const slaLabel = normalized.policy.slaLabel ?? "docdrift";

  if (slaDays <= 0) {
    logInfo("SLA check disabled (slaDays <= 0)");
    return { issueOpened: false };
  }

  const cutoff = new Date(Date.now() - slaDays * 24 * 60 * 60 * 1000);

  const openPrs = await listOpenPrsWithLabel(githubToken, repo, slaLabel);
  const stalePrs = openPrs.filter((pr) => {
    const created = pr.created_at ? Date.parse(pr.created_at) : Date.now();
    return Number.isFinite(created) && created <= cutoff.getTime();
  });

  if (stalePrs.length === 0) {
    logInfo("No doc-drift PRs open longer than slaDays; nothing to do");
    return { issueOpened: false };
  }

  let state = loadState();
  const lastSla = state.lastSlaIssueOpenedAt ? Date.parse(state.lastSlaIssueOpenedAt) : 0;
  const slaCooldown = 6 * 24 * 60 * 60 * 1000;
  if (Date.now() - lastSla < slaCooldown) {
    logInfo("SLA issue cooldown; skipping");
    return { issueOpened: false };
  }

  const prUrls = stalePrs.map((p) => p.url).filter(Boolean);
  await createIssue({
    token: githubToken,
    repository: repo,
    issue: {
      title: "[docdrift] Docs out of sync — merge doc drift PR(s)",
      body: renderSlaIssueBody({ prUrls, slaDays }),
      labels: ["docdrift"],
    },
  });
  state.lastSlaIssueOpenedAt = new Date().toISOString();
  saveState(state);
  logInfo(`Opened SLA issue for ${prUrls.length} stale PR(s)`);
  return { issueOpened: true };
}

export async function runStatus(sinceHours = 24): Promise<void> {
  const apiKey = process.env.DEVIN_API_KEY;
  if (!apiKey) {
    throw new Error("DEVIN_API_KEY is required for status command");
  }

  const sessions = await devinListSessions(apiKey, { limit: 50, tag: "docdrift" });
  const cutoff = Date.now() - sinceHours * 60 * 60 * 1000;

  const filtered = sessions.filter((session: any) => {
    const createdAt = session?.created_at ? Date.parse(String(session.created_at)) : Date.now();
    return Number.isFinite(createdAt) ? createdAt >= cutoff : true;
  });

  if (!filtered.length) {
    logInfo(`No docdrift sessions in last ${sinceHours}h`);
    return;
  }

  for (const session of filtered) {
    const id = String(session.session_id ?? session.id ?? "unknown");
    const status = String(session.status_enum ?? session.status ?? "unknown");
    const url = String(session.url ?? "");
    console.log(`${id}\t${status}\t${url}`);
  }
}

export function resolveTrigger(eventName?: string): "push" | "manual" | "schedule" | "pull_request" {
  if (eventName === "push") return "push";
  if (eventName === "schedule") return "schedule";
  if (eventName === "pull_request") return "pull_request";
  return "manual";
}

export function parseDurationHours(value?: string): number {
  if (!value) {
    return 24;
  }
  const normalized = value.endsWith("h") ? value.slice(0, -1) : value;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid --since value: ${value}`);
  }
  return parsed;
}

export function requireSha(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`Missing required argument: ${label}`);
  }
  return value;
}

export async function resolveBaseHead(
  baseArg: string | undefined,
  headArg: string | undefined
): Promise<{ baseSha: string; headSha: string }> {
  const headRef = headArg ?? process.env.GITHUB_SHA ?? "HEAD";
  if (baseArg) {
    return { baseSha: baseArg, headSha: headRef };
  }
  const { resolveDefaultBaseHead } = await import("./utils/git");
  return resolveDefaultBaseHead(headRef);
}

export const STATE_PATH = path.resolve(".docdrift", "state.json");
export { runSetup } from "./setup";
export { setBaseline, resolveBaselineSha } from "./config/baseline";
