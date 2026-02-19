import path from "node:path";
import { DocDriftConfig, NormalizedDocDriftConfig, SpecProviderConfig } from "./schema";

/**
 * Produce a normalized config that the rest of the app consumes.
 * Derives specProviders/openapi/docsite from openapi block or docAreas when not using v2 specProviders.
 */
export function normalizeConfig(config: DocDriftConfig): NormalizedDocDriftConfig {
  let specProviders: SpecProviderConfig[];
  let openapi: { export: string; generated: string; published: string };
  let docsite: string[];
  let exclude: string[] = config.exclude ?? [];
  let requireHumanReview: string[] = config.requireHumanReview ?? [];
  let docAreas = config.docAreas ?? [];
  const mode = config.mode ?? "strict";

  if (config.specProviders && config.specProviders.length >= 1) {
    specProviders = config.specProviders;
    const firstOpenApi3 = specProviders.find((p) => p.format === "openapi3");
    if (firstOpenApi3 && firstOpenApi3.current.type === "export") {
      openapi = {
        export: firstOpenApi3.current.command,
        generated: firstOpenApi3.current.outputPath,
        published: firstOpenApi3.published,
      };
    } else {
      openapi = {
        export: "echo",
        generated: "",
        published: specProviders[0].published,
      };
    }
    const allPaths = specProviders.flatMap((p) => [p.published]);
    const roots = new Set<string>();
    for (const p of allPaths) {
      const parts = p.split("/").filter(Boolean);
      if (parts.length >= 2) roots.add(parts[0] + "/" + parts[1]);
      else if (parts.length === 1) roots.add(parts[0]);
    }
    docsite = roots.size > 0 ? [...roots] : config.docsite ? (Array.isArray(config.docsite) ? config.docsite : [config.docsite]) : ["."];
  } else if (config.openapi && config.docsite) {
    specProviders = [
      {
        format: "openapi3",
        current: { type: "export", command: config.openapi.export, outputPath: config.openapi.generated },
        published: config.openapi.published,
        validation: { enabled: true, allowlist: [] },
      },
    ];
    openapi = config.openapi;
    docsite = Array.isArray(config.docsite) ? config.docsite : [config.docsite];
    if (config.pathMappings?.length) {
      const pathImpacts = new Set<string>();
      config.pathMappings.forEach((p) => p.impacts.forEach((i) => pathImpacts.add(i)));
      requireHumanReview = [...new Set([...requireHumanReview, ...pathImpacts])];
      docAreas = [
        ...docAreas,
        {
          name: "pathMappings",
          mode: "conceptual" as const,
          owners: { reviewers: ["docdrift"] },
          detect: { paths: config.pathMappings },
          patch: { requireHumanConfirmation: true },
        },
      ];
    }
  } else if (config.docAreas && config.docAreas.length > 0) {
    const firstOpenApiArea = config.docAreas.find((a) => a.detect.openapi);
    if (!firstOpenApiArea?.detect.openapi) {
      throw new Error("Legacy config requires at least one docArea with detect.openapi");
    }
    const o = firstOpenApiArea.detect.openapi;
    specProviders = [
      {
        format: "openapi3",
        current: { type: "export", command: o.exportCmd, outputPath: o.generatedPath },
        published: o.publishedPath,
        validation: { enabled: true, allowlist: [] },
      },
    ];
    openapi = {
      export: o.exportCmd,
      generated: o.generatedPath,
      published: o.publishedPath,
    };

    const allPaths: string[] = [o.publishedPath];
    for (const area of config.docAreas) {
      area.patch.targets?.forEach((t) => allPaths.push(t));
      area.detect.paths?.forEach((p) => p.impacts.forEach((i) => allPaths.push(i)));
    }
    const roots = new Set<string>();
    for (const p of allPaths) {
      const parts = p.split("/").filter(Boolean);
      if (parts.length >= 2) roots.add(parts[0] + "/" + parts[1]);
      else if (parts.length === 1) roots.add(parts[0]);
    }
    docsite = roots.size > 0 ? [...roots] : [path.dirname(o.publishedPath) || "."];

    const reviewPaths = new Set<string>();
    for (const area of config.docAreas) {
      if (area.patch.requireHumanConfirmation || area.mode === "conceptual") {
        area.patch.targets?.forEach((t) => reviewPaths.add(t));
        area.detect.paths?.forEach((p) => p.impacts.forEach((i) => reviewPaths.add(i)));
      }
    }
    requireHumanReview = [...reviewPaths];
  } else if (config.version === 2 && config.pathMappings?.length) {
    specProviders = [];
    openapi = { export: "echo", generated: "", published: "" };
    const pathImpacts = new Set<string>();
    config.pathMappings.forEach((p) => p.impacts.forEach((i) => pathImpacts.add(i)));
    requireHumanReview = [...new Set([...requireHumanReview, ...pathImpacts])];
    docAreas = [
      {
        name: "pathMappings",
        mode: "conceptual" as const,
        owners: { reviewers: ["docdrift"] },
        detect: { paths: config.pathMappings },
        patch: { requireHumanConfirmation: true },
      },
    ];
    const roots = new Set<string>();
    for (const p of pathImpacts) {
      const parts = p.split("/").filter(Boolean);
      if (parts.length >= 2) roots.add(parts[0] + "/" + parts[1]);
      else if (parts.length === 1) roots.add(parts[0]);
    }
    docsite = roots.size > 0 ? [...roots] : config.docsite ? (Array.isArray(config.docsite) ? config.docsite : [config.docsite]) : ["."];
  } else {
    throw new Error("Config must include specProviders, (openapi + docsite), or docAreas");
  }

  return {
    ...config,
    specProviders,
    openapi,
    docsite,
    exclude,
    requireHumanReview,
    docAreas,
    mode,
    branchPrefix: config.branchPrefix ?? "docdrift",
    branchStrategy: config.branchStrategy ?? "single",
    lastKnownBaseline: config.lastKnownBaseline,
  };
}
