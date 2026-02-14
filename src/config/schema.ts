import { z } from "zod";

const pathRuleSchema = z.object({
  match: z.string().min(1),
  impacts: z.array(z.string().min(1)).min(1)
});

const openApiDetectSchema = z.object({
  exportCmd: z.string().min(1),
  generatedPath: z.string().min(1),
  publishedPath: z.string().min(1)
});

const docAreaSchema = z.object({
  name: z.string().min(1),
  mode: z.enum(["autogen", "conceptual"]),
  owners: z.object({
    reviewers: z.array(z.string().min(1)).min(1)
  }),
  detect: z
    .object({
      openapi: openApiDetectSchema.optional(),
      paths: z.array(pathRuleSchema).optional()
    })
    .refine((v) => Boolean(v.openapi) || Boolean(v.paths?.length), {
      message: "docArea.detect must include openapi or paths"
    }),
  patch: z.object({
    targets: z.array(z.string().min(1)).optional(),
    requireHumanConfirmation: z.boolean().optional().default(false)
  })
});

export const docDriftConfigSchema = z.object({
  version: z.literal(1),
  devin: z.object({
    apiVersion: z.literal("v1"),
    unlisted: z.boolean().default(true),
    maxAcuLimit: z.number().int().positive().default(2),
    tags: z.array(z.string().min(1)).default(["docdrift"])
  }),
  policy: z.object({
    prCaps: z.object({
      maxPrsPerDay: z.number().int().positive().default(1),
      maxFilesTouched: z.number().int().positive().default(12)
    }),
    confidence: z.object({
      autopatchThreshold: z.number().min(0).max(1).default(0.8)
    }),
    allowlist: z.array(z.string().min(1)).min(1),
    verification: z.object({
      commands: z.array(z.string().min(1)).min(1)
    })
  }),
  docAreas: z.array(docAreaSchema).min(1)
});

export type DocDriftConfig = z.infer<typeof docDriftConfigSchema>;
export type DocAreaConfig = z.infer<typeof docAreaSchema>;
