import { describe, expect, it } from "vitest";
import { decidePolicy } from "../src/policy/engine";
import { emptyState } from "../src/model/state";
import { DocDriftConfig } from "../src/config/schema";

const baseConfig: DocDriftConfig = {
  version: 1,
  devin: {
    apiVersion: "v1",
    unlisted: true,
    maxAcuLimit: 2,
    tags: ["docdrift"],
  },
  policy: {
    prCaps: {
      maxPrsPerDay: 1,
      maxFilesTouched: 12,
    },
    confidence: {
      autopatchThreshold: 0.8,
    },
    allowlist: ["docs/**", "openapi/**"],
    verification: {
      commands: ["npm run docs:check"],
    },
  },
  docAreas: [],
};

describe("decidePolicy", () => {
  it("opens PR for strong autogen signal", () => {
    const decision = decidePolicy({
      item: {
        docArea: "api_reference",
        mode: "autogen",
        signals: [{ kind: "openapi_diff", tier: 1, confidence: 0.95, evidence: [] }],
        impactedDocs: ["docs/reference/openapi.json"],
        recommendedAction: "OPEN_PR",
        summary: "OpenAPI diff",
      },
      docAreaConfig: {
        name: "api_reference",
        mode: "autogen",
        owners: { reviewers: ["team/a"] },
        detect: {
          openapi: {
            exportCmd: "npm run openapi:export",
            generatedPath: "openapi/generated.json",
            publishedPath: "docs/reference/openapi.json",
          },
        },
        patch: {
          targets: ["docs/reference/openapi.json"],
          requireHumanConfirmation: false,
        },
      },
      config: baseConfig,
      state: emptyState(),
      repo: "acme/repo",
      baseSha: "a",
      headSha: "b",
    });

    expect(decision.action).toBe("OPEN_PR");
  });

  it("opens issue for conceptual when human confirmation required", () => {
    const decision = decidePolicy({
      item: {
        docArea: "auth_guide",
        mode: "conceptual",
        signals: [{ kind: "heuristic_path_impact", tier: 2, confidence: 0.7, evidence: [] }],
        impactedDocs: ["docs/guides/auth.md"],
        recommendedAction: "OPEN_ISSUE",
        summary: "auth changes",
      },
      docAreaConfig: {
        name: "auth_guide",
        mode: "conceptual",
        owners: { reviewers: ["team/a"] },
        detect: {
          paths: [
            {
              match: "apps/api/src/auth/**",
              impacts: ["docs/guides/auth.md"],
            },
          ],
        },
        patch: {
          requireHumanConfirmation: true,
        },
      },
      config: baseConfig,
      state: emptyState(),
      repo: "acme/repo",
      baseSha: "a",
      headSha: "b",
    });

    expect(decision.action).toBe("OPEN_ISSUE");
  });
});
