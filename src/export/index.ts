/**
 * docdrift export: DeepWiki static snapshot pipeline.
 * Fetches wiki via MCP, writes MDX + manifest, applies redaction gates.
 */

import path from "node:path";
import { createMcpClient } from "./mcp-client";
import { exportWiki } from "./wiki-exporter";
import { execCommand } from "../utils/exec";
import { logInfo } from "../utils/log";

export interface ExportOptions {
  repo?: string;
  outDir?: string;
  mode?: "local" | "pr" | "commit";
  server?: "public" | "private" | "auto";
  failOnSecrets?: boolean;
}

/** Resolve repo as owner/name from git remote origin or env. */
async function resolveRepo(repoArg?: string): Promise<string> {
  if (repoArg) return repoArg;
  const envRepo = process.env.GITHUB_REPOSITORY;
  if (envRepo) return envRepo;

  const res = await execCommand("git remote get-url origin");
  if (res.exitCode !== 0 || !res.stdout.trim()) {
    throw new Error("Cannot determine repo. Use --repo owner/name or run from a git repo with origin.");
  }
  const url = res.stdout.trim();
  const match = url.match(/(?:github\.com[/:]|git@github\.com:)([^/]+)\/([^/\s]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error(`Cannot parse repo from origin: ${url}. Use --repo owner/name`);
  }
  return `${match[1]}/${match[2].replace(/\.git$/, "")}`;
}

/** Get current commit SHA if in a git repo. */
async function resolveSourceCommit(): Promise<string | undefined> {
  const sha = process.env.GITHUB_SHA;
  if (sha) return sha;
  const res = await execCommand("git rev-parse HEAD");
  return res.exitCode === 0 ? res.stdout.trim() : undefined;
}

/** Default fail-on-secrets: true in CI, false locally. */
function defaultFailOnSecrets(): boolean {
  if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
    return true;
  }
  return false;
}

export async function runExport(options: ExportOptions = {}): Promise<void> {
  require("dotenv").config();

  const repo = await resolveRepo(options.repo);
  const outDir = path.resolve(options.outDir ?? "docs");
  const server = options.server ?? "auto";
  const failOnSecrets = options.failOnSecrets ?? defaultFailOnSecrets();
  const sourceCommit = await resolveSourceCommit();

  logInfo("Exporting DeepWiki", { repo, outDir, server, failOnSecrets });

  const client = await createMcpClient({ server });
  try {
    await exportWiki(client, {
      repo,
      outDir,
      sourceCommit,
      failOnSecrets,
    });
  } finally {
    await client.close();
  }

  const mode = options.mode ?? "local";
  if (mode === "pr" || mode === "commit") {
    logInfo(`Mode ${mode} not yet implemented. Docs written to ${outDir}/deepwiki`);
    // Phase 3: PR/commit logic would go here
  }
}
