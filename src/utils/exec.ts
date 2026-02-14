import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execCb);

export interface CommandResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function execCommand(command: string, cwd = process.cwd()): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await exec(command, {
      cwd,
      maxBuffer: 10 * 1024 * 1024
    });
    return { command, stdout, stderr, exitCode: 0 };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; code?: number | string };
    return {
      command,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? String(error),
      exitCode: typeof e.code === "number" ? e.code : 1
    };
  }
}
