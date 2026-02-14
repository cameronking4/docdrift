import fs from "node:fs";
import path from "node:path";
import { DriftItem, RunInfo } from "../model/types";
import { execCommand } from "../utils/exec";
import { copyIfExists, ensureDir, writeJsonFile } from "../utils/fs";

export interface EvidenceBundle {
  bundleDir: string;
  archivePath: string;
  manifestPath: string;
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
      timestamp: input.runInfo.timestamp
    },
    docArea: input.item.docArea,
    mode: input.item.mode,
    summary: input.item.summary,
    signals: input.item.signals,
    impactedDocs: input.item.impactedDocs,
    copiedEvidence,
    copiedDocs
  });

  const archivePath = `${bundleDir}.tar.gz`;
  const parent = path.dirname(bundleDir);
  const name = path.basename(bundleDir);

  const tarResult = await execCommand(`tar -czf ${JSON.stringify(archivePath)} -C ${JSON.stringify(parent)} ${JSON.stringify(name)}`);
  if (tarResult.exitCode !== 0) {
    throw new Error(`Failed to create evidence archive: ${tarResult.stderr || tarResult.stdout}`);
  }

  return {
    bundleDir,
    archivePath,
    manifestPath,
    attachmentPaths: [archivePath, manifestPath]
  };
}

export function writeMetrics(metrics: unknown): void {
  writeJsonFile(path.resolve("metrics.json"), metrics);
}
