import { Octokit } from "@octokit/rest";

function parseRepo(full: string): { owner: string; repo: string } {
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
