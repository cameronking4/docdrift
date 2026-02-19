import { z } from "zod";

/** Path rule: when `match` changes, `impacts` may need updates. Used by docAreas and by simple `paths` block. */
export const pathRuleSchema = z.object({
  match: z.string().min(1),
  impacts: z.array(z.string().min(1)).min(1),
});

const openApiDetectSchema = z.object({
  exportCmd: z.string().min(1),
  generatedPath: z.string().min(1),
  publishedPath: z.string().min(1),
});

/** Simple config: short field names for openapi block */
export const openApiSimpleSchema = z.object({
  export: z.string().min(1),
  generated: z.string().min(1),
  published: z.string().min(1),
});

/** Spec source: URL, local path, or export command */
const specSourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("url"), url: z.string().url() }),
  z.object({ type: z.literal("local"), path: z.string().min(1) }),
  z.object({
    type: z.literal("export"),
    command: z.string().min(1),
    outputPath: z.string().min(1),
  }),
]);

const specFormatSchema = z.enum(["openapi3", "swagger2", "graphql", "fern", "postman"]);

const validationSchema = z.object({
  enabled: z.boolean().optional().default(true),
  /** Path patterns to skip validation (e.g. /health, /ready) */
  allowlist: z.array(z.string().min(1)).optional().default([]),
});

/** Single spec provider (v2 config) */
export const specProviderConfigSchema = z.object({
  format: specFormatSchema,
  current: specSourceSchema,
  published: z.string().min(1),
  validation: validationSchema.optional(),
});

const docAreaDetectBaseSchema = z.object({
  openapi: openApiDetectSchema.optional(),
  paths: z.array(pathRuleSchema).optional(),
});

/** Base schema without refine — for JSON Schema generation (zod-to-json-schema doesn't handle .refine()) */
export const docAreaBaseSchema = z.object({
  name: z.string().min(1),
  mode: z.enum(["autogen", "conceptual"]),
  owners: z.object({
    reviewers: z.array(z.string().min(1)).min(1),
  }),
  detect: docAreaDetectBaseSchema,
  patch: z.object({
    targets: z.array(z.string().min(1)).optional(),
    requireHumanConfirmation: z.boolean().optional().default(false),
  }),
});

const docAreaSchema = z.object({
  name: z.string().min(1),
  mode: z.enum(["autogen", "conceptual"]),
  owners: z.object({
    reviewers: z.array(z.string().min(1)).min(1),
  }),
  detect: docAreaDetectBaseSchema.refine((v) => Boolean(v.openapi) || Boolean(v.paths?.length), {
    message: "docArea.detect must include openapi or paths",
  }),
  patch: z.object({
    targets: z.array(z.string().min(1)).optional(),
    requireHumanConfirmation: z.boolean().optional().default(false),
  }),
});

const policySchema = z.object({
  prCaps: z.object({
    maxPrsPerDay: z.number().int().positive().default(1),
    maxFilesTouched: z.number().int().positive().default(12),
  }),
  confidence: z.object({
    autopatchThreshold: z.number().min(0).max(1).default(0.8),
  }),
  allowlist: z.array(z.string().min(1)).min(1),
  verification: z.object({
    commands: z.array(z.string().min(1)).min(1),
  }),
  /** Days before opening SLA issue for unmerged doc-drift PRs. 0 = disabled. */
  slaDays: z.number().int().min(0).optional().default(7),
  /** Label to identify doc-drift PRs for SLA check (only these PRs count). */
  slaLabel: z.string().min(1).optional().default("docdrift"),
  /**
   * If false (default): Devin may only edit existing files. No new articles, no new folders.
   * If true: Devin may add new articles, create folders, change information architecture.
   * Gives teams control to prevent doc sprawl; mainly applies to conceptual/guides.
   */
  allowNewFiles: z.boolean().optional().default(false),
});

/** Base schema without refine — for JSON Schema generation (zod-to-json-schema doesn't handle .refine()) */
export const docDriftConfigBaseSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  specProviders: z.array(specProviderConfigSchema).optional(),
  openapi: openApiSimpleSchema.optional(),
  docsite: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
  exclude: z.array(z.string().min(1)).optional().default([]),
  requireHumanReview: z.array(z.string().min(1)).optional().default([]),
  pathMappings: z.array(pathRuleSchema).optional().default([]),
  /** strict: only run on spec drift. auto: also run when pathMappings match (no spec drift). */
  mode: z.enum(["strict", "auto"]).optional().default("strict"),
  /** Branch prefix for docdrift branches. Default "docdrift". */
  branchPrefix: z.string().min(1).optional().default("docdrift"),
  /** Branch strategy: "single" = one branch for all runs (lownoise), "per-pr" = one branch per source PR. Default "single". */
  branchStrategy: z.enum(["single", "per-pr"]).optional().default("single"),
  /** Last known commit where docs were in sync. Blank = assume drift. Updated after docdrift PR merges. */
  lastKnownBaseline: z.string().min(1).optional(),
  devin: z.object({
    apiVersion: z.literal("v1"),
    unlisted: z.boolean().default(true),
    maxAcuLimit: z.number().int().positive().default(2),
    tags: z.array(z.string().min(1)).default(["docdrift"]),
    customInstructions: z.array(z.string().min(1)).optional(),
    customInstructionContent: z.string().optional(),
    /** When trigger is pull_request: "commit-to-branch" = commit to source PR branch (low noise); "separate-pr" = create docdrift/pr-N PR. Default "commit-to-branch". */
    prStrategy: z.enum(["commit-to-branch", "separate-pr"]).optional().default("commit-to-branch"),
  }),
  policy: policySchema,
  docAreas: z.array(docAreaBaseSchema).optional().default([]),
});

const docDriftConfigObjectSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  specProviders: z.array(specProviderConfigSchema).optional(),
  openapi: openApiSimpleSchema.optional(),
  docsite: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
  exclude: z.array(z.string().min(1)).optional().default([]),
  requireHumanReview: z.array(z.string().min(1)).optional().default([]),
  pathMappings: z.array(pathRuleSchema).optional().default([]),
  /** strict: only run on spec drift. auto: also run when pathMappings match (no spec drift). */
  mode: z.enum(["strict", "auto"]).optional().default("strict"),
  /** Branch prefix for docdrift branches. Default "docdrift". */
  branchPrefix: z.string().min(1).optional().default("docdrift"),
  /** Branch strategy: "single" = one branch for all runs (lownoise), "per-pr" = one branch per source PR. Default "single". */
  branchStrategy: z.enum(["single", "per-pr"]).optional().default("single"),
  /** Last known commit where docs were in sync. Blank = assume drift. Updated after docdrift PR merges. */
  lastKnownBaseline: z.string().min(1).optional(),
  devin: z.object({
    apiVersion: z.literal("v1"),
    unlisted: z.boolean().default(true),
    maxAcuLimit: z.number().int().positive().default(2),
    tags: z.array(z.string().min(1)).default(["docdrift"]),
    customInstructions: z.array(z.string().min(1)).optional(),
    customInstructionContent: z.string().optional(),
    /** When trigger is pull_request: "commit-to-branch" = commit to source PR branch (low noise); "separate-pr" = create docdrift/pr-N PR. Default "commit-to-branch". */
    prStrategy: z.enum(["commit-to-branch", "separate-pr"]).optional().default("commit-to-branch"),
  }),
  policy: policySchema,
  docAreas: z.array(docAreaSchema).optional().default([]),
});

export const docDriftConfigSchema = docDriftConfigObjectSchema.refine(
  (v) => {
    if (v.specProviders && v.specProviders.length >= 1) return true;
    if (v.openapi && v.docsite) return true;
    if (v.docAreas.length >= 1) return true;
    if (v.version === 2 && (v.pathMappings?.length ?? 0) >= 1) return true;
    return false;
  },
  { message: "Config must include specProviders, (openapi + docsite), docAreas, or (v2 + pathMappings)" }
);

export type DocDriftConfig = z.infer<typeof docDriftConfigSchema>;
export type DocAreaConfig = z.infer<typeof docAreaSchema>;
export type SpecProviderConfig = z.infer<typeof specProviderConfigSchema>;

/** Normalized config used by the rest of the app (always has openapi, docsite, specProviders, etc.) */
export interface NormalizedDocDriftConfig extends Omit<DocDriftConfig, "openapi" | "docsite" | "specProviders"> {
  /** At least one when derived from openapi or specProviders */
  specProviders: SpecProviderConfig[];
  openapi: { export: string; generated: string; published: string };
  docsite: string[];
  exclude: string[];
  requireHumanReview: string[];
  mode: "strict" | "auto";
  branchPrefix: string;
  branchStrategy: "single" | "per-pr";
  /** Last known commit where docs were in sync. Blank = assume drift. */
  lastKnownBaseline?: string;
}
