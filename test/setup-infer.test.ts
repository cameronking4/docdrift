import { describe, expect, it } from "vitest";
import type { RepoFingerprint } from "../src/setup/repo-fingerprint";
import { heuristicInference } from "../src/setup/ai-infer";

function makeFingerprint(
  overrides: Partial<RepoFingerprint["foundPaths"]> & Partial<Pick<RepoFingerprint, "rootPackage" | "fileTree" | "workspacePackages">> = {}
): RepoFingerprint {
  const base: RepoFingerprint = {
    fileTree: {},
    rootPackage: { scripts: {}, dependencies: [], workspaces: [] },
    workspacePackages: [],
    foundPaths: {
      openapi: [],
      swagger: [],
      docusaurusConfig: [],
      mkdocs: [],
      vitepressConfig: [],
      nextConfig: [],
      docsDirs: [],
      docsDirParents: [],
      apiDirs: [],
    },
  };
  if (overrides.fileTree) base.fileTree = overrides.fileTree;
  if (overrides.rootPackage) base.rootPackage = overrides.rootPackage;
  if (overrides.workspacePackages) base.workspacePackages = overrides.workspacePackages;
  const fp = overrides as Partial<RepoFingerprint["foundPaths"]>;
  if (fp.openapi?.length) base.foundPaths.openapi = fp.openapi;
  if (fp.swagger?.length) base.foundPaths.swagger = fp.swagger;
  if (fp.docusaurusConfig?.length) base.foundPaths.docusaurusConfig = fp.docusaurusConfig;
  if (fp.mkdocs?.length) base.foundPaths.mkdocs = fp.mkdocs;
  if (fp.vitepressConfig?.length) base.foundPaths.vitepressConfig = fp.vitepressConfig;
  if (fp.nextConfig?.length) base.foundPaths.nextConfig = fp.nextConfig;
  if (fp.docsDirs?.length) base.foundPaths.docsDirs = fp.docsDirs;
  if (fp.docsDirParents?.length) base.foundPaths.docsDirParents = fp.docsDirParents;
  if (fp.exportScript) base.foundPaths.exportScript = fp.exportScript;
  if (fp.apiDirs?.length) base.foundPaths.apiDirs = fp.apiDirs;
  return base;
}

describe("heuristicInference", () => {
  it("uses packages/docs and packages/api when fingerprint has packages layout", () => {
    const fp = makeFingerprint({
      fileTree: { packages: ["api/", "docs/"] },
      docusaurusConfig: ["packages/docs/docusaurus.config.js"],
      openapi: ["openapi/generated.json"],
      apiDirs: ["packages/api"],
      docsDirParents: ["packages/docs"],
      docsDirs: ["packages/docs/docs"],
      rootPackage: {
        scripts: { "openapi:export": "tsx packages/api/scripts/export-openapi.ts", "docs:gen": "npm run --prefix packages/docs docusaurus -- gen-api-docs api", "docs:build": "npm run --prefix packages/docs build" },
        dependencies: [],
        workspaces: ["packages/*"],
      },
    });
    const out = heuristicInference(fp);
    expect(out.suggestedConfig.docsite).toBe("packages/docs");
    expect(out.suggestedConfig.pathMappings).toHaveLength(1);
    expect(out.suggestedConfig.pathMappings![0].match).toBe("packages/api/**");
    expect(out.suggestedConfig.pathMappings![0].impacts).toContain("packages/docs/docs/**");
    expect(out.suggestedConfig.policy?.allowlist).not.toContain("apps/**");
    const allowlistStr = JSON.stringify(out.suggestedConfig.policy?.allowlist ?? []);
    expect(allowlistStr).not.toMatch(/"apps\/\*\*"/);
  });

  it("produces no apps/** for root docs + openapi layout", () => {
    const fp = makeFingerprint({
      fileTree: { ".": ["docs/", "openapi/"] },
      docsDirs: ["docs"],
      docsDirParents: [],
      openapi: ["openapi/openapi.json"],
      apiDirs: [],
      rootPackage: {
        scripts: { "docs:build": "npm run build" },
        dependencies: [],
        workspaces: [],
      },
    });
    const out = heuristicInference(fp);
    expect(out.suggestedConfig.docsite).toBeDefined();
    const allowlistStr = JSON.stringify(out.suggestedConfig.policy?.allowlist ?? []);
    expect(allowlistStr).not.toMatch(/"apps\/\*\*"/);
  });

  it("uses MkDocs docsite when mkdocs.yml is present", () => {
    const fp = makeFingerprint({
      mkdocs: ["docs/mkdocs.yml"],
      docsDirs: ["docs"],
      openapi: ["openapi/spec.json"],
      apiDirs: ["backend"],
      rootPackage: { scripts: {}, dependencies: [], workspaces: [] },
    });
    const out = heuristicInference(fp);
    expect(out.suggestedConfig.docsite).toBe("docs");
    expect(out.suggestedConfig.pathMappings).toHaveLength(1);
    expect(out.suggestedConfig.pathMappings![0].match).toBe("backend/**");
  });

  it("uses exportScript when present for command and apiDir", () => {
    const fp = makeFingerprint({
      docusaurusConfig: ["apps/docs-site/docusaurus.config.js"],
      openapi: ["openapi/generated.json"],
      exportScript: {
        scriptName: "openapi:export",
        script: "tsx apps/api/scripts/export-openapi.ts",
        inferredApiDir: "apps/api",
        inferredOutputPath: "openapi/generated.json",
      },
      apiDirs: ["apps/api"],
      rootPackage: {
        scripts: { "openapi:export": "tsx apps/api/scripts/export-openapi.ts", "docs:gen": "npm run docs:gen", "docs:build": "npm run docs:build" },
        dependencies: [],
        workspaces: [],
      },
    });
    const out = heuristicInference(fp);
    expect(out.suggestedConfig.specProviders?.[0]?.current?.command).toBe("npm run openapi:export");
    expect(out.suggestedConfig.pathMappings?.[0]?.match).toBe("apps/api/**");
  });

  it("adds docsite choice when docsite cannot be inferred", () => {
    const fp = makeFingerprint({
      openapi: ["openapi/spec.json"],
      apiDirs: ["**/api/**"],
      rootPackage: { scripts: {}, dependencies: [], workspaces: [] },
    });
    const out = heuristicInference(fp);
    expect(out.suggestedConfig.docsite).toBeUndefined();
    const docsiteChoice = out.choices.find((c) => c.key === "docsite");
    expect(docsiteChoice).toBeDefined();
    expect(docsiteChoice?.confidence).toBe("low");
  });

  it("uses generic **/api/** when no apiDirs detected", () => {
    const fp = makeFingerprint({
      docusaurusConfig: ["docs/docusaurus.config.js"],
      docsDirs: ["docs/docs"],
      docsDirParents: ["docs"],
      openapi: ["openapi/generated.json"],
      apiDirs: [],
      rootPackage: { scripts: { "openapi:export": "npm run openapi:export" }, dependencies: [], workspaces: [] },
    });
    const out = heuristicInference(fp);
    expect(out.suggestedConfig.pathMappings?.[0]?.match).toBe("**/api/**");
    const matchChoice = out.choices.find((c) => c.key === "pathMappings.0.match");
    expect(matchChoice).toBeDefined();
  });
});
