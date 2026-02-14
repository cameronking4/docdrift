import { Octokit } from "@octokit/rest";

export function parseRepo(full: string): { owner: string; repo: string } {
  const [owner, repo] = full.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid repository slug: ${full}`);
  }
  return { owner, repo };
}

export interface IssueInput {
  title: string;
  body: string;
  labels?: string[];
}

export async function postCommitComment(input: {
  token: string;
  repository: string;
  commitSha: string;
  body: string;
}): Promise<string> {
  const octokit = new Octokit({ auth: input.token });
  const { owner, repo } = parseRepo(input.repository);

  const response = await octokit.repos.createCommitComment({
    owner,
    repo,
    commit_sha: input.commitSha,
    body: input.body,
  });

  return response.data.html_url;
}

/** Post a comment on a pull request (e.g. to link the doc drift PR when trigger is pull_request). */
export async function postPrComment(input: {
  token: string;
  repository: string;
  prNumber: number;
  body: string;
}): Promise<string> {
  const octokit = new Octokit({ auth: input.token });
  const { owner, repo } = parseRepo(input.repository);

  const response = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: input.prNumber,
    body: input.body,
  });

  return response.data.html_url;
}

export async function createIssue(input: {
  token: string;
  repository: string;
  issue: IssueInput;
}): Promise<string> {
  const octokit = new Octokit({ auth: input.token });
  const { owner, repo } = parseRepo(input.repository);

  const response = await octokit.issues.create({
    owner,
    repo,
    title: input.issue.title,
    body: input.issue.body,
    labels: input.issue.labels,
  });

  return response.data.html_url;
}

export function renderRunComment(input: {
  docArea: string;
  summary: string;
  decision: string;
  outcome: string;
  sessionUrl?: string;
  prUrl?: string;
  issueUrl?: string;
  validation: Array<{ command: string; result: string }>;
}): string {
  const lines: string[] = [];
  lines.push(`## Doc Drift Result: ${input.docArea}`);
  lines.push("");
  lines.push(`- Decision: ${input.decision}`);
  lines.push(`- Outcome: ${input.outcome}`);
  lines.push(`- Summary: ${input.summary}`);
  if (input.sessionUrl) {
    lines.push(`- Devin Session: ${input.sessionUrl}`);
  }
  if (input.prUrl) {
    lines.push(`- PR: ${input.prUrl}`);
  }
  if (input.issueUrl) {
    lines.push(`- Issue: ${input.issueUrl}`);
  }

  if (input.validation.length) {
    lines.push("");
    lines.push("### Validation");
    for (const row of input.validation) {
      lines.push(`- \`${row.command}\`: ${row.result}`);
    }
  }

  return lines.join("\n");
}

export function renderBlockedIssueBody(input: {
  docArea: string;
  evidenceSummary: string;
  questions: string[];
  suggestedPatch?: string;
  sessionUrl?: string;
}): string {
  const lines: string[] = [];
  lines.push(`Doc area: ${input.docArea}`);
  lines.push("");
  lines.push("## Evidence");
  lines.push(input.evidenceSummary);
  lines.push("");
  lines.push("## Questions");
  for (const question of input.questions) {
    lines.push(`- ${question}`);
  }

  if (input.suggestedPatch) {
    lines.push("");
    lines.push("## Suggested Patch");
    lines.push("```diff");
    lines.push(input.suggestedPatch);
    lines.push("```");
  }

  if (input.sessionUrl) {
    lines.push("");
    lines.push(`Session: ${input.sessionUrl}`);
  }

  return lines.join("\n");
}

export function renderRequireHumanReviewIssueBody(input: {
  prUrl: string;
  touchedPaths: string[];
}): string {
  const lines: string[] = [];
  lines.push("## Why this issue");
  lines.push("");
  lines.push("This doc-drift PR touches paths that require human review (guides, prose, or other non-technical docs).");
  lines.push("");
  lines.push("## What to do");
  lines.push("");
  lines.push(`1. Review the PR: ${input.prUrl}`);
  lines.push("2. Confirm the changes are correct or request modifications.");
  lines.push("3. Merge or close the PR.");
  lines.push("");
  if (input.touchedPaths.length > 0) {
    lines.push("## Touched paths (require review)");
    lines.push("");
    for (const p of input.touchedPaths.slice(0, 20)) {
      lines.push(`- \`${p}\``);
    }
    if (input.touchedPaths.length > 20) {
      lines.push(`- ... and ${input.touchedPaths.length - 20} more`);
    }
  }
  return lines.join("\n");
}

export function renderSlaIssueBody(input: { prUrls: string[]; slaDays: number }): string {
  const lines: string[] = [];
  lines.push("## Why this issue");
  lines.push("");
  lines.push(`Doc-drift PR(s) have been open for ${input.slaDays}+ days. Docs may be out of sync.`);
  lines.push("");
  lines.push("## What to do");
  lines.push("");
  lines.push("Please review and merge or close the following PR(s):");
  lines.push("");
  for (const url of input.prUrls) {
    lines.push(`- ${url}`);
  }
  lines.push("");
  lines.push("If the PR is no longer needed, close it to resolve this reminder.");
  return lines.join("\n");
}

/** Check if a PR is still open. URL format: https://github.com/owner/repo/pull/123 */
export async function isPrOpen(
  token: string,
  prUrl: string
): Promise<{ open: boolean; number?: number }> {
  const match = prUrl.match(/github\.com[/]([^/]+)[/]([^/]+)[/]pull[/](\d+)/);
  if (!match) return { open: false };
  const [, owner, repo, numStr] = match;
  const number = parseInt(numStr ?? "0", 10);
  if (!owner || !repo || !Number.isFinite(number)) return { open: false };
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.pulls.get({ owner, repo, pull_number: number });
  return { open: data.state === "open", number: data.number };
}

/** List open PRs with a given label */
export async function listOpenPrsWithLabel(
  token: string,
  repository: string,
  label: string
): Promise<Array<{ url: string; number: number; created_at: string }>> {
  const octokit = new Octokit({ auth: token });
  const { owner, repo } = parseRepo(repository);
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state: "open",
    labels: label,
  });
  return data.map((pr) => ({
    url: pr.html_url ?? "",
    number: pr.number,
    created_at: pr.created_at ?? "",
  }));
}

/** Find an existing open docdrift PR for a given source PR number.
 * Looks for PRs from branch docdrift/pr-{sourcePrNumber} (Devin's convention).
 * Returns the first match so we can instruct Devin to update it instead of creating a new one.
 */
export async function findExistingDocdriftPrForSource(
  token: string,
  repository: string,
  sourcePrNumber: number
): Promise<{ number: number; url: string; headRef: string } | null> {
  const octokit = new Octokit({ auth: token });
  const { owner, repo } = parseRepo(repository);
  const branchName = `docdrift/pr-${sourcePrNumber}`;
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state: "open",
    head: branchName,
  });
  const pr = data[0];
  if (!pr) return null;
  return {
    number: pr.number,
    url: pr.html_url ?? "",
    headRef: pr.head?.ref ?? branchName,
  };
}
