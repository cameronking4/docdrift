export const PatchPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "docArea",
    "mode",
    "confidence",
    "summary",
    "evidence",
    "filesToEdit",
    "verification",
    "nextAction",
  ],
  properties: {
    status: { enum: ["PLANNING", "EDITING", "VERIFYING", "OPENED_PR", "BLOCKED", "DONE"] },
    docArea: { type: "string" },
    mode: { enum: ["autogen", "conceptual"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    summary: { type: "string" },
    evidence: {
      type: "object",
      additionalProperties: false,
      required: ["attachments", "diffSummary"],
      properties: {
        attachments: { type: "array", items: { type: "string" } },
        diffSummary: { type: "string" },
      },
    },
    filesToEdit: { type: "array", items: { type: "string" } },
    verification: {
      type: "object",
      additionalProperties: false,
      required: ["commands"],
      properties: {
        commands: { type: "array", items: { type: "string" } },
        results: { type: "array", items: { type: "string" } },
      },
    },
    nextAction: { enum: ["OPEN_PR", "OPEN_ISSUE", "NOOP"] },
    pr: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        url: { type: "string" },
      },
    },
    blocked: {
      type: "object",
      additionalProperties: false,
      properties: {
        reason: { type: "string" },
        questions: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;

/** Structured output for docdrift setup (Devin generates config files) */
export const SetupOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["docdriftYaml", "summary"],
  properties: {
    docdriftYaml: { type: "string", description: "Full docdrift.yaml content, valid per schema" },
    docDriftMd: {
      type: "string",
      description:
        "Content for .docdrift/DocDrift.md custom instructions (project-specific guidance for Devin)",
    },
    workflowYml: {
      type: "string",
      description:
        "Content for .github/workflows/docdrift.yml — must use npx @devinnn/docdrift for validate and run",
    },
    summary: {
      type: "string",
      description: "Brief summary of what you inferred (openapi paths, docsite, verification commands)",
    },
  },
} as const;

export const PatchResultSchema = {
  type: "object",
  additionalProperties: false,
  required: ["outcome", "confidence", "summary", "validation", "links"],
  properties: {
    outcome: { enum: ["PR_OPENED", "ISSUE_OPENED", "NO_CHANGE", "BLOCKED"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    summary: { type: "string" },
    changes: { type: "array", items: { type: "string" } },
    validation: {
      type: "object",
      additionalProperties: false,
      required: ["commands", "results"],
      properties: {
        commands: { type: "array", items: { type: "string" } },
        results: { type: "array", items: { type: "string" } },
      },
    },
    links: {
      type: "object",
      additionalProperties: false,
      required: ["sessionUrl"],
      properties: {
        sessionUrl: { type: "string" },
        prUrl: { type: "string" },
        issueUrl: { type: "string" },
      },
    },
    blocked: {
      type: "object",
      additionalProperties: false,
      properties: {
        reason: { type: "string" },
        questions: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;
