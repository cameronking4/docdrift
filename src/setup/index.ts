import path from "node:path";
import { runSetupDevinAndValidate } from "./devin-setup";

export interface RunSetupOptions {
  outputPath?: string;
  cwd?: string;
  force?: boolean;
  /** If true, Devin will open a PR with the setup files (future: not yet implemented) */
  openPr?: boolean;
}

export async function runSetup(options: RunSetupOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const outputPath = path.resolve(cwd, options.outputPath ?? "docdrift.yaml");

  const result = await runSetupDevinAndValidate({
    cwd,
    outputPath: options.outputPath ?? "docdrift.yaml",
    force: options.force,
    openPr: options.openPr,
  });

  console.log("\ndocdrift setup complete\n");
  console.log("  docdrift.yaml     written and validated");
  if (result.docDriftMd) console.log("  .docdrift/DocDrift.md   created (edit for custom instructions)");
  if (result.workflowYml) {
    console.log("  .github/workflows/docdrift.yml         added");
    console.log("  .github/workflows/docdrift-sla-check.yml  added");
  }
  console.log("  .gitignore        updated");
  console.log("\nSummary: " + result.summary);
  console.log("\nSession: " + result.sessionUrl);
  console.log("\nNext steps:");
  console.log("  1. Add DEVIN_API_KEY to repo secrets (Settings > Secrets > Actions)");
  console.log("  2. Ensure your repo is set up in Devin (Devin's Machine > Add repository)");
  console.log("  3. Run: npx @devinnn/docdrift validate   — verify config");
  console.log("  4. Run: npx @devinnn/docdrift detect     — check for drift");
  console.log("  5. Run: npx @devinnn/docdrift run        — create Devin session (requires DEVIN_API_KEY)");
}
