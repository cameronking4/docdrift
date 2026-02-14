import fs from "node:fs";
import path from "node:path";
import { DocAreaConfig } from "../config/schema";
import { Signal } from "../model/types";
import { matchesGlob } from "../utils/glob";

export interface HeuristicResult {
  signal?: Signal;
  impactedDocs: string[];
  summary: string;
  evidenceFiles: string[];
}

export function detectHeuristicImpacts(
  docArea: DocAreaConfig,
  changedPaths: string[],
  evidenceDir: string
): HeuristicResult {
  const rules = docArea.detect.paths ?? [];
  if (!rules.length) {
    return { impactedDocs: [], summary: "No heuristic rules configured", evidenceFiles: [] };
  }

  const matched: Array<{ rule: string; path: string; impacts: string[] }> = [];
  const impactedDocs = new Set<string>();

  for (const rule of rules) {
    for (const changedPath of changedPaths) {
      if (matchesGlob(rule.match, changedPath)) {
        matched.push({ rule: rule.match, path: changedPath, impacts: rule.impacts });
        rule.impacts.forEach((doc) => impactedDocs.add(doc));
      }
    }
  }

  if (!matched.length) {
    return { impactedDocs: [], summary: "No heuristic conceptual impacts", evidenceFiles: [] };
  }

  const evidencePath = path.join(evidenceDir, `${docArea.name}.heuristics.txt`);
  const body = matched
    .map((entry) => `${entry.path} matched ${entry.rule} -> ${entry.impacts.join(", ")}`)
    .join("\n");
  fs.writeFileSync(evidencePath, body, "utf8");

  return {
    impactedDocs: [...impactedDocs],
    evidenceFiles: [evidencePath],
    summary: `Heuristic impacts detected (${matched.length} matches)`,
    signal: {
      kind: "heuristic_path_impact",
      tier: 2,
      confidence: 0.67,
      evidence: [evidencePath],
    },
  };
}
