import path from "node:path";
import { DocDriftConfig, NormalizedDocDriftConfig } from "./schema";

/**
 * Produce a normalized config that the rest of the app consumes.
 * Derives openapi/docsite/exclude/requireHumanReview from docAreas when using legacy config.
 */
export function normalizeConfig(config: DocDriftConfig): NormalizedDocDriftConfig {
  let openapi: { export: string; generated: string; published: string };
  let docsite: string[];
  let exclude: string[] = config.exclude ?? [];
  let requireHumanReview: string[] = config.requireHumanReview ?? [];

  if (config.openapi && config.docsite) {
    // Simple config
    openapi = config.openapi;
    docsite = Array.isArray(config.docsite) ? config.docsite : [config.docsite];
  } else if (config.docAreas && config.docAreas.length > 0) {
    // Legacy: derive from docAreas
    const firstOpenApiArea = config.docAreas.find((a) => a.detect.openapi);
    if (!firstOpenApiArea?.detect.openapi) {
      throw new Error("Legacy config requires at least one docArea with detect.openapi");
    }
    const o = firstOpenApiArea.detect.openapi;
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

    // Derive requireHumanReview from areas with requireHumanConfirmation or conceptual mode
    const reviewPaths = new Set<string>();
    for (const area of config.docAreas) {
      if (area.patch.requireHumanConfirmation || area.mode === "conceptual") {
        area.patch.targets?.forEach((t) => reviewPaths.add(t));
        area.detect.paths?.forEach((p) => p.impacts.forEach((i) => reviewPaths.add(i)));
      }
    }
    requireHumanReview = [...reviewPaths];
  } else {
    throw new Error("Config must include (openapi + docsite) or docAreas");
  }

  return {
    ...config,
    openapi,
    docsite,
    exclude,
    requireHumanReview,
  };
}
