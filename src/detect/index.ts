import path from "node:path";
import type { NormalizedDocDriftConfig } from "../config/schema";
import { AggregatedDriftResult, DriftItem, DriftReport, RunInfo, Signal } from "../model/types";
import { ensureDir, writeJsonFile } from "../utils/fs";
import { gitChangedPaths, gitCommitList, gitDiffSummary } from "../utils/git";
import { matchesGlob } from "../utils/glob";
import { detectHeuristicImpacts } from "./heuristics";
import { getSpecDetector } from "../spec-providers/registry";
import type { SpecProviderResult } from "../spec-providers/types";

export type RunGate = "spec_export_invalid" | "spec_drift" | "conceptual_only" | "infer" | "none";

export async function buildDriftReport(input: {
  config: NormalizedDocDriftConfig;
  repo: string;
  baseSha: string;
  headSha: string;
  trigger: RunInfo["trigger"];
  prNumber?: number;
}): Promise<{
  report: DriftReport;
  aggregated: AggregatedDriftResult | null;
  changedPaths: string[];
  evidenceRoot: string;
  runInfo: RunInfo;
  hasOpenApiDrift: boolean;
  runGate: RunGate;
}> {
  const runInfo: RunInfo = {
    runId: `${Date.now()}`,
    repo: input.repo,
    baseSha: input.baseSha,
    headSha: input.headSha,
    trigger: input.trigger,
    timestamp: new Date().toISOString(),
    prNumber: input.prNumber,
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

  const { config } = input;
  const signals: Signal[] = [];
  const impactedDocs = new Set<string>();
  const summaries: string[] = [];
  const evidenceFiles: string[] = [];

  // 1. Run all spec providers (parallel)
  const providerResults: SpecProviderResult[] = [];
  if (config.specProviders.length > 0) {
    const results = await Promise.all(
      config.specProviders.map(async (provider) => {
        const detector = getSpecDetector(provider.format);
        return detector(provider, evidenceRoot);
      })
    );
    providerResults.push(...results);
  }

  const anySpecExportInvalid = providerResults.some(
    (r) => r.signal?.kind === "spec_export_incomplete"
  );
  const anySpecDrift = providerResults.some((r) => r.hasDrift && r.signal && r.signal.tier <= 1);
  const allSpecFailedOrNoDrift =
    providerResults.length === 0 ||
    providerResults.every((r) => !r.hasDrift || (r.signal?.tier ?? 2) > 1);

  if (anySpecDrift) {
    for (const r of providerResults) {
      if (r.hasDrift && r.signal) {
        signals.push(r.signal);
        r.impactedDocs.forEach((d) => impactedDocs.add(d));
        summaries.push(r.summary);
        evidenceFiles.push(...r.evidenceFiles);
      }
    }
  }

  // 2. Path heuristics (always run for aggregation when we have docAreas)
  for (const docArea of config.docAreas) {
    if (docArea.detect.paths?.length) {
      const heuristicResult = detectHeuristicImpacts(docArea, changedPaths, evidenceRoot);
      if (heuristicResult.signal) {
        signals.push(heuristicResult.signal);
        heuristicResult.impactedDocs.forEach((d) => impactedDocs.add(d));
        summaries.push(heuristicResult.summary);
      }
    }
  }

  const hasHeuristicMatch = signals.some((s) => s.kind === "heuristic_path_impact");
  const pathMappings = config.pathMappings ?? [];
  const hasPathMappingMatch =
    pathMappings.length > 0 &&
    changedPaths.some((p) => pathMappings.some((m) => matchesGlob(m.match, p)));

  // 3. Gate logic (precedence: spec_export_invalid > spec_drift > conceptual_only > infer > none)
  const isAuto = config.mode === "auto";
  let runGate: RunGate = "none";
  if (anySpecExportInvalid) {
    runGate = "spec_export_invalid";
  } else if (anySpecDrift) {
    runGate = "spec_drift";
  } else if (isAuto && hasHeuristicMatch) {
    runGate = "conceptual_only";
  } else if (
    isAuto &&
    hasPathMappingMatch &&
    (config.specProviders.length === 0 || allSpecFailedOrNoDrift)
  ) {
    runGate = "infer";
    if (config.specProviders.length > 0) {
      for (const r of providerResults) {
        if (r.signal) {
          signals.push(r.signal);
          r.impactedDocs.forEach((d) => impactedDocs.add(d));
          summaries.push(r.summary);
        }
      }
    }
    if (signals.length === 0) {
      signals.push({
        kind: "infer_mode",
        tier: 2,
        confidence: 0.6,
        evidence: [path.join(evidenceRoot, "changeset.json")],
      });
      changedPaths.forEach((p) => impactedDocs.add(p));
      summaries.push("Infer mode: no spec drift; infer docs from file changes.");
    }
  }

  if (runGate === "none") {
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
      runGate: "none",
    };
  }

  const aggregated: AggregatedDriftResult = {
    signals,
    impactedDocs: [...impactedDocs],
    summary: summaries.filter(Boolean).join(" | "),
  };

  const item: DriftItem = {
    docArea: "docsite",
    mode: runGate === "conceptual_only" ? "conceptual" : "autogen",
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
    hasOpenApiDrift: anySpecDrift,
    runGate,
  };
}
