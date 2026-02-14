import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { normalizeConfig } from "./normalize";
import { DocDriftConfig, docDriftConfigSchema } from "./schema";
import type { NormalizedDocDriftConfig } from "./schema";

export function loadConfig(configPath = "docdrift.yaml"): DocDriftConfig {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Config file not found: ${resolved}`);
  }

  const parsed = yaml.load(fs.readFileSync(resolved, "utf8"));
  const result = docDriftConfigSchema.safeParse(parsed);
  if (!result.success) {
    const message = result.error.errors
      .map((e) => `${e.path.join(".") || "root"}: ${e.message}`)
      .join("\n");
    throw new Error(`Invalid config:\n${message}`);
  }

  const data = result.data;
  if (data.devin.customInstructions?.length) {
    const configDir = path.dirname(resolved);
    const contents: string[] = [];
    for (const p of data.devin.customInstructions) {
      const fullPath = path.resolve(configDir, p);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Custom instructions file not found: ${fullPath}`);
      }
      contents.push(fs.readFileSync(fullPath, "utf8"));
    }
    data.devin.customInstructionContent = contents.join("\n\n");
  }

  return data;
}

/** Load and normalize config for use by detection/run (always has openapi, docsite, etc.) */
export function loadNormalizedConfig(
  configPath = "docdrift.yaml"
): NormalizedDocDriftConfig {
  const config = loadConfig(configPath);
  return normalizeConfig(config);
}
