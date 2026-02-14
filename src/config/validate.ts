import { DocDriftConfig } from "./schema";
import { execCommand } from "../utils/exec";

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

function commandBinary(command: string): string {
  return command.trim().split(/\s+/)[0] ?? "";
}

export async function validateRuntimeConfig(config: DocDriftConfig): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.policy.prCaps.maxFilesTouched < 1) {
    errors.push("policy.prCaps.maxFilesTouched must be >= 1");
  }

  const commandSet = new Set<string>([
    ...config.policy.verification.commands,
    ...config.docAreas
      .map((area) => area.detect.openapi?.exportCmd)
      .filter((value): value is string => Boolean(value))
  ]);

  for (const command of commandSet) {
    const binary = commandBinary(command);
    const result = await execCommand(`command -v ${binary}`);
    if (result.exitCode !== 0) {
      errors.push(`Command not found for '${command}' (binary: ${binary})`);
    }
  }

  for (const area of config.docAreas) {
    if (area.mode === "autogen" && !area.patch.targets?.length) {
      warnings.push(`docArea '${area.name}' is autogen but has no patch.targets`);
    }
    if (area.mode === "conceptual" && !area.detect.paths?.length) {
      warnings.push(`docArea '${area.name}' is conceptual but has no detect.paths rules`);
    }
  }

  return { errors, warnings };
}
