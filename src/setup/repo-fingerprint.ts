import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".docdrift"]);
const DOC_HINTS = ["openapi", "swagger", "docusaurus", "mkdocs", "next", "vitepress"];
const MAX_TREE_DEPTH = 3;

export interface ExportScriptInfo {
  scriptName: string;
  script: string;
  inferredApiDir?: string;
  inferredOutputPath?: string;
}

export interface RepoFingerprint {
  fileTree: Record<string, string[]>;
  rootPackage: { scripts?: Record<string, string>; dependencies?: string[]; workspaces?: string[] };
  workspacePackages: Array<{ path: string; scripts?: Record<string, string> }>;
  foundPaths: {
    openapi: string[];
    swagger: string[];
    docusaurusConfig: string[];
    mkdocs: string[];
    vitepressConfig: string[];
    nextConfig: string[];
    docsDirs: string[];
    /** Parent dir of each docs/ dir (e.g. packages/docs for packages/docs/docs) */
    docsDirParents: string[];
    exportScript?: ExportScriptInfo;
    apiDirs: string[];
  };
}

function walkDir(dir: string, depth: number, tree: Record<string, string[]>): void {
  if (depth > MAX_TREE_DEPTH) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  const relDir = path.relative(process.cwd(), dir) || ".";
  const names: string[] = [];
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".env") continue;
    if (IGNORE_DIRS.has(e.name)) continue;
    names.push(e.isDirectory() ? `${e.name}/` : e.name);
  }
  names.sort();
  tree[relDir] = names;
  for (const e of entries) {
    if (!e.isDirectory() || IGNORE_DIRS.has(e.name)) continue;
    walkDir(path.join(dir, e.name), depth + 1, tree);
  }
}

function findMatchingFiles(cwd: string, test: (relPath: string, name: string) => boolean): string[] {
  const out: string[] = [];
  function walk(dir: string, depth: number): void {
    if (depth > 5) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") && e.name !== ".env") continue;
      if (IGNORE_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name);
      const rel = path.relative(cwd, full);
      if (e.isFile() && test(rel, e.name)) out.push(rel);
      else if (e.isDirectory()) walk(full, depth + 1);
    }
  }
  walk(cwd, 0);
  return out;
}

function findDirsNamed(cwd: string, name: string): string[] {
  const out: string[] = [];
  function scan(dir: string, depth: number): void {
    if (depth > 2) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") || IGNORE_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name);
      const rel = path.relative(cwd, full);
      if (e.isDirectory()) {
        if (e.name === name) out.push(rel);
        scan(full, depth + 1);
      }
    }
  }
  scan(cwd, 0);
  return out;
}

/** Infer API dir and optional output path from a script string (e.g. "tsx apps/api/scripts/export-openapi.ts"). */
export function inferExportFromScript(
  script: string,
  cwd: string
): { outputPath?: string; apiDir?: string } {
  const result: { outputPath?: string; apiDir?: string } = {};
  // Match tsx/node/npx path/to/file.ts or .js
  const fileMatch = script.match(/\b(?:tsx|node|npx)\s+(.+?\.(?:ts|js|mjs|cjs))(?:\s|$)/);
  if (fileMatch) {
    const filePath = fileMatch[1]!.trim().replace(/\\/g, "/");
    const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
    const relPath = path.relative(cwd, absPath).replace(/\\/g, "/");
    const parts = relPath.split("/");
    if (parts.length >= 2 && parts[parts.length - 1]!.toLowerCase().includes("export")) {
      const dir = path.dirname(relPath);
      if (dir.endsWith("/scripts") || dir.endsWith("scripts")) {
        result.apiDir = path.dirname(dir);
      } else {
        result.apiDir = dir;
      }
    } else if (parts.length >= 1) {
      result.apiDir = path.dirname(relPath) || ".";
    }
    if (fs.existsSync(absPath)) {
      try {
        const content = fs.readFileSync(absPath, "utf8");
        const outMatch = content.match(/outputPath\s*[=:]\s*["'`]([^"'`]+)["'`]/);
        if (outMatch) result.outputPath = outMatch[1];
      } catch {
        // ignore
      }
    }
  }
  return result;
}

const EXPORT_SCRIPT_NAMES = [
  "openapi:export",
  "openapi:generate",
  "openapi:build",
  "spec:export",
  "spec:generate",
];
const EXPORT_SCRIPT_PATTERN = /(openapi|swagger|spec).*(export|generate|build)/i;

function findExportScript(scripts: Record<string, string>, cwd: string): ExportScriptInfo | undefined {
  const name =
    Object.keys(scripts).find((k) => EXPORT_SCRIPT_NAMES.includes(k)) ??
    Object.keys(scripts).find((k) => EXPORT_SCRIPT_PATTERN.test(k));
  if (!name) return undefined;
  const script = scripts[name];
  if (!script || typeof script !== "string") return undefined;
  const { outputPath, apiDir } = inferExportFromScript(script, cwd);
  return { scriptName: name, script, inferredApiDir: apiDir, inferredOutputPath: outputPath };
}

function collectApiDirCandidates(
  fileTree: Record<string, string[]>,
  exportScriptApiDir: string | undefined,
  workspacePackages: Array<{ path: string; scripts?: Record<string, string> }>
): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  if (exportScriptApiDir && !seen.has(exportScriptApiDir)) {
    candidates.push(exportScriptApiDir);
    seen.add(exportScriptApiDir);
  }

  const roots = ["packages", "apps", "libs", "services"];
  for (const [relDir, names] of Object.entries(fileTree)) {
    const parts = relDir.split("/").filter(Boolean);
    const top = parts[0];
    if (top && roots.includes(top) && names.some((n) => n === "api/" || n === "server/" || n === "backend/")) {
      for (const name of names) {
        if (name === "api/" || name === "server/" || name === "backend/") {
          const dir = parts.length > 0 ? `${relDir}/${name.replace(/\/$/, "")}` : name.replace(/\/$/, "");
          if (!seen.has(dir)) {
            candidates.push(dir);
            seen.add(dir);
          }
        }
      }
    }
    const lower = relDir.toLowerCase();
    if ((lower.endsWith("/api") || lower.endsWith("/server") || lower.endsWith("/backend")) && !seen.has(relDir)) {
      candidates.push(relDir);
      seen.add(relDir);
    }
  }

  for (const wp of workspacePackages) {
    const pkgPath = wp.path.replace(/\\/g, "/");
    if (pkgPath.toLowerCase().includes("api") && !seen.has(pkgPath)) {
      candidates.push(pkgPath);
      seen.add(pkgPath);
    }
    const treeEntry = fileTree[pkgPath];
    if (treeEntry?.some((n) => n === "routes/" || n === "controllers/" || n === "src/") && !seen.has(pkgPath)) {
      candidates.push(pkgPath);
      seen.add(pkgPath);
    }
  }

  return candidates;
}

export function buildRepoFingerprint(cwd: string = process.cwd()): RepoFingerprint {
  const fileTree: Record<string, string[]> = {};
  walkDir(cwd, 0, fileTree);

  let rootPackage: RepoFingerprint["rootPackage"] = { scripts: {}, dependencies: [], workspaces: [] };
  const pkgPath = path.join(cwd, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      rootPackage.scripts = pkg.scripts || {};
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      rootPackage.dependencies = Object.keys(deps || {}).filter((k) =>
        DOC_HINTS.some((h) => k.toLowerCase().includes(h))
      );
      if (pkg.workspaces) {
        rootPackage.workspaces = Array.isArray(pkg.workspaces) ? pkg.workspaces : [pkg.workspaces];
      }
    } catch {
      // ignore
    }
  }

  const workspacePackages: RepoFingerprint["workspacePackages"] = [];
  if (rootPackage.workspaces?.length) {
    for (const w of rootPackage.workspaces) {
      const base = w.replace("/*", "").replace("*", "");
      const dir = path.join(cwd, base);
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
      const subdirs = base.includes("*") ? fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path.join(dir, e.name)) : [dir];
      for (const sub of subdirs) {
        const pj = path.join(sub, "package.json");
        if (!fs.existsSync(pj)) continue;
        try {
          const pkg = JSON.parse(fs.readFileSync(pj, "utf8"));
          workspacePackages.push({
            path: path.relative(cwd, sub),
            scripts: pkg.scripts || {},
          });
        } catch {
          // ignore
        }
      }
    }
  }

  const openapi = findMatchingFiles(cwd, (rel, name) => {
    if (/^openapi.*\.(json|yaml|yml)$/i.test(name)) return true;
    if (/^(api-spec|spec)\.(json|yaml|yml)$/i.test(name)) return true;
    return false;
  });
  const openapiDirSpecs = findMatchingFiles(cwd, (rel) => {
    const norm = rel.replace(/\\/g, "/");
    return (
      (norm.startsWith("openapi/") && (norm.endsWith("openapi.json") || norm.endsWith("generated.json") || norm.endsWith("published.json"))) ||
      norm === "openapi/openapi.json" ||
      norm === "openapi/generated.json" ||
      norm === "openapi/published.json"
    );
  });
  const allOpenapi = [...openapi];
  for (const p of openapiDirSpecs) {
    if (!allOpenapi.includes(p)) allOpenapi.push(p);
  }

  const swagger = findMatchingFiles(cwd, (_, name) => /^swagger.*\.(json|yaml|yml)$/i.test(name));

  const docusaurusConfig = findMatchingFiles(cwd, (_, name) => name.startsWith("docusaurus.config."));
  const mkdocs = findMatchingFiles(cwd, (_, name) => name === "mkdocs.yml");
  const vitepressConfig = findMatchingFiles(cwd, (_, name) => name.startsWith("vitepress.config."));
  const nextConfig = findMatchingFiles(cwd, (_, name) => name.startsWith("next.config."));

  const docsDirs = findDirsNamed(cwd, "docs");
  const docsDirParents: string[] = [];
  for (const d of docsDirs) {
    const parent = path.dirname(d);
    if (parent && parent !== "." && !docsDirParents.includes(parent)) docsDirParents.push(parent);
  }

  let exportScript: ExportScriptInfo | undefined = findExportScript(rootPackage.scripts || {}, cwd);
  if (!exportScript) {
    for (const wp of workspacePackages) {
      const wpCwd = path.join(cwd, wp.path);
      exportScript = findExportScript(wp.scripts || {}, wpCwd);
      if (exportScript) {
        const apiDir = exportScript.inferredApiDir
          ? path.join(wp.path, exportScript.inferredApiDir).replace(/\\/g, "/")
          : wp.path;
        exportScript = { ...exportScript, inferredApiDir: apiDir };
        break;
      }
    }
  }

  const apiDirs = collectApiDirCandidates(
    fileTree,
    exportScript?.inferredApiDir,
    workspacePackages
  );

  return {
    fileTree,
    rootPackage,
    workspacePackages,
    foundPaths: {
      openapi: allOpenapi,
      swagger,
      docusaurusConfig,
      mkdocs,
      vitepressConfig,
      nextConfig,
      docsDirs,
      docsDirParents,
      exportScript,
      apiDirs,
    },
  };
}

export function fingerprintHash(fingerprint: RepoFingerprint): string {
  const canonical = JSON.stringify(fingerprint, Object.keys(fingerprint).sort());
  return crypto.createHash("sha256").update(canonical).digest("hex");
}
