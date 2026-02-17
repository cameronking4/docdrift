export interface ValidationIssue {
  code: string;
  severity: "error" | "warn";
  path: string;
  message: string;
}

export interface ValidateExportCompletenessOptions {
  /** Path patterns to skip validation (e.g. /health, /ready) */
  allowlist?: string[];
}

function pathMatchesAllowlist(openApiPath: string, allowlist: string[]): boolean {
  const normalized = openApiPath.replace(/\{[^}]+\}/g, "*");
  return allowlist.some((a) => normalized.includes(a) || a.includes(normalized));
}

export function validateExportCompleteness(
  spec: unknown,
  options: ValidateExportCompletenessOptions = {}
): { pass: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const allowlist = options.allowlist ?? [];
  const paths = (spec as any)?.paths ?? {};

  for (const [pathName, methods] of Object.entries(paths)) {
    const methodDefs = methods as Record<string, any>;
    for (const method of ["post", "put", "patch"]) {
      const op = methodDefs[method];
      if (!op) continue;

      const operationPath = `${String(method).toUpperCase()} ${pathName}`;
      if (pathMatchesAllowlist(pathName, allowlist)) continue;

      // Rule: POST/PUT/PATCH should have requestBody
      const hasRequestBody = Boolean(op.requestBody);
      if (!hasRequestBody) {
        issues.push({
          code: "MISSING_REQUEST_BODY",
          severity: "error",
          path: operationPath,
          message: `${operationPath} has no requestBody schema. Add requestBody to the spec source so the export accurately reflects the implementation.`,
        });
      } else {
        // Rule: requestBody should have properties when present
        const schema =
          op.requestBody?.content?.["application/json"]?.schema ??
          op.requestBody?.content?.["application/octet-stream"]?.schema;
        const properties = schema?.properties;
        if (schema && typeof properties === "object" && Object.keys(properties ?? {}).length === 0) {
          issues.push({
            code: "EMPTY_REQUEST_BODY_SCHEMA",
            severity: "warn",
            path: operationPath,
            message: `${operationPath} has requestBody but schema has no properties.`,
          });
        }
      }
    }
  }

  return {
    pass: issues.length === 0,
    issues,
  };
}
