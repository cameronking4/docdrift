import type { SpecFormat, SpecProviderDetector } from "./types";
import { detectOpenApiSpecDrift } from "./openapi";
import { detectSwagger2SpecDrift } from "./swagger2";
import { detectGraphQLSpecDrift } from "./graphql";
import { detectFernSpecDrift } from "./fern";
import { detectPostmanSpecDrift } from "./postman";

const registry: Record<SpecFormat, SpecProviderDetector> = {
  openapi3: detectOpenApiSpecDrift,
  swagger2: detectSwagger2SpecDrift,
  graphql: detectGraphQLSpecDrift,
  fern: detectFernSpecDrift,
  postman: detectPostmanSpecDrift,
};

export function getSpecDetector(format: SpecFormat): SpecProviderDetector {
  const detector = registry[format];
  if (!detector) {
    throw new Error(`Unknown spec format: ${format}`);
  }
  return detector;
}

export function getSupportedFormats(): SpecFormat[] {
  return Object.keys(registry) as SpecFormat[];
}
