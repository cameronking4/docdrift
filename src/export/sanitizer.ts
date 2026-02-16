/**
 * Redaction and fail-on-secrets: scan content for banned patterns.
 * On match when failOnSecrets: process.exit(1) with offending file + line.
 */

export interface SanitizeResult {
  passed: boolean;
  violations: Array<{ file: string; line: number; pattern: string; preview: string }>;
}

/** Banned patterns for public-safe scope. */
const BANNED_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "AWS_ACCESS_KEY", regex: /AKIA[A-Z0-9]{16}/ },
  { name: "PRIVATE_KEY", regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE KEY-----/ },
  { name: "SLACK_TOKEN", regex: /xox[baprs]-[a-zA-Z0-9-]+/ },
  { name: "GITHUB_TOKEN", regex: /ghp_[a-zA-Z0-9]{36}/ },
  { name: "GITLAB_TOKEN", regex: /glpat-[a-zA-Z0-9_-]{20,}/ },
  { name: "CORP_DOMAIN", regex: /[a-zA-Z0-9.-]+\.corp\b/ },
  { name: "INTERNAL_DOMAIN", regex: /[a-zA-Z0-9.-]+\.internal\b/ },
  { name: "K8S_SERVICE", regex: /[a-zA-Z0-9.-]+\.svc\.cluster\.local/ },
];

/** High-risk phrases: assignment of secrets (password=, secret:, api_key:, etc.) — exclude type annotations like token: string */
const RISKY_PHRASES = [
  /\bpassword\s*[:=]\s*["'][^"']+["']/i,
  /\bsecret\s*[:=]\s*["'][^"']+["']/i,
  /\b(?:api[_-]?key|credential)\s*[:=]\s*["']?[^\s"']+/i,
  /\btoken\s*=\s*["'][^"']+["']/i,
];

export function sanitizeContent(content: string, filePath: string): SanitizeResult {
  const violations: SanitizeResult["violations"] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNum = i + 1;

    for (const { name, regex } of BANNED_PATTERNS) {
      if (regex.test(line)) {
        violations.push({
          file: filePath,
          line: lineNum,
          pattern: name,
          preview: line.trim().slice(0, 80) + (line.length > 80 ? "..." : ""),
        });
      }
    }

    for (const regex of RISKY_PHRASES) {
      if (regex.test(line)) {
        violations.push({
          file: filePath,
          line: lineNum,
          pattern: "RISKY_PHRASE",
          preview: line.trim().slice(0, 80) + (line.length > 80 ? "..." : ""),
        });
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

export function failOnViolations(result: SanitizeResult): void {
  if (!result.passed) {
    console.error("[docdrift] SECRETS DETECTED — aborting. Remove before publishing.");
    for (const v of result.violations) {
      console.error(`  ${v.file}:${v.line} [${v.pattern}] ${v.preview}`);
    }
    process.exit(1);
  }
}
