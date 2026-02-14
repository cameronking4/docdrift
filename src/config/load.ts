import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { DocDriftConfig, docDriftConfigSchema } from "./schema";

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

  return result.data;
}
