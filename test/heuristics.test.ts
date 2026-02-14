import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, expect, it } from "vitest";
import { detectHeuristicImpacts } from "../src/detect/heuristics";
import type { DocAreaConfig } from "../src/config/schema";

describe("detectHeuristicImpacts", () => {
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), "docdrift-heuristics-"));
  const docArea: DocAreaConfig = {
    name: "paths",
    mode: "conceptual",
    owners: { reviewers: ["docdrift"] },
    detect: {
      paths: [
        { match: "definition/**", impacts: ["pages/guides/**"] },
        { match: "packages/api/src/**", impacts: ["pages/api.mdx", "pages/guides/auth.mdx"] },
      ],
    },
    patch: { requireHumanConfirmation: true },
  };

  it("returns no signal when no changed paths match", () => {
    const result = detectHeuristicImpacts(
      docArea,
      ["src/utils/logger.ts", "README.md"],
      evidenceDir
    );
    expect(result.signal).toBeUndefined();
    expect(result.impactedDocs).toHaveLength(0);
    expect(result.summary).toBe("No heuristic conceptual impacts");
  });

  it("returns signal and impactedDocs when changed paths match", () => {
    const result = detectHeuristicImpacts(
      docArea,
      ["definition/users.yml", "packages/api/src/auth/login.ts"],
      evidenceDir
    );
    expect(result.signal).toBeDefined();
    expect(result.signal!.kind).toBe("heuristic_path_impact");
    expect(result.signal!.tier).toBe(2);
    expect(result.impactedDocs).toContain("pages/guides/**");
    expect(result.impactedDocs).toContain("pages/api.mdx");
    expect(result.impactedDocs).toContain("pages/guides/auth.mdx");
    expect(result.summary).toContain("Heuristic impacts detected");
  });
});
