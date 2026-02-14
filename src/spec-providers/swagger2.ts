import fs from "node:fs";
import path from "node:path";
import type { SpecProviderConfig, SpecProviderResult } from "./types";
import { ensureDir } from "../utils/fs";
import { stableStringify } from "../utils/json";
import { fetchSpec } from "../utils/fetch";

function resolveRef(spec: any, ref: string): any {
  if (!ref || !ref.startsWith("#/")) return null;
  const parts = ref.slice(2).split("/");
  let cur: any = spec;
  for (const p of parts) {
    cur = cur?.[p];
  }
  return cur;
}

function getResponseFieldsSwagger2(spec: any): Set<string> {
  const fields = new Set<string>();
  const paths = spec?.paths ?? {};
  const definitions = spec?.definitions ?? {};

  for (const [pathName, pathItem] of Object.entries(paths)) {
    const item = pathItem as Record<string, any>;
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const op = item[method];
      if (!op) continue;
      const res = op.responses?.["200"];
      if (!res) continue;
      let schema = res.schema;
      if (schema?.$ref) {
        schema = resolveRef({ paths, definitions }, schema.$ref) ?? schema;
      }
      const properties = schema?.properties ?? {};
      for (const key of Object.keys(properties)) {
        fields.add(`${method.toUpperCase()} ${pathName}: ${key}`);
      }
    }
  }
  return fields;
}

function summarizeSwagger2Delta(previousSpec: any, currentSpec: any): string {
  const previous = getResponseFieldsSwagger2(previousSpec);
  const current = getResponseFieldsSwagger2(currentSpec);
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
    return "Swagger 2 changed, but no top-level response field changes were detected in 200 responses.";
  }
  return lines.join("\n");
}

async function getCurrentContent(config: SpecProviderConfig): Promise<string> {
  const current = config.current;
  if (current.type === "url") {
    return fetchSpec(current.url);
  }
  if (current.type === "local") {
    if (!fs.existsSync(current.path)) {
      throw new Error(`Swagger 2 local path not found: ${current.path}`);
    }
    return fs.readFileSync(current.path, "utf8");
  }
  // export: run command then read outputPath
  const { execCommand } = await import("../utils/exec");
  const result = await execCommand(current.command);
  if (result.exitCode !== 0) {
    throw new Error(`Swagger 2 export failed: ${result.stderr}`);
  }
  if (!fs.existsSync(current.outputPath)) {
    throw new Error(`Swagger 2 export did not create: ${current.outputPath}`);
  }
  return fs.readFileSync(current.outputPath, "utf8");
}

export async function detectSwagger2SpecDrift(
  config: SpecProviderConfig,
  evidenceDir: string
): Promise<SpecProviderResult> {
  if (config.format !== "swagger2") {
    return {
      hasDrift: false,
      summary: `Format ${config.format} is not swagger2`,
      evidenceFiles: [],
      impactedDocs: [],
    };
  }

  ensureDir(evidenceDir);

  let currentContent: string;
  try {
    currentContent = await getCurrentContent(config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const logPath = path.join(evidenceDir, "swagger2-export.log");
    fs.writeFileSync(logPath, msg, "utf8");
    return {
      hasDrift: true,
      summary: `Swagger 2 current spec failed: ${msg}`,
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
      summary: "Swagger 2 published file missing",
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

  const publishedRaw = fs.readFileSync(config.published, "utf8");
  let currentJson: any;
  let publishedJson: any;
  try {
    currentJson = JSON.parse(currentContent);
    publishedJson = JSON.parse(publishedRaw);
  } catch {
    return {
      hasDrift: true,
      summary: "Swagger 2 invalid JSON",
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

  if (currentJson.swagger !== "2.0") {
    return {
      hasDrift: false,
      summary: "Not a Swagger 2.0 spec",
      evidenceFiles: [],
      impactedDocs: [],
    };
  }

  const normalizedCurrent = stableStringify(currentJson);
  const normalizedPublished = stableStringify(publishedJson);

  if (normalizedCurrent === normalizedPublished) {
    return {
      hasDrift: false,
      summary: "No Swagger 2 drift detected",
      evidenceFiles: [],
      impactedDocs: [config.published],
    };
  }

  const summary = summarizeSwagger2Delta(publishedJson, currentJson);
  const diffPath = path.join(evidenceDir, "swagger2.diff.txt");
  fs.writeFileSync(
    diffPath,
    [
      "# Swagger 2 Drift Summary",
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
    evidenceFiles: [diffPath],
    impactedDocs: [config.published],
    signal: {
      kind: "swagger2_diff",
      tier: 1,
      confidence: 0.95,
      evidence: [diffPath],
    },
  };
}
