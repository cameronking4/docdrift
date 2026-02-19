import { execCommand } from "./exec";

/** Resolve default base/head when not provided. Uses GITHUB_* in CI, else merge-base(main, headRef)..headRef. */
export async function resolveDefaultBaseHead(
  headRef: string = process.env.GITHUB_SHA ?? "HEAD"
): Promise<{ baseSha: string; headSha: string }> {
  const headSha = headRef;
  const baseSha = process.env.GITHUB_BASE_SHA;

  if (baseSha) {
    return { baseSha, headSha };
  }

  for (const branch of ["origin/main", "origin/master", "main", "master"]) {
    const res = await execCommand(`git merge-base ${branch} ${headRef}`);
    if (res.exitCode === 0 && res.stdout.trim()) {
      return { baseSha: res.stdout.trim(), headSha };
    }
  }

  const fallback = await execCommand(`git rev-parse ${headRef}^`);
  if (fallback.exitCode === 0 && fallback.stdout.trim()) {
    return { baseSha: fallback.stdout.trim(), headSha };
  }

  return { baseSha: headSha, headSha };
}

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

/** Read file content at a specific commit. */
export async function gitShowFile(commit: string, filePath: string): Promise<string> {
  const res = await execCommand(`git show ${commit}:${filePath}`);
  if (res.exitCode !== 0) {
    throw new Error(`Failed to read ${filePath} at ${commit}: ${res.stderr}`);
  }
  return res.stdout;
}
