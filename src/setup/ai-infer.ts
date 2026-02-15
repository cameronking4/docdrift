import { createGateway } from "@ai-sdk/gateway";
import { generateText, Output } from "ai";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { RepoFingerprint } from "./repo-fingerprint";
import { fingerprintHash } from "./repo-fingerprint";
import { SYSTEM_PROMPT } from "./prompts";

const pathRuleSchema = z.object({
  match: z.string().min(1),
  impacts: z.array(z.string().min(1)).min(1),
});

const specProviderSchema = z.object({
  format: z.enum(["openapi3", "swagger2", "graphql", "fern", "postman"]),
  current: z.object({
    type: z.literal("export"),
    command: z.string().min(1),
    outputPath: z.string().min(1),
  }),
  published: z.string().min(1),
});

const InferenceSchema = z.object({
  suggestedConfig: z.object({
    version: z.literal(2).optional(),
    specProviders: z.array(specProviderSchema).optional(),
    docsite: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
    exclude: z.array(z.string().min(1)).optional(),
    requireHumanReview: z.array(z.string().min(1)).optional(),
    pathMappings: z.array(pathRuleSchema).optional(),
    mode: z.enum(["strict", "auto"]).optional(),
    devin: z
      .object({
        apiVersion: z.literal("v1"),
        unlisted: z.boolean().optional(),
        maxAcuLimit: z.number().optional(),
        tags: z.array(z.string()).optional(),
        customInstructions: z.array(z.string()).optional(),
      })
      .optional(),
    policy: z
      .object({
        prCaps: z.object({ maxPrsPerDay: z.number(), maxFilesTouched: z.number() }).optional(),
        confidence: z.object({ autopatchThreshold: z.number() }).optional(),
        allowlist: z.array(z.string().min(1)).optional(),
        verification: z.object({ commands: z.array(z.string().min(1)) }).optional(),
        slaDays: z.number().optional(),
        slaLabel: z.string().optional(),
        allowNewFiles: z.boolean().optional(),
      })
      .optional(),
  }),
  choices: z.array(
    z.object({
      key: z.string(),
      question: z.string(),
      options: z.array(
        z.object({
          value: z.string(),
          label: z.string(),
          recommended: z.boolean().optional(),
        })
      ),
      defaultIndex: z.number(),
      help: z.string().optional(),
      warning: z.string().optional(),
      confidence: z.enum(["high", "medium", "low"]),
    })
  ),
  skipQuestions: z.array(z.string()).optional(),
});

export type ConfigInference = z.infer<typeof InferenceSchema>;

const CACHE_DIR = ".docdrift";
const CACHE_FILE = "setup-cache.json";

function getCachePath(cwd: string): string {
  return path.resolve(cwd, CACHE_DIR, CACHE_FILE);
}

function readCache(cwd: string): { fingerprintHash: string; inference: ConfigInference; timestamp: number } | null {
  const cachePath = getCachePath(cwd);
  if (!fs.existsSync(cachePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    const parsed = InferenceSchema.safeParse(raw.inference);
    if (!parsed.success) return null;
    return {
      fingerprintHash: String(raw.fingerprintHash),
      inference: parsed.data,
      timestamp: Number(raw.timestamp) || 0,
    };
  } catch {
    return null;
  }
}

function writeCache(cwd: string, fingerprintHash: string, inference: ConfigInference): void {
  const dir = path.resolve(cwd, CACHE_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    getCachePath(cwd),
    JSON.stringify({ fingerprintHash, inference, timestamp: Date.now() }, null, 2),
    "utf8"
  );
}

export function heuristicInference(fingerprint: RepoFingerprint): ConfigInference {
  const scripts = fingerprint.rootPackage.scripts || {};
  const fp = fingerprint.foundPaths;

  const exportScript = fp.exportScript;
  const openapiExport = exportScript
    ? `npm run ${exportScript.scriptName}`
    : "npm run openapi:export";
  const firstOpenapi = fp.openapi[0];
  const generatedPath =
    exportScript?.inferredOutputPath ??
    (firstOpenapi && !path.dirname(firstOpenapi).includes("docs") ? firstOpenapi : "openapi/generated.json");

  const firstDocsite =
    fp.docusaurusConfig[0]
      ? path.dirname(fp.docusaurusConfig[0]).replace(/\\/g, "/")
      : fp.mkdocs[0]
        ? path.dirname(fp.mkdocs[0]).replace(/\\/g, "/")
        : fp.vitepressConfig?.[0]
          ? path.dirname(fp.vitepressConfig[0]).replace(/\\/g, "/")
          : fp.nextConfig?.[0]
            ? path.dirname(fp.nextConfig[0]).replace(/\\/g, "/")
            : fp.docsDirParents[0]
              ? fp.docsDirParents[0].replace(/\\/g, "/")
              : fp.docsDirs[0]
                ? path.dirname(fp.docsDirs[0]).replace(/\\/g, "/") || undefined
                : undefined;

  const published =
    firstOpenapi && firstDocsite && firstOpenapi.includes(firstDocsite)
      ? firstOpenapi
      : firstDocsite
        ? `${firstDocsite}/openapi/openapi.json`
        : firstOpenapi ?? "openapi/openapi.json";

  const verificationCommands: string[] = [];
  if (scripts["docs:gen"]) verificationCommands.push("npm run docs:gen");
  if (scripts["docs:build"]) verificationCommands.push("npm run docs:build");
  if (verificationCommands.length === 0) verificationCommands.push("npm run build");

  const apiDir = fp.apiDirs[0];
  const matchGlob = apiDir ? `${apiDir}/**` : "**/api/**";

  const allowlistParts = ["openapi/**"];
  if (firstDocsite) allowlistParts.push(`${firstDocsite}/**`);
  if (firstOpenapi) {
    const openapiDir = path.dirname(firstOpenapi).replace(/\\/g, "/");
    if (openapiDir && openapiDir !== "." && !allowlistParts.includes(`${openapiDir}/**`)) {
      allowlistParts.push(`${openapiDir}/**`);
    }
  }
  const allowlist = allowlistParts;

  const requireHumanReview =
    firstDocsite && (fp.docsDirs.length > 0 || fp.docusaurusConfig.length > 0)
      ? [`${firstDocsite}/docs/guides/**`]
      : [];

  const pathMappings =
    firstDocsite || apiDir
      ? [
          {
            match: matchGlob,
            impacts: firstDocsite
              ? [`${firstDocsite}/docs/**`, `${firstDocsite}/openapi/**`]
              : ["**/docs/**", "**/openapi/**"],
          },
        ]
      : [];

  const choices: ConfigInference["choices"] = [
    {
      key: "specProviders.0.current.command",
      question: "OpenAPI export command",
      options: [{ value: openapiExport, label: openapiExport, recommended: true }],
      defaultIndex: 0,
      help: "Use the npm script that generates the spec (e.g. npm run openapi:export).",
      confidence: "medium",
    },
  ];
  if (!firstDocsite) {
    choices.push({
      key: "docsite",
      question: "Docsite path",
      options: [{ value: "", label: "(specify path to docs site root)", recommended: false }],
      defaultIndex: 0,
      help: "Path to Docusaurus, MkDocs, VitePress, or other docs site root.",
      confidence: "low",
    });
  } else {
    choices.push({
      key: "docsite",
      question: "Docsite path",
      options: [{ value: firstDocsite, label: firstDocsite, recommended: true }],
      defaultIndex: 0,
      confidence: "medium",
    });
  }
  if (!apiDir) {
    choices.push({
      key: "pathMappings.0.match",
      question: "API/source code path (pathMappings.match)",
      options: [{ value: "**/api/**", label: "**/api/** (generic)", recommended: true }],
      defaultIndex: 0,
      help: "Glob for API or source code that, when changed, may require doc updates.",
      confidence: "low",
    });
  }

  return {
    suggestedConfig: {
      version: 2,
      specProviders: [
        {
          format: "openapi3" as const,
          current: {
            type: "export" as const,
            command: openapiExport,
            outputPath: generatedPath,
          },
          published,
        },
      ],
      ...(firstDocsite ? { docsite: firstDocsite } : {}),
      exclude: ["**/CHANGELOG*", "**/blog/**"],
      requireHumanReview,
      pathMappings,
      mode: "strict" as const,
      devin: { apiVersion: "v1", unlisted: true, maxAcuLimit: 2, tags: ["docdrift"] },
      policy: {
        prCaps: { maxPrsPerDay: 5, maxFilesTouched: 30 },
        confidence: { autopatchThreshold: 0.8 },
        allowlist,
        verification: { commands: verificationCommands },
        slaDays: 7,
        slaLabel: "docdrift",
        allowNewFiles: false,
      },
    },
    choices,
    skipQuestions: [],
  };
}

export async function inferConfigFromFingerprint(
  fingerprint: RepoFingerprint,
  cwd: string = process.cwd()
): Promise<ConfigInference> {
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  const hash = fingerprintHash(fingerprint);
  const cached = readCache(cwd);

  if (cached && cached.fingerprintHash === hash) return cached.inference;

  if (!apiKey) return heuristicInference(fingerprint);

  const gateway = createGateway({
    apiKey,
    baseURL: "https://ai-gateway.vercel.sh/v1/ai",
  });

  const prompt = `Repo fingerprint:\n${JSON.stringify(fingerprint, null, 2)}`;

  try {
    const result = await generateText({
      model: gateway("anthropic/claude-opus-4.6") as never,
      system: SYSTEM_PROMPT,
      prompt,
      experimental_output: Output.object({
        schema: InferenceSchema,
      }),
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(60_000),
    });
    const output = (result as { experimental_output?: ConfigInference }).experimental_output as ConfigInference | undefined;
    if (!output) throw new Error("No structured output");
    const parsed = InferenceSchema.safeParse(output);
    if (!parsed.success) throw new Error(parsed.error.message);
    const inference = parsed.data;
    writeCache(cwd, hash, inference);
    return inference;
  } catch {
    return heuristicInference(fingerprint);
  }
}
