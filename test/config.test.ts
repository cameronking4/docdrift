import { describe, expect, it } from "vitest";
import { docDriftConfigSchema } from "../src/config/schema";

describe("docDriftConfigSchema", () => {
  it("accepts a valid minimal config", () => {
    const parsed = docDriftConfigSchema.safeParse({
      version: 1,
      devin: {
        apiVersion: "v1",
        unlisted: true,
        maxAcuLimit: 2,
        tags: ["docdrift"]
      },
      policy: {
        prCaps: {
          maxPrsPerDay: 1,
          maxFilesTouched: 12
        },
        confidence: {
          autopatchThreshold: 0.8
        },
        allowlist: ["docs/**", "openapi/**"],
        verification: {
          commands: ["npm run docs:check"]
        }
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
              publishedPath: "docs/reference/openapi.json"
            }
          },
          patch: {
            targets: ["docs/reference/openapi.json"]
          }
        }
      ]
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
        tags: ["docdrift"]
      },
      policy: {
        prCaps: { maxPrsPerDay: 1, maxFilesTouched: 12 },
        confidence: { autopatchThreshold: 0.8 },
        allowlist: ["docs/**"],
        verification: { commands: ["npm run docs:check"] }
      },
      docAreas: [
        {
          name: "broken",
          mode: "conceptual",
          owners: { reviewers: ["team/docs"] },
          detect: {},
          patch: {}
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });
});
