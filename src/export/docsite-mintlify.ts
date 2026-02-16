/**
 * Convert exported DeepWiki content to a Mintlify documentation site.
 * Patches docs.json with hierarchical nav and uses Overview as index.
 */

import fs from "node:fs";
import path from "node:path";
import type { DocdriftManifest } from "./manifest";
import { loadManifest } from "./manifest";

/** Group pages by top-level ID (1, 2, 3...) for Mintlify navigation. */
function buildMintlifyGroups(manifest: DocdriftManifest): Array<{ group: string; pages: string[] }> {
  const entries = Object.values(manifest.pages);

  // Sort by pageId (1, 1.1, 1.2, 2, 2.1, ...)
  entries.sort((a, b) => {
    const partsA = a.pageId.split(".").map(Number);
    const partsB = b.pageId.split(".").map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const vA = partsA[i] ?? 0;
      const vB = partsB[i] ?? 0;
      if (vA !== vB) return vA - vB;
    }
    return 0;
  });

  const groups: Array<{ group: string; pages: string[] }> = [];
  let currentTopId: string | null = null;
  let currentGroup: { group: string; pages: string[] } | null = null;

  for (const e of entries) {
    const topId = e.pageId.split(".")[0] ?? e.pageId;
    const mintlifyPath = e.pageId === "1"
      ? "index"
      : `deepwiki/pages/${e.slug}`;

    if (topId !== currentTopId) {
      currentTopId = topId;
      currentGroup = {
        group: e.title,
        pages: [],
      };
      groups.push(currentGroup);
    }

    if (e.pageId === "1") {
      // Overview is index, put it first in its group
      currentGroup!.pages.unshift(mintlifyPath);
    } else {
      currentGroup!.pages.push(mintlifyPath);
    }
  }

  return groups;
}

/** Find orphan .mdx files in deepwiki/pages not in manifest. */
function findOrphanPages(deepwikiPagesDir: string, manifest: DocdriftManifest): string[] {
  const manifestSlugs = new Set(Object.values(manifest.pages).map((p) => p.slug));
  const orphans: string[] = [];

  if (!fs.existsSync(deepwikiPagesDir)) return orphans;

  for (const name of fs.readdirSync(deepwikiPagesDir)) {
    if (!name.endsWith(".mdx")) continue;
    const slug = name.replace(/\.mdx$/, "");
    if (!manifestSlugs.has(slug)) {
      orphans.push(`deepwiki/pages/${slug}`);
    }
  }

  return orphans.sort();
}

/** Apply Mintlify conversion: update docs.json, copy overview to index. */
export function runMintlifyConversion(outDir: string): void {
  const resolvedOut = path.resolve(outDir);
  const deepwikiDir = path.join(resolvedOut, "deepwiki");
  const manifestPath = path.join(deepwikiDir, ".docdrift-manifest.json");

  const manifest = loadManifest(deepwikiDir);
  if (!manifest) {
    throw new Error(
      `No manifest found at ${manifestPath}. Run 'docdrift export' first to export DeepWiki content.`
    );
  }

  const groups = buildMintlifyGroups(manifest);
  const orphanPaths = findOrphanPages(path.join(deepwikiDir, "pages"), manifest);
  if (orphanPaths.length > 0) {
    groups.push({ group: "Additional", pages: orphanPaths });
  }

  const docsJsonPath = path.join(resolvedOut, "docs.json");

  const docsJson: Record<string, unknown> = fs.existsSync(docsJsonPath)
    ? (JSON.parse(fs.readFileSync(docsJsonPath, "utf8")) as Record<string, unknown>)
    : {};

  // Merge/replace navigation
  const existingNav = (docsJson.navigation as Record<string, unknown>) ?? {};
  docsJson.$schema = "https://mintlify.com/docs.json";
  docsJson.theme = docsJson.theme ?? "mint";
  docsJson.name = docsJson.name ?? "DocDrift";
  docsJson.description =
    docsJson.description ?? "Documentation drift detection and remediation with Devin";
  docsJson.colors =
    (docsJson.colors as Record<string, string>) ?? {
      primary: "#16A34A",
      light: "#07C983",
      dark: "#15803D",
    };
  docsJson.navigation = {
    ...existingNav,
    tabs: [
      {
        tab: "Documentation",
        groups,
      },
    ],
    global: (existingNav as Record<string, unknown>).global ?? {
      anchors: [
        { anchor: "GitHub", href: "https://github.com/cameronking4/docdrift", icon: "github" },
        { anchor: "npm", href: "https://www.npmjs.com/package/@devinnn/docdrift", icon: "box" },
      ],
    },
  };

  fs.mkdirSync(resolvedOut, { recursive: true });
  fs.writeFileSync(docsJsonPath, JSON.stringify(docsJson, null, 2), "utf8");

  // Copy overview to index.mdx
  const overviewPath = path.join(deepwikiDir, "pages", "overview.mdx");
  const indexPath = path.join(resolvedOut, "index.mdx");
  if (fs.existsSync(overviewPath)) {
    let content = fs.readFileSync(overviewPath, "utf8");
    // Fix internal links from # anchors to /deepwiki/pages/ paths for nav pages
    content = content.replace(
      /\]\(#(\d+(?:\.\d+)*)\)/g,
      (_, id) => {
        const entry = manifest.pages[id];
        if (entry && entry.pageId !== "1") {
          return `](/deepwiki/pages/${entry.slug})`;
        }
        return `](#${id})`;
      }
    );
    fs.writeFileSync(indexPath, content, "utf8");
  }

  console.log(`[docdrift] Mintlify conversion complete. Run 'mint dev' in ${resolvedOut} to preview.`);
}
