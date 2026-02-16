import path from "node:path";
import { select } from "@inquirer/prompts";
import { runSetupDevinAndValidate, runSetupLocal } from "./devin-setup";

export interface RunSetupOptions {
  outputPath?: string;
  cwd?: string;
  force?: boolean;
  /** If true, Devin will create a branch, commit, push, and open a PR with the setup files */
  openPr?: boolean;
}

/** Choose setup path: Manual (local fingerprint + heuristic) or Devin PR (Devin creates PR; merge and pull to complete). */
async function chooseSetupMode(): Promise<"manual" | "devin-pr"> {
  if (!process.stdin.isTTY) {
    return "manual";
  }
  const choice = await select({
    message: "How do you want to set up docdrift?",
    choices: [
      {
        name: "Manual — use local detection (scan repo, answer a few questions)",
        value: "manual",
      },
      {
        name: "Devin PR — Devin creates a PR; you merge and pull to complete (requires DEVIN_API_KEY + repo in Devin)",
        value: "devin-pr",
      },
    ],
  });
  return choice as "manual" | "devin-pr";
}

export async function runSetup(options: RunSetupOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const outputPath = path.resolve(cwd, options.outputPath ?? "docdrift.yaml");

  const mode = await chooseSetupMode();
  const hasDevinKey = Boolean(process.env.DEVIN_API_KEY?.trim());

  let result: Awaited<ReturnType<typeof runSetupLocal>>;
  let usedLocalFallback = false;

  if (mode === "manual" || (mode === "devin-pr" && !hasDevinKey)) {
    if (mode === "devin-pr" && !hasDevinKey) {
      console.log("\nDEVIN_API_KEY is not set. Using manual setup instead.\n");
    }
    result = await runSetupLocal({
      cwd,
      outputPath: options.outputPath ?? "docdrift.yaml",
      force: options.force,
    });
  } else {
    try {
      result = await runSetupDevinAndValidate({
        cwd,
        outputPath: options.outputPath ?? "docdrift.yaml",
        force: options.force,
        openPr: true,
      });
    } catch (err) {
      console.error("\nDevin setup failed:", err instanceof Error ? err.message : String(err));
      console.log("\nFalling back to local detection (repo fingerprint + heuristic)…\n");
      usedLocalFallback = true;
      result = await runSetupLocal({
        cwd,
        outputPath: options.outputPath ?? "docdrift.yaml",
        force: options.force,
      });
    }
  }

  const completedViaDevinPr = Boolean(result.prUrl);

  if (completedViaDevinPr) {
    console.log("\ndocdrift setup complete (PR created)\n");
    console.log("  Session: " + result.sessionUrl);
    console.log("  PR: " + result.prUrl);
    if (result.summary) console.log("\nSummary: " + result.summary);
    if (process.stdin.isTTY) {
      const { confirm } = await import("@inquirer/prompts");
      const checkout = await confirm({
        message: "Checkout branch to review/edit before merging?",
        default: false,
      });
      if (checkout) {
        const { execSync } = await import("node:child_process");
        try {
          execSync("git fetch origin docdrift/setup 2>/dev/null || true", { cwd, stdio: "inherit" });
          execSync("git checkout docdrift/setup", { cwd, stdio: "inherit" });
          console.log("\nOn branch docdrift/setup. Edit files, push, then merge the PR.");
        } catch {
          console.log("\nCould not checkout branch. Merge the PR in GitHub, then run: git pull");
        }
      }
    }
    console.log("\nNext steps:");
    console.log("  1. Merge the PR in GitHub (or edit on branch docdrift/setup, push, then merge)");
    console.log("  2. Run: git pull");
    console.log("  3. Run: npx @devinnn/docdrift validate");
    console.log("  4. Add DEVIN_API_KEY to repo secrets (Settings > Secrets > Actions)");
    console.log("  5. Run: npx @devinnn/docdrift detect  and  npx @devinnn/docdrift run");
    return;
  }

  if (outputPath === path.resolve(cwd, "docdrift.yaml")) {
    const { runValidate } = await import("../index");
    await runValidate();
  }

  console.log("\ndocdrift setup complete\n");
  console.log("  docdrift.yaml     written and validated");
  if (result.docDriftMd) console.log("  .docdrift/DocDrift.md   created (edit for custom instructions)");
  if (result.workflowYml) {
    console.log("  .github/workflows/docdrift.yml         added");
    console.log("  .github/workflows/docdrift-sla-check.yml  added");
  }
  console.log("  .gitignore        updated");
  console.log("\nSummary: " + result.summary);
  console.log("\nNext steps:");
  const usedLocal = mode === "manual" || (mode === "devin-pr" && !hasDevinKey) || usedLocalFallback;
  if (usedLocal) {
    console.log("  1. Run: npx @devinnn/docdrift validate   — verify config");
    console.log("  2. Run: npx @devinnn/docdrift detect     — check for drift");
    if (usedLocalFallback) {
      console.log("  3. (Optional) Fix Devin and run setup again, or keep using local config");
    } else if (mode === "manual") {
      console.log("  3. (Optional) Add repo to Devin and set DEVIN_API_KEY to use Devin PR setup next time");
    } else {
      console.log("  3. (Optional) Set DEVIN_API_KEY and run setup again to use Devin PR");
    }
  } else {
    console.log("  1. Add DEVIN_API_KEY to repo secrets (Settings > Secrets > Actions)");
    console.log("  2. Ensure your repo is set up in Devin (Devin's Machine > Add repository)");
    console.log("  3. Run: npx @devinnn/docdrift validate   — verify config");
    console.log("  4. Run: npx @devinnn/docdrift detect     — check for drift");
    console.log("  5. Run: npx @devinnn/docdrift run        — create Devin session (requires DEVIN_API_KEY)");
  }
}
