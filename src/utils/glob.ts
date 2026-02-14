function escapeRegex(input: string): string {
  return input.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

export function globToRegExp(glob: string): RegExp {
  const escaped = escapeRegex(glob)
    .replace(/\*\*/g, "::DOUBLE_STAR::")
    .replace(/\*/g, "[^/]*")
    .replace(/::DOUBLE_STAR::/g, ".*");
  return new RegExp(`^${escaped}$`);
}

export function matchesGlob(glob: string, value: string): boolean {
  return globToRegExp(glob).test(value);
}

export function isPathAllowed(path: string, allowlist: string[]): boolean {
  return allowlist.some((glob) => matchesGlob(glob, path));
}

export function isPathExcluded(path: string, exclude: string[]): boolean {
  if (!exclude?.length) return false;
  return exclude.some((glob) => matchesGlob(glob, path));
}

/** Path is allowed by allowlist AND not excluded */
export function isPathAllowedAndNotExcluded(
  path: string,
  allowlist: string[],
  exclude: string[] = []
): boolean {
  if (isPathExcluded(path, exclude)) return false;
  return isPathAllowed(path, allowlist);
}
