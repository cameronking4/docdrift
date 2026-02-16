#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  parseDurationHours,
  resolveBaseHead,
  resolveTrigger,
  runDetect,
  runDocDrift,
  runSlaCheck,
  runStatus,
  runValidate,
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
    throw new Error(
      "Usage: docdrift <validate|detect|run|status|sla-check|setup|generate-yaml|export> [options]\n" +
        "  validate          Validate docdrift.yaml (v2 config)\n" +
        "  detect            Check for drift [--base SHA] [--head SHA]\n" +
        "  run               Full run with Devin [--base SHA] [--head SHA]\n" +
        "  status            Show run status [--since 24h]\n" +
        "  sla-check         Check SLA for unmerged PRs\n" +
        "  setup             Interactive setup (generates v2 docdrift.yaml)\n" +
        "  generate-yaml     Generate config [--output path] [--force] [--open-pr]\n" +
        "  export            Export DeepWiki to MDX [--repo owner/name] [--out path] [--fail-on-secrets]"
    );
  }

  if (command === "setup" || command === "generate-yaml") {
    require("dotenv").config();
    const { runSetup } = await import("./setup");
    await runSetup({
      outputPath: getArg(args, "--output") ?? "docdrift.yaml",
      force: args.includes("--force"),
      openPr: args.includes("--open-pr"),
    });
    return;
  }

  switch (command) {
    case "validate": {
      await runValidate();
      return;
    }

    case "detect": {
      const { baseSha, headSha } = await resolveBaseHead(getArg(args, "--base"), getArg(args, "--head"));
      const trigger = (getArg(args, "--trigger") as "push" | "manual" | "schedule" | "pull_request" | undefined) ?? resolveTrigger(process.env.GITHUB_EVENT_NAME);
      const prNum = getArg(args, "--pr-number");
      const prNumber = prNum ? parseInt(prNum, 10) : (process.env.GITHUB_PR_NUMBER ? parseInt(process.env.GITHUB_PR_NUMBER, 10) : undefined);
      const result = await runDetect({ baseSha, headSha, trigger, prNumber: Number.isFinite(prNumber) ? prNumber : undefined });
      process.exitCode = result.hasDrift ? 1 : 0;
      return;
    }

    case "run": {
      const { baseSha, headSha } = await resolveBaseHead(getArg(args, "--base"), getArg(args, "--head"));
      const trigger = (getArg(args, "--trigger") as "push" | "manual" | "schedule" | "pull_request" | undefined) ?? resolveTrigger(process.env.GITHUB_EVENT_NAME);
      const prNum = getArg(args, "--pr-number");
      const prNumber = prNum ? parseInt(prNum, 10) : (process.env.GITHUB_PR_NUMBER ? parseInt(process.env.GITHUB_PR_NUMBER, 10) : undefined);
      const results = await runDocDrift({ baseSha, headSha, trigger, prNumber: Number.isFinite(prNumber) ? prNumber : undefined });
      const outPath = path.resolve(".docdrift", "run-output.json");
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    case "status": {
      const since = getArg(args, "--since");
      const sinceHours = parseDurationHours(since);
      await runStatus(sinceHours);
      return;
    }

    case "sla-check": {
      await runSlaCheck();
      return;
    }

    case "export": {
      require("dotenv").config();
      const { runExport } = await import("./export");
      await runExport({
        repo: getArg(args, "--repo"),
        outDir: getArg(args, "--out"),
        mode: (getArg(args, "--mode") as "local" | "pr" | "commit") ?? "local",
        server: (getArg(args, "--server") as "public" | "private" | "auto") ?? "auto",
        failOnSecrets: args.includes("--fail-on-secrets") ? true : undefined,
      });
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
