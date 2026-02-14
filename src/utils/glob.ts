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
