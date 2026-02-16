/**
 * docdrift export: DeepWiki static snapshot pipeline.
 * Fetches wiki via MCP, writes MDX + manifest, applies redaction gates.
 */

import path from "node:path";
import { createMcpClient } from "./mcp-client";
import { exportWiki } from "./wiki-exporter";
import { runMintlifyConversion } from "./docsite-mintlify";
import { runDocsiteDevin } from "./docsite-devin";
import type { DocsiteOption } from "./docsite-coming-soon";
import { execCommand } from "../utils/exec";
import { logInfo } from "../utils/log";

export type DocsiteType = "mintlify" | "docusaurus" | "nextjs" | "docsify" | "vitepress" | "mkdocs";

export interface ExportOptions {
  repo?: string;
  outDir?: string;
  mode?: "local" | "pr" | "commit";
  server?: "public" | "private" | "auto";
  failOnSecrets?: boolean;
  /** Skip prompt and run this docsite conversion. */
  docsite?: DocsiteType;
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

  // Docsite conversion step
  let docsiteType = options.docsite;
  if (!docsiteType && process.stdin.isTTY) {
    const { select } = await import("@inquirer/prompts");
    const choice = await select({
      message: "Convert exported docs to a documentation site?",
      choices: [
        { name: "Skip", value: "skip" },
        { name: "Mintlify (local)", value: "mintlify" },
        { name: "Docusaurus (Devin creates PR)", value: "docusaurus" },
        { name: "Next.js + MDX (Devin creates PR)", value: "nextjs" },
        { name: "Docsify (Devin creates PR)", value: "docsify" },
        { name: "VitePress (Devin creates PR)", value: "vitepress" },
        { name: "MkDocs with mkdocs-material (Devin creates PR)", value: "mkdocs" },
      ],
      default: "skip",
    });
    if (choice !== "skip") {
      docsiteType = choice as DocsiteType;
    }
  }

  if (docsiteType) {
    if (docsiteType === "mintlify") {
      runMintlifyConversion(outDir);
    } else {
      const apiKey = process.env.DEVIN_API_KEY?.trim();
      if (!apiKey) {
        throw new Error(
          "DEVIN_API_KEY is required for " +
            docsiteType +
            " docsite (Devin creates a PR). Set it in .env or export. Ensure the repo is added in Devin's Machine."
        );
      }
      const result = await runDocsiteDevin({
        repo,
        outDir,
        docsiteType: docsiteType as DocsiteOption,
        apiKey,
      });
      console.log("");
      if (result.prUrl) {
        console.log("  PR opened: " + result.prUrl);
        console.log("");
      } else {
        console.log("  Session complete. Check for PR: " + result.sessionUrl);
        console.log("");
      }
    }
  }
}
