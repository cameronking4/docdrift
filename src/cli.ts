#!/usr/bin/env node
import {
  parseDurationHours,
  requireSha,
  resolveTrigger,
  runDetect,
  runDocDrift,
  runStatus,
  runValidate
} from "./index";

function getArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;

  if (!command) {
    throw new Error("Usage: docdrift <validate|detect|run|status> [options]");
  }

  switch (command) {
    case "validate": {
      await runValidate();
      return;
    }

    case "detect": {
      const baseSha = requireSha(getArg(args, "--base"), "--base");
      const headSha = requireSha(getArg(args, "--head"), "--head");
      const trigger = resolveTrigger(process.env.GITHUB_EVENT_NAME);
      const result = await runDetect({ baseSha, headSha, trigger });
      process.exitCode = result.hasDrift ? 1 : 0;
      return;
    }

    case "run": {
      const baseSha = requireSha(getArg(args, "--base"), "--base");
      const headSha = requireSha(getArg(args, "--head"), "--head");
      const trigger = resolveTrigger(process.env.GITHUB_EVENT_NAME);
      const results = await runDocDrift({ baseSha, headSha, trigger });
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    case "status": {
      const since = getArg(args, "--since");
      const sinceHours = parseDurationHours(since);
      await runStatus(sinceHours);
      return;
    }

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
