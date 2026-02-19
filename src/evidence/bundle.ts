import path from "node:path";
import { DriftItem, RunInfo } from "../model/types";
import { copyIfExists, ensureDir, writeJsonFile } from "../utils/fs";

export interface EvidenceBundle {
  bundleDir: string;
  manifestPath: string;
  /** Explicit file paths to upload to Devin (manifest first, then evidence, then impacted docs). Plain files for easy reading—no unzip or explore. */
  attachmentPaths: string[];
}

function toSafeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function resolveEvidencePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(filePath);
}

export async function buildEvidenceBundle(input: {
  runInfo: RunInfo;
  item: DriftItem;
  evidenceRoot: string;
}): Promise<EvidenceBundle> {
  const root = path.resolve(input.evidenceRoot);
  const area = toSafeName(input.item.docArea);
  const bundleDir = path.join(root, area);
  const evidenceDir = path.join(bundleDir, "evidence");
  const docsDir = path.join(bundleDir, "impacted_docs");

  ensureDir(evidenceDir);
  ensureDir(docsDir);

  const copiedEvidence: string[] = [];
  for (const signal of input.item.signals) {
    for (const evidencePath of signal.evidence) {
      const src = resolveEvidencePath(evidencePath);
      const fileName = toSafeName(path.basename(src));
      const dest = path.join(evidenceDir, fileName);
      if (copyIfExists(src, dest)) {
        copiedEvidence.push(path.relative(bundleDir, dest));
      }
    }
  }

  const copiedDocs: string[] = [];
  for (const docPath of input.item.impactedDocs) {
    const src = path.resolve(docPath);
    const dest = path.join(docsDir, toSafeName(docPath));
    if (copyIfExists(src, dest)) {
      copiedDocs.push(path.relative(bundleDir, dest));
    }
  }

  const manifestPath = path.join(bundleDir, "manifest.json");
  writeJsonFile(manifestPath, {
    run: {
      runId: input.runInfo.runId,
      repo: input.runInfo.repo,
      baseSha: input.runInfo.baseSha,
      headSha: input.runInfo.headSha,
      trigger: input.runInfo.trigger,
      timestamp: input.runInfo.timestamp,
    },
    docArea: input.item.docArea,
    mode: input.item.mode,
    summary: input.item.summary,
    signals: input.item.signals,
    impactedDocs: input.item.impactedDocs,
    copiedEvidence,
    copiedDocs,
  });

  // Declarative explicit files for Devin—no targz. Manifest first for context, then evidence, then impacted docs.
  const attachmentPaths: string[] = [
    manifestPath,
    ...copiedEvidence.map((rel) => path.join(bundleDir, rel)),
    ...copiedDocs.map((rel) => path.join(bundleDir, rel)),
  ];

  return {
    bundleDir,
    manifestPath,
    attachmentPaths,
  };
}

export function writeMetrics(metrics: unknown): void {
  writeJsonFile(path.resolve(".docdrift", "metrics.json"), metrics);
}
