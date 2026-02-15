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

/** Ask user whether repo is set up with Devin; if not, we use local (manual) setup. */
async function chooseSetupMode(): Promise<"devin" | "local"> {
  if (!process.stdin.isTTY) {
    return "local";
  }
  const choice = await select({
    message: "Is this repo already set up with Devin? (e.g. added in Devin's Machine)",
    choices: [
      {
        name: "No — use local setup (scan repo, answer a few questions)",
        value: "local",
      },
      {
        name: "Yes — use Devin to generate config (requires repo in Devin + DEVIN_API_KEY)",
        value: "devin",
      },
    ],
  });
  return choice as "devin" | "local";
}

export async function runSetup(options: RunSetupOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const outputPath = path.resolve(cwd, options.outputPath ?? "docdrift.yaml");

  const mode = await chooseSetupMode();
  const hasDevinKey = Boolean(process.env.DEVIN_API_KEY?.trim());

  let result: Awaited<ReturnType<typeof runSetupLocal>>;
  let usedLocalFallback = false;

  if (mode === "local" || (mode === "devin" && !hasDevinKey)) {
    if (mode === "devin" && !hasDevinKey) {
      console.log("\nDEVIN_API_KEY is not set. Using local setup instead.\n");
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
        openPr: options.openPr,
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
  if (result.sessionUrl) console.log("\nSession: " + result.sessionUrl);
  if (result.prUrl) console.log("PR: " + result.prUrl);
  console.log("\nNext steps:");
  const usedLocal = mode === "local" || (mode === "devin" && !hasDevinKey) || usedLocalFallback;
  if (usedLocal) {
    console.log("  1. Run: npx @devinnn/docdrift validate   — verify config");
    console.log("  2. Run: npx @devinnn/docdrift detect     — check for drift");
    if (usedLocalFallback) {
      console.log("  3. (Optional) Fix Devin and run setup again, or keep using local config");
    } else if (mode === "local") {
      console.log("  3. (Optional) Add repo to Devin and set DEVIN_API_KEY to use Devin for setup next time");
    } else {
      console.log("  3. (Optional) Set DEVIN_API_KEY and run setup again to use Devin");
    }
  } else {
    console.log("  1. Add DEVIN_API_KEY to repo secrets (Settings > Secrets > Actions)");
    console.log("  2. Ensure your repo is set up in Devin (Devin's Machine > Add repository)");
    console.log("  3. Run: npx @devinnn/docdrift validate   — verify config");
    console.log("  4. Run: npx @devinnn/docdrift detect     — check for drift");
    console.log("  5. Run: npx @devinnn/docdrift run        — create Devin session (requires DEVIN_API_KEY)");
  }
}
