import { confirm, select } from "@inquirer/prompts";
import type { ConfigInference } from "./ai-infer";

export interface OnboardingChoices {
  addCustomInstructions: boolean;
  addGitignore: boolean;
  addWorkflow: boolean;
}

export interface FormResult {
  /** Flat dotted keys from user choices (e.g. "openapi.export" -> value) for merging into config */
  configOverrides: Record<string, unknown>;
  onboarding: OnboardingChoices;
}

export async function runInteractiveForm(
  inference: ConfigInference,
  _cwd: string = process.cwd()
): Promise<FormResult> {
  const configOverrides: Record<string, unknown> = {};
  const skip = new Set(inference.skipQuestions ?? []);

  for (const choice of inference.choices) {
    if (skip.has(choice.key)) continue;
    const options = choice.options;
    if (options.length === 0) continue;

    const defaultOption = options[choice.defaultIndex] ?? options[0];
    const choices = options.map((o, i) => ({
      name: o.recommended ? `${o.label} (recommended)` : o.label,
      value: o.value,
    }));

    const answer = await select({
      message: choice.question,
      choices,
      default: defaultOption?.value,
    });
    configOverrides[choice.key] = answer;
  }

  const addCustomInstructions = await confirm({
    message: "Add a custom instructions file for Devin? (PR titles, tone, project-specific guidance)",
    default: true,
  });

  const addGitignore = await confirm({
    message: "Add .docdrift artifact entries to .gitignore?",
    default: true,
  });

  const addWorkflow = await confirm({
    message: "Add GitHub Actions workflow for docdrift? (runs on push/PR to main)",
    default: false,
  });

  const confirmed = await confirm({
    message: "Write docdrift.yaml and complete setup? (will run validate)",
    default: true,
  });

  if (!confirmed) {
    throw new Error("Setup cancelled");
  }

  return {
    configOverrides,
    onboarding: { addCustomInstructions, addGitignore, addWorkflow },
  };
}
