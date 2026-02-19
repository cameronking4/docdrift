import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { ConfigInference } from "./ai-infer";
import type { FormResult } from "./interactive-form";
import { docDriftConfigSchema } from "../config/schema";

function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const s = source[key];
    const t = out[key];
    if (s != null && typeof s === "object" && !Array.isArray(s) && t != null && typeof t === "object" && !Array.isArray(t)) {
      (out as Record<string, unknown>)[key] = deepMerge(t as Record<string, unknown>, s as Record<string, unknown>);
    } else if (s !== undefined) {
      (out as Record<string, unknown>)[key] = s;
    }
  }
  return out;
}

function applyOverrides(base: Record<string, unknown>, overrides: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(overrides)) {
    setByKey(base, key, value);
  }
}

function setByKey(obj: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split(".");
  let cur: Record<string, unknown> = obj;
  let i = 0;
  while (i < parts.length - 1) {
    const p = parts[i]!;
    const nextPart = parts[i + 1];
    const isArrayIndex = nextPart !== undefined && /^\d+$/.test(nextPart);
    const existing = cur[p];

    if (existing != null && typeof existing === "object") {
      if (Array.isArray(existing) && isArrayIndex) {
        const idx = parseInt(nextPart!, 10);
        let el = existing[idx];
        if (el == null || typeof el !== "object") {
          el = {};
          existing[idx] = el;
        }
        cur = el as Record<string, unknown>;
        i += 2;
        continue;
      }
      if (!Array.isArray(existing)) {
        cur = existing as Record<string, unknown>;
      } else {
        cur[p] = isArrayIndex ? [] : {};
        cur = cur[p] as Record<string, unknown>;
      }
    } else {
      const next = isArrayIndex ? [] : {};
      cur[p] = next;
      cur = next as Record<string, unknown>;
    }
    i++;
  }
  cur[parts[parts.length - 1]!] = value;
}

/** Structural defaults only; path fields (docsite, specProviders, allowlist paths) come from inference. */
const DEFAULT_CONFIG = {
  version: 2 as const,
  specProviders: [] as Array<{
    format: "openapi3";
    current: { type: "export"; command: string; outputPath: string };
    published: string;
  }>,
  exclude: [] as string[],
  requireHumanReview: [] as string[],
  pathMappings: [] as Array<{ match: string; impacts: string[] }>,
  mode: "strict" as const,
  devin: {
    apiVersion: "v1" as const,
    unlisted: true,
    maxAcuLimit: 2,
    tags: ["docdrift"],
  },
  policy: {
    prCaps: { maxPrsPerDay: 5, maxFilesTouched: 30 },
    confidence: { autopatchThreshold: 0.8 },
    allowlist: ["openapi/**"] as string[],
    verification: { commands: ["npm run build"] },
    slaDays: 7,
    slaLabel: "docdrift",
    allowNewFiles: false,
  },
};

export function buildConfigFromInference(
  inference: ConfigInference,
  formResult: FormResult
): Record<string, unknown> {
  const base = deepMerge(
    { ...DEFAULT_CONFIG },
    inference.suggestedConfig as Record<string, unknown>
  );
  applyOverrides(base, formResult.configOverrides);
  return base;
}

export function writeConfig(
  config: Record<string, unknown>,
  outputPath: string
): void {
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });
  const yamlContent = [
    "# yaml-language-server: $schema=https://unpkg.com/@devinnn/docdrift@latest/docdrift.schema.json",
    yaml.dump(config, { lineWidth: 120, noRefs: true }),
    "# lastKnownBaseline: optional commit SHA where docs were in sync. Blank = assume drift. Set via: docdrift baseline set",
  ].join("\n");
  fs.writeFileSync(outputPath, yamlContent, "utf8");
}

export function validateYamlContent(yamlContent: string): { ok: boolean; errors: string[] } {
  try {
    const parsed = yaml.load(yamlContent);
    const result = docDriftConfigSchema.safeParse(parsed);
    if (!result.success) {
      const errors = result.error.errors.map((e) => `${e.path.join(".") || "root"}: ${e.message}`);
      return { ok: false, errors };
    }
    return { ok: true, errors: [] };
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] };
  }
}

export function validateGeneratedConfig(configPath: string): { ok: boolean; errors: string[] } {
  try {
    const content = fs.readFileSync(configPath, "utf8");
    return validateYamlContent(content);
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] };
  }
}
