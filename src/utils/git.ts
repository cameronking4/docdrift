import { execCommand } from "./exec";

export async function gitChangedPaths(baseSha: string, headSha: string): Promise<string[]> {
  const res = await execCommand(`git diff --name-only ${baseSha} ${headSha}`);
  if (res.exitCode !== 0) {
    throw new Error(`Unable to compute changed paths: ${res.stderr}`);
  }
  return res.stdout
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function gitDiffSummary(baseSha: string, headSha: string): Promise<string> {
  const res = await execCommand(`git diff --stat ${baseSha} ${headSha}`);
  if (res.exitCode !== 0) {
    throw new Error(`Unable to compute diff summary: ${res.stderr}`);
  }
  return res.stdout.trim();
}

export async function gitCommitList(baseSha: string, headSha: string): Promise<string[]> {
  const res = await execCommand(`git log --pretty=format:%H ${baseSha}..${headSha}`);
  if (res.exitCode !== 0) {
    return [];
  }
  return res.stdout
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}
