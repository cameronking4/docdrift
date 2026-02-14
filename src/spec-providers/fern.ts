import fs from "node:fs";
import path from "node:path";
import type { SpecProviderConfig, SpecProviderResult } from "./types";
import { ensureDir } from "../utils/fs";
import { stableStringify } from "../utils/json";

function readFernDefinitionDir(dirPath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return out;
  }
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dirPath, e.name);
    if (e.isDirectory()) {
      Object.assign(out, readFernDefinitionDir(full));
    } else if (e.isFile() && (e.name.endsWith(".yml") || e.name.endsWith(".yaml"))) {
      out[full] = fs.readFileSync(full, "utf8");
    }
  }
  return out;
}

async function getCurrentContent(config: SpecProviderConfig): Promise<Record<string, string>> {
  const current = config.current;
  if (current.type !== "local") {
    throw new Error("Fern provider only supports local definition folder");
  }
  return readFernDefinitionDir(current.path);
}

function contentSignature(files: Record<string, string>): string {
  const sorted = Object.keys(files).sort();
  return stableStringify(sorted.map((k) => ({ path: k, content: files[k] })));
}

export async function detectFernSpecDrift(
  config: SpecProviderConfig,
  evidenceDir: string
): Promise<SpecProviderResult> {
  if (config.format !== "fern") {
    return {
      hasDrift: false,
      summary: `Format ${config.format} is not fern`,
      evidenceFiles: [],
      impactedDocs: [],
    };
  }

  ensureDir(evidenceDir);

  let currentFiles: Record<string, string>;
  try {
    currentFiles = await getCurrentContent(config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const logPath = path.join(evidenceDir, "fern-export.log");
    fs.writeFileSync(logPath, msg, "utf8");
    return {
      hasDrift: true,
      summary: `Fern definition read failed: ${msg}`,
      evidenceFiles: [logPath],
      impactedDocs: [config.published],
      signal: {
        kind: "weak_evidence",
        tier: 2,
        confidence: 0.35,
        evidence: [logPath],
      },
    };
  }

  const publishedPath = config.published;
  let publishedSignature: string;
  if (fs.existsSync(publishedPath) && fs.statSync(publishedPath).isDirectory()) {
    const publishedFiles = readFernDefinitionDir(publishedPath);
    publishedSignature = contentSignature(publishedFiles);
  } else if (fs.existsSync(publishedPath)) {
    publishedSignature = fs.readFileSync(publishedPath, "utf8");
  } else {
    return {
      hasDrift: true,
      summary: "Fern published path missing",
      evidenceFiles: [],
      impactedDocs: [config.published],
      signal: {
        kind: "weak_evidence",
        tier: 2,
        confidence: 0.35,
        evidence: [],
      },
    };
  }

  const currentSignature = contentSignature(currentFiles);
  if (currentSignature === publishedSignature) {
    return {
      hasDrift: false,
      summary: "No Fern definition drift detected",
      evidenceFiles: [],
      impactedDocs: [config.published],
    };
  }

  const summary = "Fern definition YAML changed.";
  const diffPath = path.join(evidenceDir, "fern.diff.txt");
  fs.writeFileSync(
    diffPath,
    [
      "# Fern Drift Summary",
      summary,
      "",
      "# Current definition signature (file list + content hash)",
      currentSignature.slice(0, 12000),
    ].join("\n"),
    "utf8"
  );

  return {
    hasDrift: true,
    summary,
    evidenceFiles: [diffPath],
    impactedDocs: [config.published],
    signal: {
      kind: "fern_diff",
      tier: 1,
      confidence: 0.95,
      evidence: [diffPath],
    },
  };
}
