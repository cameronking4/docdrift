import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".docdrift"]);
const DOC_HINTS = ["openapi", "swagger", "docusaurus", "mkdocs", "next", "vitepress"];
const MAX_TREE_DEPTH = 3;

export interface RepoFingerprint {
  fileTree: Record<string, string[]>;
  rootPackage: { scripts?: Record<string, string>; dependencies?: string[]; workspaces?: string[] };
  workspacePackages: Array<{ path: string; scripts?: Record<string, string> }>;
  foundPaths: {
    openapi: string[];
    swagger: string[];
    docusaurusConfig: string[];
    mkdocs: string[];
    docsDirs: string[];
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

  const openapi = findMatchingFiles(cwd, (_, name) => /^openapi.*\.json$/i.test(name));
  const swagger = findMatchingFiles(cwd, (_, name) => /^swagger.*\.json$/i.test(name));
  const docusaurusConfig = findMatchingFiles(cwd, (_, name) => name.startsWith("docusaurus.config."));
  const mkdocs = findMatchingFiles(cwd, (_, name) => name === "mkdocs.yml");
  const docsDirs = findDirsNamed(cwd, "docs");

  return {
    fileTree,
    rootPackage,
    workspacePackages,
    foundPaths: { openapi, swagger, docusaurusConfig, mkdocs, docsDirs },
  };
}

export function fingerprintHash(fingerprint: RepoFingerprint): string {
  const canonical = JSON.stringify(fingerprint, Object.keys(fingerprint).sort());
  return crypto.createHash("sha256").update(canonical).digest("hex");
}
