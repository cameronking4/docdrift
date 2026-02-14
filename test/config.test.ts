import { describe, expect, it } from "vitest";
import { normalizeConfig } from "../src/config/normalize";
import { docDriftConfigSchema } from "../src/config/schema";

describe("docDriftConfigSchema", () => {
  it("accepts a valid minimal config", () => {
    const parsed = docDriftConfigSchema.safeParse({
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
      docAreas: [
        {
          name: "api_reference",
          mode: "autogen",
          owners: { reviewers: ["team/api"] },
          detect: {
            openapi: {
              exportCmd: "npm run openapi:export",
              generatedPath: "openapi/generated.json",
              publishedPath: "docs/reference/openapi.json",
            },
          },
          patch: {
            targets: ["docs/reference/openapi.json"],
          },
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects config without detectors", () => {
    const parsed = docDriftConfigSchema.safeParse({
      version: 1,
      devin: {
        apiVersion: "v1",
        unlisted: true,
        maxAcuLimit: 2,
        tags: ["docdrift"],
      },
      policy: {
        prCaps: { maxPrsPerDay: 1, maxFilesTouched: 12 },
        confidence: { autopatchThreshold: 0.8 },
        allowlist: ["docs/**"],
        verification: { commands: ["npm run docs:check"] },
      },
      docAreas: [
        {
          name: "broken",
          mode: "conceptual",
          owners: { reviewers: ["team/docs"] },
          detect: {},
          patch: {},
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts simple config (openapi + docsite)", () => {
    const parsed = docDriftConfigSchema.safeParse({
      version: 1,
      openapi: {
        export: "npm run openapi:export",
        generated: "openapi/generated.json",
        published: "apps/docs-site/openapi/openapi.json",
      },
      docsite: "apps/docs-site",
      exclude: ["apps/docs-site/blog/**"],
      requireHumanReview: ["apps/docs-site/docs/guides/**"],
      devin: { apiVersion: "v1" },
      policy: {
        prCaps: { maxPrsPerDay: 1, maxFilesTouched: 12 },
        confidence: { autopatchThreshold: 0.8 },
        allowlist: ["apps/docs-site/**", "openapi/**"],
        verification: { commands: ["npm run docs:build"] },
        slaDays: 7,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("normalize derives openapi/docsite from docAreas", () => {
    const config = {
      version: 1,
      devin: { apiVersion: "v1" },
      policy: {
        allowlist: ["docs/**"],
        verification: { commands: ["npm run docs:check"] },
      },
      docAreas: [
        {
          name: "api_ref",
          mode: "autogen" as const,
          owners: { reviewers: ["a"] },
          detect: {
            openapi: {
              exportCmd: "npm run openapi:export",
              generatedPath: "openapi/generated.json",
              publishedPath: "docs/reference/openapi.json",
            },
          },
          patch: { targets: ["docs/reference/openapi.json"] },
        },
      ],
    };
    const normalized = normalizeConfig(config as any);
    expect(normalized.openapi.export).toBe("npm run openapi:export");
    expect(normalized.openapi.generated).toBe("openapi/generated.json");
    expect(normalized.openapi.published).toBe("docs/reference/openapi.json");
    expect(normalized.docsite.length).toBeGreaterThan(0);
  });
});
