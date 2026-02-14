import type { Signal } from "../model/types";

export type SpecSource =
  | { type: "url"; url: string }
  | { type: "local"; path: string }
  | { type: "export"; command: string; outputPath: string };

export type SpecFormat = "openapi3" | "swagger2" | "graphql" | "fern" | "postman";

export interface SpecProviderConfig {
  format: SpecFormat;
  /** Source of "current" spec (generated/truth). URL fetched at runtime; local read from disk. */
  current: SpecSource;
  /** Where published spec lives (in docsite). Local path only. */
  published: string;
}

export interface SpecProviderResult {
  hasDrift: boolean;
  summary: string;
  evidenceFiles: string[];
  impactedDocs: string[];
  signal?: Signal;
}

export type SpecProviderDetector = (
  config: SpecProviderConfig,
  evidenceDir: string
) => Promise<SpecProviderResult>;
