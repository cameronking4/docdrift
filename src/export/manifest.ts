/**
 * Deterministic slug generation and manifest read/write for stable filenames across runs.
 */

import fs from "node:fs";
import path from "node:path";

export interface ManifestEntry {
  pageId: string;
  outPath: string;
  title: string;
  slug: string;
}

export interface DocdriftManifest {
  repo: string;
  generatedAt: string;
  sourceCommit?: string;
  pages: Record<string, ManifestEntry>;
}

/** Convert title to kebab-case slug; collapse spaces/hyphens. */
export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "page";
}

/** Short suffix from pageId for collision resolution (first 6 hex chars or similar). */
export function shortId(pageId: string): string {
  if (!pageId || pageId.length < 6) return pageId.slice(0, 6);
  const cleaned = pageId.replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.slice(0, 6).toLowerCase();
}

/** Compute slug for a page; on collision append --${shortId}. */
export function computeSlug(
  title: string,
  pageId: string,
  existingSlugs: Set<string>
): string {
  let slug = titleToSlug(title);
  if (!existingSlugs.has(slug)) {
    return slug;
  }
  const suffix = shortId(pageId);
  const candidate = `${slug}--${suffix}`;
  if (!existingSlugs.has(candidate)) {
    return candidate;
  }
  let i = 0;
  while (existingSlugs.has(`${candidate}-${i}`)) {
    i++;
  }
  return `${candidate}-${i}`;
}

const MANIFEST_FILENAME = ".docdrift-manifest.json";

export function getManifestPath(outDir: string): string {
  return path.join(outDir, MANIFEST_FILENAME);
}

export function loadManifest(outDir: string): DocdriftManifest | null {
  const p = getManifestPath(outDir);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    return raw as DocdriftManifest;
  } catch {
    return null;
  }
}

export function saveManifest(outDir: string, manifest: DocdriftManifest): void {
  fs.mkdirSync(outDir, { recursive: true });
  const p = getManifestPath(outDir);
  fs.writeFileSync(p, JSON.stringify(manifest, null, 2), "utf8");
}

/** Build manifest from wiki structure; prefer existing manifest outPath when pageId exists. */
export function buildManifest(
  repo: string,
  sourceCommit: string | undefined,
  pages: Array<{ id: string; title: string }>,
  existingManifest: DocdriftManifest | null
): DocdriftManifest {
  const existingSlugs = new Set<string>();
  const pagesMap: Record<string, ManifestEntry> = {};

  for (const page of pages) {
    let outPath: string;
    let slug: string;

    const existing = existingManifest?.pages[page.id];
    if (existing) {
      outPath = existing.outPath;
      slug = existing.slug;
    } else {
      slug = computeSlug(page.title, page.id, existingSlugs);
      outPath = `pages/${slug}.mdx`;
    }
    existingSlugs.add(slug);

    pagesMap[page.id] = {
      pageId: page.id,
      outPath,
      title: page.title,
      slug,
    };
  }

  return {
    repo,
    generatedAt: new Date().toISOString(),
    sourceCommit,
    pages: pagesMap,
  };
}
