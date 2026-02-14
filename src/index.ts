import path from "node:path";
import { loadConfig } from "./config/load";
import { validateRuntimeConfig } from "./config/validate";
import { buildDriftReport } from "./detect";
import { buildEvidenceBundle, writeMetrics } from "./evidence/bundle";
import {
  createIssue,
  postCommitComment,
  renderBlockedIssueBody,
  renderRunComment,
} from "./github/client";
import { RunResult } from "./model/types";
import { decidePolicy, applyDecisionToState } from "./policy/engine";
import { loadState, saveState } from "./policy/state";
import { logInfo, logWarn } from "./utils/log";
import { buildAutogenPrompt, buildConceptualPrompt } from "./devin/prompts";
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
  trigger?: "push" | "manual" | "schedule";
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

async function executeSession(input: {
  apiKey: string;
  repository: string;
  item: any;
  attachmentPaths: string[];
  config: ReturnType<typeof loadConfig>;
}): Promise<SessionOutcome> {
  const attachmentUrls: string[] = [];
  for (const attachmentPath of input.attachmentPaths) {
    const url = await devinUploadAttachment(input.apiKey, attachmentPath);
    attachmentUrls.push(url);
  }

  const prompt =
    input.item.mode === "autogen"
      ? buildAutogenPrompt({
          item: input.item,
          attachmentUrls,
          verificationCommands: input.config.policy.verification.commands,
          allowlist: input.config.policy.allowlist,
          confidenceThreshold: input.config.policy.confidence.autopatchThreshold,
        })
      : buildConceptualPrompt({
          item: input.item,
          attachmentUrls,
          verificationCommands: input.config.policy.verification.commands,
          allowlist: input.config.policy.allowlist,
          confidenceThreshold: input.config.policy.confidence.autopatchThreshold,
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

export async function runDetect(options: DetectOptions): Promise<{ hasDrift: boolean }> {
  const config = loadConfig();
  const runtimeValidation = await validateRuntimeConfig(config);
  if (runtimeValidation.errors.length) {
    throw new Error(`Config validation failed:\n${runtimeValidation.errors.join("\n")}`);
  }
  const repo = process.env.GITHUB_REPOSITORY ?? "local/docdrift";

  const { report } = await buildDriftReport({
    config,
    repo,
    baseSha: options.baseSha,
    headSha: options.headSha,
    trigger: options.trigger ?? "manual",
  });

  logInfo(`Drift items detected: ${report.items.length}`);
  return { hasDrift: report.items.length > 0 };
}

export async function runDocDrift(options: DetectOptions): Promise<RunResult[]> {
  const config = loadConfig();
  const runtimeValidation = await validateRuntimeConfig(config);
  if (runtimeValidation.errors.length) {
    throw new Error(`Config validation failed:\n${runtimeValidation.errors.join("\n")}`);
  }
  const repo = process.env.GITHUB_REPOSITORY ?? "local/docdrift";
  const commitSha = process.env.GITHUB_SHA ?? options.headSha;
  const githubToken = process.env.GITHUB_TOKEN;
  const devinApiKey = process.env.DEVIN_API_KEY;

  const { report, runInfo, evidenceRoot } = await buildDriftReport({
    config,
    repo,
    baseSha: options.baseSha,
    headSha: options.headSha,
    trigger: options.trigger ?? "manual",
  });

  const docAreaByName = new Map(config.docAreas.map((area) => [area.name, area]));

  let state = loadState();
  const startedAt = Date.now();
  const results: RunResult[] = [];
  const metrics = {
    driftItemsDetected: report.items.length,
    prsOpened: 0,
    issuesOpened: 0,
    blockedCount: 0,
    timeToSessionTerminalMs: [] as number[],
    docAreaCounts: {} as Record<string, number>,
    noiseRateProxy: 0,
  };

  for (const item of report.items) {
    metrics.docAreaCounts[item.docArea] = (metrics.docAreaCounts[item.docArea] ?? 0) + 1;

    const areaConfig = docAreaByName.get(item.docArea);
    if (!areaConfig) {
      continue;
    }

    const decision = decidePolicy({
      item,
      docAreaConfig: areaConfig,
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
      continue;
    }

    if (decision.action === "UPDATE_EXISTING_PR") {
      const existingPr = state.areaLatestPr[item.docArea];
      const summary = existingPr
        ? `Bundled into existing PR: ${existingPr}`
        : "PR cap reached and no existing area PR; escalated";
      const outcome = existingPr ? "NO_CHANGE" : "BLOCKED";

      results.push({
        docArea: item.docArea,
        decision,
        outcome,
        summary,
        prUrl: existingPr,
      });

      state = applyDecisionToState({
        state,
        decision,
        docArea: item.docArea,
        outcome,
        link: existingPr,
      });
      continue;
    }

    const bundle = await buildEvidenceBundle({ runInfo, item, evidenceRoot });
    const attachmentPaths = [...new Set([bundle.archivePath, ...bundle.attachmentPaths])];

    let sessionOutcome: SessionOutcome = {
      outcome: "NO_CHANGE",
      summary: "Skipped Devin session",
      verification: config.policy.verification.commands.map((command) => ({
        command,
        result: "not run",
      })),
    };

    if (devinApiKey) {
      const sessionStart = Date.now();
      sessionOutcome = await executeSession({
        apiKey: devinApiKey,
        repository: repo,
        item,
        attachmentPaths,
        config,
      });
      metrics.timeToSessionTerminalMs.push(Date.now() - sessionStart);
    } else {
      logWarn("DEVIN_API_KEY not set; running fallback behavior", { docArea: item.docArea });
      sessionOutcome = {
        outcome: "BLOCKED",
        summary: "DEVIN_API_KEY missing; cannot start Devin session",
        questions: ["Set DEVIN_API_KEY in environment or GitHub Actions secrets"],
        verification: config.policy.verification.commands.map((command) => ({
          command,
          result: "not run",
        })),
      };
    }

    let issueUrl: string | undefined;
    if (
      githubToken &&
      (decision.action === "OPEN_ISSUE" ||
        sessionOutcome.outcome === "BLOCKED" ||
        sessionOutcome.outcome === "NO_CHANGE")
    ) {
      issueUrl = await createIssue({
        token: githubToken,
        repository: repo,
        issue: {
          title: `[docdrift] ${item.docArea}: docs drift requires input`,
          body: renderBlockedIssueBody({
            docArea: item.docArea,
            evidenceSummary: item.summary,
            questions: sessionOutcome.questions ?? [
              "Please confirm intended behavior and doc wording.",
            ],
            sessionUrl: sessionOutcome.sessionUrl,
          }),
          labels: ["docdrift"],
        },
      });
      metrics.issuesOpened += 1;
      sessionOutcome.outcome = "ISSUE_OPENED";
    }

    if (sessionOutcome.outcome === "PR_OPENED") {
      metrics.prsOpened += 1;
    }
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

    if (githubToken) {
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

    state = applyDecisionToState({
      state,
      decision,
      docArea: item.docArea,
      outcome: sessionOutcome.outcome,
      link: sessionOutcome.prUrl ?? issueUrl,
    });
  }

  saveState(state);

  metrics.noiseRateProxy =
    metrics.driftItemsDetected === 0
      ? 0
      : Number((metrics.prsOpened / metrics.driftItemsDetected).toFixed(4));

  writeMetrics(metrics);
  logInfo("Run complete", {
    items: report.items.length,
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

export function resolveTrigger(eventName?: string): "push" | "manual" | "schedule" {
  if (eventName === "push") {
    return "push";
  }
  if (eventName === "schedule") {
    return "schedule";
  }
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

export const STATE_PATH = path.resolve(".docdrift", "state.json");
