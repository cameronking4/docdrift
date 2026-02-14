import fs from "node:fs";
import path from "node:path";
import { DocAreaConfig } from "../config/schema";
import { Signal } from "../model/types";
import { execCommand } from "../utils/exec";
import { ensureDir } from "../utils/fs";
import { stableStringify } from "../utils/json";

interface OpenApiDetectResult {
  signal?: Signal;
  impactedDocs: string[];
  evidenceFiles: string[];
  summary: string;
}

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

export async function detectOpenApiDrift(
  docArea: DocAreaConfig,
  evidenceDir: string
): Promise<OpenApiDetectResult> {
  if (!docArea.detect.openapi) {
    return { impactedDocs: [], evidenceFiles: [], summary: "No OpenAPI detector configured" };
  }

  ensureDir(evidenceDir);
  const openapi = docArea.detect.openapi;
  const exportLogPath = path.join(evidenceDir, `${docArea.name}.openapi-export.log`);
  const exportResult = await execCommand(openapi.exportCmd);
  fs.writeFileSync(
    exportLogPath,
    [
      `$ ${openapi.exportCmd}`,
      `exitCode: ${exportResult.exitCode}`,
      "\n--- stdout ---",
      exportResult.stdout,
      "\n--- stderr ---",
      exportResult.stderr,
    ].join("\n"),
    "utf8"
  );

  if (exportResult.exitCode !== 0) {
    return {
      impactedDocs: [openapi.publishedPath],
      evidenceFiles: [exportLogPath],
      summary: "OpenAPI export command failed",
      signal: {
        kind: "weak_evidence",
        tier: 2,
        confidence: 0.35,
        evidence: [exportLogPath],
      },
    };
  }

  if (!fs.existsSync(openapi.generatedPath) || !fs.existsSync(openapi.publishedPath)) {
    return {
      impactedDocs: [openapi.generatedPath, openapi.publishedPath],
      evidenceFiles: [exportLogPath],
      summary: "OpenAPI file(s) missing",
      signal: {
        kind: "weak_evidence",
        tier: 2,
        confidence: 0.35,
        evidence: [exportLogPath],
      },
    };
  }

  const generatedRaw = fs.readFileSync(openapi.generatedPath, "utf8");
  const publishedRaw = fs.readFileSync(openapi.publishedPath, "utf8");
  const generatedJson = JSON.parse(generatedRaw);
  const publishedJson = JSON.parse(publishedRaw);

  const normalizedGenerated = stableStringify(generatedJson);
  const normalizedPublished = stableStringify(publishedJson);

  if (normalizedGenerated === normalizedPublished) {
    return {
      impactedDocs: [openapi.publishedPath],
      evidenceFiles: [exportLogPath],
      summary: "No OpenAPI drift detected",
    };
  }

  const summary = summarizeSpecDelta(publishedJson, generatedJson);
  const diffPath = path.join(evidenceDir, `${docArea.name}.openapi.diff.txt`);
  fs.writeFileSync(
    diffPath,
    [
      "# OpenAPI Drift Summary",
      summary,
      "",
      "# Published (normalized)",
      normalizedPublished,
      "",
      "# Generated (normalized)",
      normalizedGenerated,
    ].join("\n"),
    "utf8"
  );

  return {
    impactedDocs: [...new Set([openapi.publishedPath, ...(docArea.patch.targets ?? [])])],
    evidenceFiles: [exportLogPath, diffPath],
    summary,
    signal: {
      kind: "openapi_diff",
      tier: 1,
      confidence: 0.95,
      evidence: [diffPath],
    },
  };
}
