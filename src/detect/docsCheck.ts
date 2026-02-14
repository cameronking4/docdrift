import fs from "node:fs";
import path from "node:path";
import { Signal } from "../model/types";
import { execCommand } from "../utils/exec";
import { ensureDir } from "../utils/fs";

export interface DocsCheckResult {
  signal?: Signal;
  logs: string[];
  summary: string;
  commandResults: Array<{ command: string; exitCode: number; logPath: string }>;
}

export async function runDocsChecks(
  commands: string[],
  evidenceDir: string
): Promise<DocsCheckResult> {
  ensureDir(evidenceDir);

  const logs: string[] = [];
  const commandResults: Array<{ command: string; exitCode: number; logPath: string }> = [];

  for (const [index, command] of commands.entries()) {
    const result = await execCommand(command);
    const logPath = path.join(evidenceDir, `docs-check.${index + 1}.log`);
    fs.writeFileSync(
      logPath,
      [
        `$ ${command}`,
        `exitCode: ${result.exitCode}`,
        "\n--- stdout ---",
        result.stdout,
        "\n--- stderr ---",
        result.stderr,
      ].join("\n"),
      "utf8"
    );
    logs.push(logPath);
    commandResults.push({ command, exitCode: result.exitCode, logPath });
  }

  const failed = commandResults.filter((result) => result.exitCode !== 0);
  if (!failed.length) {
    return {
      logs,
      commandResults,
      summary: "Docs checks passed",
    };
  }

  return {
    logs,
    commandResults,
    summary: `Docs checks failed (${failed.length}/${commandResults.length})`,
    signal: {
      kind: "docs_check_failed",
      tier: 0,
      confidence: 0.99,
      evidence: failed.map((result) => result.logPath),
    },
  };
}
