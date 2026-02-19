import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { execCommand } from "../utils/exec";

/**
 * Update lastKnownBaseline in docdrift.yaml.
 * Used as post-PR action after a docdrift PR is merged.
 */
export async function setBaseline(sha: string, configPath = "docdrift.yaml"): Promise<void> {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Config file not found: ${resolved}`);
  }

  const raw = fs.readFileSync(resolved, "utf8");
  const data = yaml.load(raw) as Record<string, unknown>;

  if (!data || typeof data !== "object") {
    throw new Error("Invalid YAML structure");
  }

  data.lastKnownBaseline = sha;
  const updated = yaml.dump(data, { lineWidth: -1, noRefs: true });
  fs.writeFileSync(resolved, updated, "utf8");
}

/**
 * Resolve SHA for baseline: use arg, or GITHUB_SHA, or current HEAD.
 */
export async function resolveBaselineSha(shaArg?: string): Promise<string> {
  if (shaArg?.trim()) {
    return shaArg.trim();
  }
  const githubSha = process.env.GITHUB_SHA?.trim();
  if (githubSha) {
    return githubSha;
  }
  const res = await execCommand("git rev-parse HEAD");
  if (res.exitCode !== 0) {
    throw new Error(`Could not resolve HEAD: ${res.stderr}`);
  }
  return res.stdout.trim();
}
