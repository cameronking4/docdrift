import path from "node:path";
import { buildRepoFingerprint } from "./repo-fingerprint";
import { inferConfigFromFingerprint } from "./ai-infer";
import { runInteractiveForm } from "./interactive-form";
import { buildConfigFromInference, writeConfig, validateGeneratedConfig } from "./generate-yaml";
import { runOnboarding } from "./onboard";
import { runValidate } from "../index";

export interface RunSetupOptions {
  outputPath?: string;
  cwd?: string;
  force?: boolean;
}

export async function runSetup(options: RunSetupOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const outputPath = path.resolve(cwd, options.outputPath ?? "docdrift.yaml");

  const configExists = await import("node:fs").then((fs) => fs.existsSync(outputPath));
  if (configExists && !options.force) {
    const { confirm } = await import("@inquirer/prompts");
    const overwrite = await confirm({
      message: "Config already exists. Overwrite?",
      default: false,
    });
    if (!overwrite) {
      console.log("Setup cancelled.");
      return;
    }
  }

  process.stdout.write("Analyzing your repo…\n");
  const fingerprint = buildRepoFingerprint(cwd);

  process.stdout.write("Generating suggestions…\n");
  const inference = await inferConfigFromFingerprint(fingerprint, cwd);

  const formResult = await runInteractiveForm(inference, cwd);

  let config = buildConfigFromInference(inference, formResult);
  if (formResult.onboarding.addCustomInstructions) {
    const devin = (config.devin as Record<string, unknown>) ?? {};
    (config as Record<string, unknown>).devin = {
      ...devin,
      customInstructions: [".docdrift/DocDrift.md"],
    };
  }

  writeConfig(config as Record<string, unknown>, outputPath);

  const { created } = runOnboarding(cwd, formResult.onboarding);

  const validation = validateGeneratedConfig(outputPath);
  if (!validation.ok) {
    console.error("Config validation failed:\n" + validation.errors.join("\n"));
    throw new Error("Generated config is invalid. Fix the errors above or edit docdrift.yaml manually.");
  }

  if (outputPath === path.resolve(cwd, "docdrift.yaml")) {
    try {
      await runValidate();
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  console.log("\ndocdrift setup complete\n");
  console.log("  docdrift.yaml     written and validated");
  for (const item of created) {
    if (item === ".docdrift/") console.log("  .docdrift/        created");
    else if (item === "DocDrift.md") console.log("  DocDrift.md       created (edit for custom instructions)");
    else if (item === ".gitignore") console.log("  .gitignore        updated");
    else if (item.endsWith("docdrift.yml")) console.log("  " + item + "  added");
  }
  console.log("\nNext steps:");
  console.log("  1. Set DEVIN_API_KEY (local: .env or export; CI: repo secrets)");
  console.log("  2. Set GITHUB_TOKEN in repo secrets for PR comments and issues");
  console.log("  3. Run: docdrift validate   — verify config");
  console.log("  4. Run: docdrift detect     — check for drift");
  console.log("  5. Run: docdrift run        — create Devin session (requires DEVIN_API_KEY)");
}
