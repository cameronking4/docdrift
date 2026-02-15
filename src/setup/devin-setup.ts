import path from "node:path";
import fs from "node:fs";
import "dotenv/config";
import { devinCreateSession, devinUploadAttachment, pollUntilTerminal } from "../devin/v1";
import type { DevinSession } from "../devin/v1";
import { SetupOutputSchema } from "../devin/schemas";
import { buildSetupPrompt, DOCDRIFT_SETUP_OUTPUT_TAG } from "./setup-prompt";
import { buildConfigFromInference, validateGeneratedConfig, writeConfig } from "./generate-yaml";
import { runValidate } from "../index";
import { addSlaCheckWorkflow, ensureDocdriftDir, ensureGitignore, runOnboarding } from "./onboard";
import { buildRepoFingerprint } from "./repo-fingerprint";
import { inferConfigFromFingerprint } from "./ai-infer";
import { runInteractiveForm } from "./interactive-form";

/** Resolve path to docdrift.schema.json in the package */
function getSchemaPath(): string {
  // dist/src/setup -> ../../../ ; src/setup (tsx) -> ../..
  const candidates = [
    path.join(__dirname, "../../../docdrift.schema.json"),
    path.join(__dirname, "../../docdrift.schema.json"),
  ];
  const schemaPath = candidates.find((p) => fs.existsSync(p));
  if (!schemaPath) {
    throw new Error(`docdrift.schema.json not found. Tried: ${candidates.join(", ")}`);
  }
  return schemaPath;
}

export interface DevinSetupResult {
  docdriftYaml: string;
  docDriftMd?: string;
  workflowYml?: string;
  summary: string;
  sessionUrl: string;
  /** When openPr was used and Devin opened a PR */
  prUrl?: string;
}

/** Generate docdrift.yaml from repo fingerprint + heuristic (no Devin). */
export async function runSetupLocal(options: {
  cwd?: string;
  outputPath?: string;
  force?: boolean;
}): Promise<DevinSetupResult> {
  const cwd = options.cwd ?? process.cwd();
  const outputPath = path.resolve(cwd, options.outputPath ?? "docdrift.yaml");
  const configExists = fs.existsSync(outputPath);

  if (configExists && !options.force) {
    const { confirm } = await import("@inquirer/prompts");
    const overwrite = await confirm({
      message: "docdrift.yaml already exists. Overwrite?",
      default: false,
    });
    if (!overwrite) {
      throw new Error("Setup cancelled.");
    }
  }

  process.stdout.write("Scanning repo…\n");
  const fingerprint = buildRepoFingerprint(cwd);
  const inference = await inferConfigFromFingerprint(fingerprint, cwd);

  process.stdout.write("Inferred config from repo layout. Adjust if needed.\n");
  const formResult = await runInteractiveForm(inference, cwd);

  const config = buildConfigFromInference(inference, formResult);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  writeConfig(config, outputPath);

  const yamlContent = fs.readFileSync(outputPath, "utf8");

  runOnboarding(cwd, formResult.onboarding);

  const validation = validateGeneratedConfig(outputPath);
  if (!validation.ok) {
    throw new Error("Generated config failed validation:\n" + validation.errors.join("\n"));
  }

  return {
    docdriftYaml: yamlContent,
    docDriftMd: formResult.onboarding.addCustomInstructions ? "(created)" : undefined,
    workflowYml: formResult.onboarding.addWorkflow ? "(added)" : undefined,
    summary: "Generated from repo fingerprint (local detection, no Devin).",
    sessionUrl: "",
  };
}

/** Extract transcript text from session for fallback parsing */
function getSessionTranscript(session: DevinSession): string {
  const messages = session.messages ?? (session as { data?: { messages?: Array<{ content?: string; text?: string }> } }).data?.messages;
  if (!Array.isArray(messages)) return "";
  return messages
    .map((m) => (typeof m.content === "string" ? m.content : (m as { text?: string }).text ?? ""))
    .filter(Boolean)
    .join("\n");
}

/** Parse setup output from <docdrift_setup_output>...</docdrift_setup_output> JSON block in text */
function parseFromStrictTag(text: string): DevinSetupResult | null {
  const openTag = `<${DOCDRIFT_SETUP_OUTPUT_TAG}>`;
  const closeTag = `</${DOCDRIFT_SETUP_OUTPUT_TAG}>`;
  const openIdx = text.indexOf(openTag);
  const closeIdx = text.indexOf(closeTag, openIdx);
  if (openIdx === -1 || closeIdx === -1) return null;
  const inner = text.slice(openIdx + openTag.length, closeIdx).trim();
  try {
    const o = JSON.parse(inner) as Record<string, unknown>;
    const yaml = o.docdriftYaml;
    const summary = o.summary;
    if (typeof yaml !== "string" || typeof summary !== "string") return null;
    return {
      docdriftYaml: yaml,
      docDriftMd: typeof o.docDriftMd === "string" && o.docDriftMd ? o.docDriftMd : undefined,
      workflowYml: typeof o.workflowYml === "string" && o.workflowYml ? o.workflowYml : undefined,
      summary,
      sessionUrl: "",
    };
  } catch {
    return null;
  }
}

/** Fallback: parse from markdown blocks like **docdriftYaml:** ```yaml ... ``` */
function parseFromMarkdownBlocks(text: string): DevinSetupResult | null {
  const yamlMatch = text.match(/\*\*docdriftYaml:\*\*[\s\S]*?```(?:yaml)?\s*([\s\S]*?)```/i);
  const docMdMatch = text.match(/\*\*docDriftMd:\*\*[\s\S]*?```(?:markdown)?\s*([\s\S]*?)```/i);
  const workflowMatch = text.match(/\*\*workflowYml:\*\*[\s\S]*?```(?:yaml)?\s*([\s\S]*?)```/i);
  const summaryBlock = text.match(/\*\*summary:\*\*([\s\S]*?)(?=\n\n\*\*|$)/i)?.[1]?.trim();
  const yaml = yamlMatch?.[1]?.trim();
  const summary = (summaryBlock || "Inferred from repo analysis").slice(0, 500);
  if (!yaml) return null;
  return {
    docdriftYaml: yaml,
    docDriftMd: docMdMatch?.[1]?.trim() || undefined,
    workflowYml: workflowMatch?.[1]?.trim() || undefined,
    summary,
    sessionUrl: "",
  };
}

function parseSetupOutput(session: DevinSession): DevinSetupResult | null {
  const raw = session?.structured_output ?? (session as { data?: Record<string, unknown> })?.data?.structured_output;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const yaml = o.docdriftYaml;
    const summary = o.summary;
    if (typeof yaml === "string" && typeof summary === "string") {
      return {
        docdriftYaml: yaml,
        docDriftMd: typeof o.docDriftMd === "string" && o.docDriftMd ? o.docDriftMd : undefined,
        workflowYml: typeof o.workflowYml === "string" && o.workflowYml ? o.workflowYml : undefined,
        summary,
        sessionUrl: "",
      };
    }
  }
  const transcript = getSessionTranscript(session);
  if (transcript) {
    const fromTag = parseFromStrictTag(transcript);
    if (fromTag) return fromTag;
    const fromMarkdown = parseFromMarkdownBlocks(transcript);
    if (fromMarkdown) return fromMarkdown;
  }
  return null;
}

export async function runSetupDevin(options: {
  cwd?: string;
  outputPath?: string;
  force?: boolean;
  openPr?: boolean;
}): Promise<DevinSetupResult> {
  const cwd = options.cwd ?? process.cwd();
  const outputPath = path.resolve(cwd, options.outputPath ?? "docdrift.yaml");
  const apiKey = process.env.DEVIN_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("DEVIN_API_KEY is required for setup. Set it in .env or export.");
  }

  const configExists = fs.existsSync(outputPath);
  if (configExists && !options.force) {
    const { confirm } = await import("@inquirer/prompts");
    const overwrite = await confirm({
      message: "docdrift.yaml already exists. Overwrite?",
      default: false,
    });
    if (!overwrite) {
      throw new Error("Setup cancelled.");
    }
  }

  process.stdout.write("Uploading schema…\n");
  const schemaPath = getSchemaPath();
  const attachmentUrl = await devinUploadAttachment(apiKey, schemaPath);

  const prompt = buildSetupPrompt([attachmentUrl], { openPr: options.openPr });

  process.stdout.write("Creating Devin session…\n");
  const session = await devinCreateSession(apiKey, {
    prompt,
    unlisted: true,
    max_acu_limit: 2,
    tags: ["docdrift", "setup"],
    attachments: [attachmentUrl],
    structured_output: {
      schema: SetupOutputSchema,
    },
    metadata: { purpose: "docdrift-setup" },
  });

  process.stdout.write("Devin is analyzing the repo and generating config…\n");
  process.stdout.write(`Session: ${session.url}\n`);

  const finalSession = await pollUntilTerminal(apiKey, session.session_id, 15 * 60_000);
  const result = parseSetupOutput(finalSession);

  if (!result) {
    throw new Error(
      "Devin session did not return valid setup output. Check the session for details: " + session.url
    );
  }

  result.sessionUrl = session.url;
  const prUrl =
    finalSession.pull_request_url ??
    finalSession.pr_url ??
    (finalSession as { pull_request?: { url?: string } }).pull_request?.url;
  if (prUrl) result.prUrl = prUrl;

  // Write files (always write for validation; when openPr, Devin also created PR)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, result.docdriftYaml, "utf8");

  if (result.docDriftMd) {
    ensureDocdriftDir(cwd);
    const docDriftPath = path.resolve(cwd, ".docdrift", "DocDrift.md");
    fs.writeFileSync(docDriftPath, result.docDriftMd, "utf8");
  }

  if (result.workflowYml) {
    const workflowsDir = path.resolve(cwd, ".github", "workflows");
    fs.mkdirSync(workflowsDir, { recursive: true });
    fs.writeFileSync(path.join(workflowsDir, "docdrift.yml"), result.workflowYml, "utf8");
    addSlaCheckWorkflow(cwd);
  }

  ensureGitignore(cwd);

  const validation = validateGeneratedConfig(outputPath);
  if (!validation.ok) {
    throw new Error("Generated config failed validation:\n" + validation.errors.join("\n"));
  }

  return result;
}

export async function runSetupDevinAndValidate(options: Parameters<typeof runSetupDevin>[0]): Promise<DevinSetupResult> {
  const result = await runSetupDevin(options);
  const cwd = options.cwd ?? process.cwd();
  const outputPath = path.resolve(cwd, options.outputPath ?? "docdrift.yaml");

  if (outputPath === path.resolve(cwd, "docdrift.yaml")) {
    try {
      await runValidate();
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  return result;
}
