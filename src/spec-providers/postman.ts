import fs from "node:fs";
import path from "node:path";
import type { SpecProviderConfig, SpecProviderResult } from "./types";
import { ensureDir } from "../utils/fs";
import { stableStringify } from "../utils/json";
import { fetchSpec } from "../utils/fetch";

function extractEndpoints(collection: any): Set<string> {
  const endpoints = new Set<string>();
  const info = collection?.info ?? collection?.information;
  const items = collection?.item ?? [];

  function walk(items: any[], prefix = ""): void {
    for (const item of items) {
      if (!item) continue;
      const name = item.name ?? item.id ?? "";
      if (item.request) {
        const req = typeof item.request === "string" ? { url: item.request, method: "GET" } : item.request;
        const url = req?.url?.raw ?? req?.url ?? "";
        const method = (req?.method ?? "GET").toUpperCase();
        if (url) {
          endpoints.add(`${method} ${url}`);
        }
      } else if (item.item) {
        walk(item.item, `${prefix}/${name}`);
      }
    }
  }

  walk(Array.isArray(items) ? items : [items]);
  return endpoints;
}

async function getCurrentContent(config: SpecProviderConfig): Promise<string> {
  const current = config.current;
  if (current.type === "url") {
    return fetchSpec(current.url);
  }
  if (current.type === "local") {
    if (!fs.existsSync(current.path)) {
      throw new Error(`Postman collection path not found: ${current.path}`);
    }
    return fs.readFileSync(current.path, "utf8");
  }
  const { execCommand } = await import("../utils/exec");
  const result = await execCommand(current.command);
  if (result.exitCode !== 0) {
    throw new Error(`Postman export failed: ${result.stderr}`);
  }
  if (!fs.existsSync(current.outputPath)) {
    throw new Error(`Postman export did not create: ${current.outputPath}`);
  }
  return fs.readFileSync(current.outputPath, "utf8");
}

export async function detectPostmanSpecDrift(
  config: SpecProviderConfig,
  evidenceDir: string
): Promise<SpecProviderResult> {
  if (config.format !== "postman") {
    return {
      hasDrift: false,
      summary: `Format ${config.format} is not postman`,
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
    const logPath = path.join(evidenceDir, "postman-export.log");
    fs.writeFileSync(logPath, msg, "utf8");
    return {
      hasDrift: true,
      summary: `Postman current spec failed: ${msg}`,
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
      summary: "Postman published file missing",
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
      summary: "Postman collection invalid JSON",
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

  const currentEndpoints = extractEndpoints(currentJson);
  const publishedEndpoints = extractEndpoints(publishedJson);

  const added = [...currentEndpoints].filter((e) => !publishedEndpoints.has(e)).sort();
  const removed = [...publishedEndpoints].filter((e) => !currentEndpoints.has(e)).sort();

  if (added.length === 0 && removed.length === 0) {
    return {
      hasDrift: false,
      summary: "No Postman collection drift detected",
      evidenceFiles: [],
      impactedDocs: [config.published],
    };
  }

  const lines: string[] = [];
  if (added.length) {
    lines.push(`Added endpoints (${added.length}):`);
    lines.push(...added.map((v) => `+ ${v}`));
  }
  if (removed.length) {
    lines.push(`Removed endpoints (${removed.length}):`);
    lines.push(...removed.map((v) => `- ${v}`));
  }
  const summary = lines.join("\n");
  const diffPath = path.join(evidenceDir, "postman.diff.txt");
  fs.writeFileSync(
    diffPath,
    ["# Postman Drift Summary", summary, "", "# Current endpoints", stableStringify([...currentEndpoints].sort()), "", "# Published endpoints", stableStringify([...publishedEndpoints].sort())].join("\n"),
    "utf8"
  );

  return {
    hasDrift: true,
    summary,
    evidenceFiles: [diffPath],
    impactedDocs: [config.published],
    signal: {
      kind: "postman_diff",
      tier: 1,
      confidence: 0.95,
      evidence: [diffPath],
    },
  };
}
