import { z } from "zod";

const pathRuleSchema = z.object({
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

const docAreaSchema = z.object({
  name: z.string().min(1),
  mode: z.enum(["autogen", "conceptual"]),
  owners: z.object({
    reviewers: z.array(z.string().min(1)).min(1),
  }),
  detect: z
    .object({
      openapi: openApiDetectSchema.optional(),
      paths: z.array(pathRuleSchema).optional(),
    })
    .refine((v) => Boolean(v.openapi) || Boolean(v.paths?.length), {
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

export const docDriftConfigSchema = z
  .object({
    version: z.literal(1),
    /** Simple config: openapi block (API spec = gate for run) */
    openapi: openApiSimpleSchema.optional(),
    /** Simple config: docsite root path(s) */
    docsite: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
    /** Paths we never touch (glob patterns) */
    exclude: z.array(z.string().min(1)).optional().default([]),
    /** Paths that require human review when touched (we create issue post-PR) */
    requireHumanReview: z.array(z.string().min(1)).optional().default([]),
    devin: z.object({
      apiVersion: z.literal("v1"),
      unlisted: z.boolean().default(true),
      maxAcuLimit: z.number().int().positive().default(2),
      tags: z.array(z.string().min(1)).default(["docdrift"]),
      customInstructions: z.array(z.string().min(1)).optional(),
      customInstructionContent: z.string().optional(),
    }),
    policy: policySchema,
    /** Legacy: doc areas (optional when openapi+docsite present) */
    docAreas: z.array(docAreaSchema).optional().default([]),
  })
  .refine(
    (v) => (v.openapi && v.docsite) || v.docAreas.length >= 1,
    { message: "Config must include (openapi + docsite) or docAreas" }
  );

export type DocDriftConfig = z.infer<typeof docDriftConfigSchema>;
export type DocAreaConfig = z.infer<typeof docAreaSchema>;

/** Normalized config used by the rest of the app (always has openapi, docsite, etc.) */
export interface NormalizedDocDriftConfig extends Omit<DocDriftConfig, "openapi" | "docsite"> {
  openapi: { export: string; generated: string; published: string };
  docsite: string[];
  exclude: string[];
  requireHumanReview: string[];
}
