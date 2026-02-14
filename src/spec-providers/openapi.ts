import fs from "node:fs";
import path from "node:path";
import type { SpecProviderConfig, SpecProviderResult } from "./types";
import type { Signal } from "../model/types";
import { execCommand } from "../utils/exec";
import { ensureDir } from "../utils/fs";
import { stableStringify } from "../utils/json";
import { fetchSpec } from "../utils/fetch";

function responseFields(spec: any): Set<string> {
  const fields = new Set<string>();
  const paths = spec?.paths ?? {};
  for (const [pathName, methods] of Object.entries(paths)) {
    for (const [method, methodDef] of Object.entries(methods as Record<string, any>)) {
      const schema = methodDef?.responses?.["200"]?.content?.["application/json"]?.schema;
      const properties = schema?.properties ?? {};
      for (const key of Object.keys(properties)) {
        fields.add(`${String(method).toUpperCase()} ${pathName}: ${key}`);
      }
    }
  }
  return fields;
}

function summarizeSpecDelta(previousSpec: any, currentSpec: any): string {
  const previous = responseFields(previousSpec);
  const current = responseFields(currentSpec);
  const added = [...current].filter((item) => !previous.has(item)).sort();
  const removed = [...previous].filter((item) => !current.has(item)).sort();
  const lines: string[] = [];
  if (added.length) {
    lines.push(`Added response fields (${added.length}):`);
    lines.push(...added.map((value) => `+ ${value}`));
  }
  if (removed.length) {
    lines.push(`Removed response fields (${removed.length}):`);
    lines.push(...removed.map((value) => `- ${value}`));
  }
  if (!lines.length) {
    return "OpenAPI changed, but no top-level response field changes were detected in 200 responses.";
  }
  return lines.join("\n");
}

async function getCurrentSpecContent(
  current: SpecProviderConfig["current"],
  evidenceDir: string,
  logPath: string
): Promise<{ content: string; evidenceFiles: string[] }> {
  const evidenceFiles: string[] = [];

  if (current.type === "url") {
    const content = await fetchSpec(current.url);
    return { content, evidenceFiles };
  }

  if (current.type === "local") {
    if (!fs.existsSync(current.path)) {
      throw new Error(`OpenAPI local path not found: ${current.path}`);
    }
    const content = fs.readFileSync(current.path, "utf8");
    return { content, evidenceFiles };
  }

  // current.type === "export"
  const exportResult = await execCommand(current.command);
  fs.writeFileSync(
    logPath,
    [
      `$ ${current.command}`,
      `exitCode: ${exportResult.exitCode}`,
      "\n--- stdout ---",
      exportResult.stdout,
      "\n--- stderr ---",
      exportResult.stderr,
    ].join("\n"),
    "utf8"
  );
  evidenceFiles.push(logPath);
  if (exportResult.exitCode !== 0) {
    throw new Error(`OpenAPI export failed: ${exportResult.stderr}`);
  }
  if (!fs.existsSync(current.outputPath)) {
    throw new Error(`OpenAPI export did not create: ${current.outputPath}`);
  }
  const content = fs.readFileSync(current.outputPath, "utf8");
  return { content, evidenceFiles };
}

export async function detectOpenApiSpecDrift(
  config: SpecProviderConfig,
  evidenceDir: string
): Promise<SpecProviderResult> {
  if (config.format !== "openapi3") {
    return {
      hasDrift: false,
      summary: `Format ${config.format} is not openapi3`,
      evidenceFiles: [],
      impactedDocs: [],
    };
  }

  ensureDir(evidenceDir);
  const logPath = path.join(evidenceDir, "openapi3-export.log");

  let currentContent: string;
  let evidenceFiles: string[];

  try {
    const result = await getCurrentSpecContent(config.current, evidenceDir, logPath);
    currentContent = result.content;
    evidenceFiles = result.evidenceFiles;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      hasDrift: true,
      summary: `OpenAPI current spec failed: ${msg}`,
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

  if (!fs.existsSync(config.published)) {
    return {
      hasDrift: true,
      summary: "OpenAPI published file missing",
      evidenceFiles,
      impactedDocs: [config.published],
      signal: {
        kind: "weak_evidence",
        tier: 2,
        confidence: 0.35,
        evidence: evidenceFiles,
      },
    };
  }

  const publishedRaw = fs.readFileSync(config.published, "utf8");
  let currentJson: any;
  let publishedJson: any;
  try {
    currentJson = JSON.parse(currentContent);
    publishedJson = JSON.parse(publishedRaw);
  } catch {
    return {
      hasDrift: true,
      summary: "OpenAPI invalid JSON",
      evidenceFiles,
      impactedDocs: [config.published],
      signal: {
        kind: "weak_evidence",
        tier: 2,
        confidence: 0.35,
        evidence: evidenceFiles,
      },
    };
  }

  const normalizedCurrent = stableStringify(currentJson);
  const normalizedPublished = stableStringify(publishedJson);

  if (normalizedCurrent === normalizedPublished) {
    return {
      hasDrift: false,
      summary: "No OpenAPI drift detected",
      evidenceFiles,
      impactedDocs: [config.published],
    };
  }

  const summary = summarizeSpecDelta(publishedJson, currentJson);
  const diffPath = path.join(evidenceDir, "openapi3.diff.txt");
  fs.writeFileSync(
    diffPath,
    [
      "# OpenAPI Drift Summary",
      summary,
      "",
      "# Published (normalized)",
      normalizedPublished,
      "",
      "# Current (normalized)",
      normalizedCurrent,
    ].join("\n"),
    "utf8"
  );

  return {
    hasDrift: true,
    summary,
    evidenceFiles: [...evidenceFiles, diffPath],
    impactedDocs: [config.published],
    signal: {
      kind: "openapi_diff",
      tier: 1,
      confidence: 0.95,
      evidence: [diffPath],
    },
  };
}
