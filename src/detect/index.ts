import path from "node:path";
import { DocDriftConfig } from "../config/schema";
import { DriftItem, DriftReport, RunInfo, Signal } from "../model/types";
import { ensureDir, writeJsonFile } from "../utils/fs";
import { gitChangedPaths, gitCommitList, gitDiffSummary } from "../utils/git";
import { runDocsChecks } from "./docsCheck";
import { detectHeuristicImpacts } from "./heuristics";
import { detectOpenApiDrift } from "./openapi";

function defaultRecommendation(
  mode: "autogen" | "conceptual",
  signals: Signal[]
): DriftItem["recommendedAction"] {
  if (!signals.length) {
    return "NOOP";
  }
  if (mode === "autogen") {
    return signals.some((s) => s.tier <= 1) ? "OPEN_PR" : "OPEN_ISSUE";
  }
  return "OPEN_ISSUE";
}

export async function buildDriftReport(input: {
  config: DocDriftConfig;
  repo: string;
  baseSha: string;
  headSha: string;
  trigger: RunInfo["trigger"];
}): Promise<{
  report: DriftReport;
  changedPaths: string[];
  evidenceRoot: string;
  runInfo: RunInfo;
  checkSummaries: string[];
}> {
  const runInfo: RunInfo = {
    runId: `${Date.now()}`,
    repo: input.repo,
    baseSha: input.baseSha,
    headSha: input.headSha,
    trigger: input.trigger,
    timestamp: new Date().toISOString(),
  };

  const evidenceRoot = path.resolve(".docdrift", "evidence", runInfo.runId);
  ensureDir(evidenceRoot);

  const changedPaths = await gitChangedPaths(input.baseSha, input.headSha);
  const diffSummary = await gitDiffSummary(input.baseSha, input.headSha);
  const commits = await gitCommitList(input.baseSha, input.headSha);

  const docsCheck = await runDocsChecks(input.config.policy.verification.commands, evidenceRoot);

  const items: DriftItem[] = [];
  const checkSummaries: string[] = [docsCheck.summary];

  for (const docArea of input.config.docAreas) {
    const signals: Signal[] = [];
    const impactedDocs = new Set<string>(docArea.patch.targets ?? []);
    const summaries: string[] = [];

    if (docsCheck.signal) {
      signals.push(docsCheck.signal);
      summaries.push(docsCheck.summary);
    }

    if (docArea.detect.openapi) {
      const openapiResult = await detectOpenApiDrift(docArea, evidenceRoot);
      if (openapiResult.signal) {
        signals.push(openapiResult.signal);
      }
      openapiResult.impactedDocs.forEach((doc) => impactedDocs.add(doc));
      summaries.push(openapiResult.summary);
    }

    if (docArea.detect.paths?.length) {
      const heuristicResult = detectHeuristicImpacts(docArea, changedPaths, evidenceRoot);
      if (heuristicResult.signal) {
        signals.push(heuristicResult.signal);
      }
      heuristicResult.impactedDocs.forEach((doc) => impactedDocs.add(doc));
      summaries.push(heuristicResult.summary);
    }

    if (!signals.length) {
      continue;
    }

    items.push({
      docArea: docArea.name,
      mode: docArea.mode,
      signals,
      impactedDocs: [...impactedDocs],
      recommendedAction: defaultRecommendation(docArea.mode, signals),
      summary: summaries.filter(Boolean).join(" | "),
    });
  }

  const report: DriftReport = {
    run: {
      repo: input.repo,
      baseSha: input.baseSha,
      headSha: input.headSha,
      trigger: input.trigger,
      timestamp: runInfo.timestamp,
    },
    items,
  };

  writeJsonFile(path.resolve(".docdrift", "drift_report.json"), report);
  writeJsonFile(path.join(evidenceRoot, "changeset.json"), {
    changedPaths,
    diffSummary,
    commits,
  });

  return { report, changedPaths, evidenceRoot, runInfo, checkSummaries };
}
