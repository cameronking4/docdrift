import fs from "node:fs";
import path from "node:path";
import type { SpecProviderConfig, SpecProviderResult } from "./types";
import { ensureDir } from "../utils/fs";
import { fetchSpec } from "../utils/fetch";
import { fetchSpecPost } from "../utils/fetch";

const GRAPHQL_INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      types { name kind }
      queryType { name }
      mutationType { name }
    }
  }
`;

function normalizeGraphQLSchema(content: string): string {
  // Strip comments and normalize whitespace for comparison
  return content
    .replace(/#[^\n]*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function getCurrentContent(config: SpecProviderConfig): Promise<string> {
  const current = config.current;
  if (current.type === "url") {
    const body = { query: GRAPHQL_INTROSPECTION_QUERY };
    const res = await fetchSpecPost(current.url, body);
    const json = JSON.parse(res);
    const schema = json?.data?.__schema;
    if (!schema) {
      throw new Error("GraphQL introspection did not return __schema");
    }
    return JSON.stringify(schema, null, 2);
  }
  if (current.type === "local") {
    if (!fs.existsSync(current.path)) {
      throw new Error(`GraphQL local path not found: ${current.path}`);
    }
    return fs.readFileSync(current.path, "utf8");
  }
  const { execCommand } = await import("../utils/exec");
  const result = await execCommand(current.command);
  if (result.exitCode !== 0) {
    throw new Error(`GraphQL export failed: ${result.stderr}`);
  }
  if (!fs.existsSync(current.outputPath)) {
    throw new Error(`GraphQL export did not create: ${current.outputPath}`);
  }
  return fs.readFileSync(current.outputPath, "utf8");
}

export async function detectGraphQLSpecDrift(
  config: SpecProviderConfig,
  evidenceDir: string
): Promise<SpecProviderResult> {
  if (config.format !== "graphql") {
    return {
      hasDrift: false,
      summary: `Format ${config.format} is not graphql`,
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
    const logPath = path.join(evidenceDir, "graphql-export.log");
    fs.writeFileSync(logPath, msg, "utf8");
    return {
      hasDrift: true,
      summary: `GraphQL current spec failed: ${msg}`,
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
      summary: "GraphQL published file missing",
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

  const publishedContent = fs.readFileSync(config.published, "utf8");
  const normalizedCurrent = normalizeGraphQLSchema(currentContent);
  const normalizedPublished = normalizeGraphQLSchema(publishedContent);

  if (normalizedCurrent === normalizedPublished) {
    return {
      hasDrift: false,
      summary: "No GraphQL schema drift detected",
      evidenceFiles: [],
      impactedDocs: [config.published],
    };
  }

  const summary = "GraphQL schema changed (types or fields differ).";
  const diffPath = path.join(evidenceDir, "graphql.diff.txt");
  fs.writeFileSync(
    diffPath,
    [
      "# GraphQL Drift Summary",
      summary,
      "",
      "# Published (excerpt)",
      normalizedPublished.slice(0, 8000),
      "",
      "# Current (excerpt)",
      normalizedCurrent.slice(0, 8000),
    ].join("\n"),
    "utf8"
  );

  return {
    hasDrift: true,
    summary,
    evidenceFiles: [diffPath],
    impactedDocs: [config.published],
    signal: {
      kind: "graphql_diff",
      tier: 1,
      confidence: 0.95,
      evidence: [diffPath],
    },
  };
}
