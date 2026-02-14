import path from "node:path";
import type { NormalizedDocDriftConfig } from "../config/schema";
import { AggregatedDriftResult, DriftItem, DriftReport, RunInfo, Signal } from "../model/types";
import { ensureDir, writeJsonFile } from "../utils/fs";
import { gitChangedPaths, gitCommitList, gitDiffSummary } from "../utils/git";
import { detectHeuristicImpacts } from "./heuristics";
import { detectOpenApiDriftFromNormalized } from "./openapi";

export async function buildDriftReport(input: {
  config: NormalizedDocDriftConfig;
  repo: string;
  baseSha: string;
  headSha: string;
  trigger: RunInfo["trigger"];
}): Promise<{
  report: DriftReport;
  aggregated: AggregatedDriftResult | null;
  changedPaths: string[];
  evidenceRoot: string;
  runInfo: RunInfo;
  hasOpenApiDrift: boolean;
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

  writeJsonFile(path.join(evidenceRoot, "changeset.json"), {
    changedPaths,
    diffSummary,
    commits,
  });

  // Gate: run OpenAPI detection first. If no OpenAPI drift, exit (no session).
  const openapiResult = await detectOpenApiDriftFromNormalized(input.config, evidenceRoot);

  if (!openapiResult.signal) {
    // No OpenAPI drift — gate closed. Return empty.
    const report: DriftReport = {
      run: {
        repo: input.repo,
        baseSha: input.baseSha,
        headSha: input.headSha,
        trigger: input.trigger,
        timestamp: runInfo.timestamp,
      },
      items: [],
    };
    writeJsonFile(path.resolve(".docdrift", "drift_report.json"), report);
    return {
      report,
      aggregated: null,
      changedPaths,
      evidenceRoot,
      runInfo,
      hasOpenApiDrift: false,
    };
  }

  // Gate passed: aggregate signals and impacted docs.
  const signals: Signal[] = [openapiResult.signal];
  const impactedDocs = new Set<string>(openapiResult.impactedDocs);
  const summaries: string[] = [openapiResult.summary];

  for (const docArea of input.config.docAreas) {
    if (docArea.detect.paths?.length) {
      const heuristicResult = detectHeuristicImpacts(docArea, changedPaths, evidenceRoot);
      if (heuristicResult.signal) {
        signals.push(heuristicResult.signal);
      }
      heuristicResult.impactedDocs.forEach((doc) => impactedDocs.add(doc));
      summaries.push(heuristicResult.summary);
    }
  }

  const aggregated: AggregatedDriftResult = {
    signals,
    impactedDocs: [...impactedDocs],
    summary: summaries.filter(Boolean).join(" | "),
  };

  const item: DriftItem = {
    docArea: "docsite",
    mode: "autogen",
    signals: aggregated.signals,
    impactedDocs: aggregated.impactedDocs,
    recommendedAction: aggregated.signals.some((s) => s.tier <= 1) ? "OPEN_PR" : "OPEN_ISSUE",
    summary: aggregated.summary,
  };

  const report: DriftReport = {
    run: {
      repo: input.repo,
      baseSha: input.baseSha,
      headSha: input.headSha,
      trigger: input.trigger,
      timestamp: runInfo.timestamp,
    },
    items: [item],
  };

  writeJsonFile(path.resolve(".docdrift", "drift_report.json"), report);

  return {
    report,
    aggregated,
    changedPaths,
    evidenceRoot,
    runInfo,
    hasOpenApiDrift: true,
  };
}
