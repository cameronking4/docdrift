/**
 * Fetch wiki structure + contents from DeepWiki MCP and write MDX + nav + manifest.
 */

import fs from "node:fs";
import path from "node:path";
import type { McpClient } from "./mcp-client";
import {
  loadManifest,
  saveManifest,
  buildManifest,
  type ManifestEntry,
  type DocdriftManifest,
} from "./manifest";
import { sanitizeContent, failOnViolations, type SanitizeResult } from "./sanitizer";

export interface WikiNode {
  id: string;
  title: string;
  children?: WikiNode[];
}

export interface ExportOptions {
  repo: string;
  outDir: string;
  sourceCommit?: string;
  failOnSecrets: boolean;
}

/** Parse read_wiki_structure response. DeepWiki returns markdown TOC or JSON. */
function parseStructure(text: string): Array<{ id: string; title: string }> {
  const trimmed = text.trim();

  // Try JSON first (some MCP implementations may return JSON)
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return flattenNodes(parsed as WikiNode[]);
    }
    if (parsed && typeof parsed === "object" && "topics" in parsed) {
      const topics = (parsed as { topics?: WikiNode[] }).topics;
      return flattenNodes(Array.isArray(topics) ? topics : []);
    }
    if (parsed && typeof parsed === "object" && "structure" in parsed) {
      const structure = (parsed as { structure?: WikiNode[] }).structure;
      return flattenNodes(Array.isArray(structure) ? structure : []);
    }
  } catch {
    // Fall through to markdown parse
  }

  // DeepWiki returns markdown TOC: "1 Overview", "1.1 Installation", "2 Architecture", etc.
  return parseMarkdownToc(trimmed);
}

function flattenNodes(nodes: WikiNode[]): Array<{ id: string; title: string }> {
  const out: Array<{ id: string; title: string }> = [];
  for (const n of nodes) {
    if (n.id && n.title) {
      out.push({ id: n.id, title: n.title });
    }
    if (n.children?.length) {
      out.push(...flattenNodes(n.children));
    }
  }
  return out;
}

/** Split full read_wiki_contents response by "# Page: <title>" headers. */
function splitByPageHeader(full: string): Array<{ title: string; content: string }> {
  const blocks: Array<{ title: string; content: string }> = [];
  const re = /# Page:\s*(.+?)(?=\n|$)/gi;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(full)) !== null) {
    if (blocks.length > 0) {
      blocks[blocks.length - 1]!.content = full.slice(lastEnd, m.index).trim();
    }
    blocks.push({ title: m[1]!.trim(), content: "" });
    lastEnd = m.index + m[0].length;
  }
  if (blocks.length > 0) {
    blocks[blocks.length - 1]!.content = full.slice(lastEnd).trim();
  }
  return blocks;
}

function normalizeTitleForMatch(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Parse DeepWiki markdown TOC: "- 1 Overview", "- 1.1 Installation and Setup", etc. */
function parseMarkdownToc(text: string): Array<{ id: string; title: string }> {
  const pages: Array<{ id: string; title: string }> = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const m = line.match(/^[\s\-]*(\d+(?:\.\d+)*)\s+(.+)$/);
    if (m) {
      const id = m[1]!;
      const title = m[2]!.trim();
      pages.push({ id, title });
    }
  }
  return pages;
}

/** Build nav.json hierarchy for Docusaurus/Next.js adapters. */
function buildNav(manifest: DocdriftManifest): unknown[] {
  const entries = Object.values(manifest.pages);
  return entries.map((e) => ({
    id: e.pageId,
    title: e.title,
    path: e.outPath.replace(/\.mdx?$/, ""),
    slug: e.slug,
  }));
}

function buildMeta(repo: string, sourceCommit?: string): Record<string, string> {
  return {
    generatedAt: new Date().toISOString(),
    repo,
    ...(sourceCommit && { sourceCommit }),
  };
}

/** Format MDX frontmatter. */
function formatFrontmatter(entry: ManifestEntry, repo: string): string {
  return [
    "---",
    `title: "${entry.title.replace(/"/g, '\\"')}"`,
    "source: deepwiki",
    `repo: ${repo}`,
    `topic_id: "${entry.pageId}"`,
    "generated: true",
    `last_synced: "${new Date().toISOString().slice(0, 10)}"`,
    "---",
    "",
  ].join("\n");
}

export async function exportWiki(client: McpClient, options: ExportOptions): Promise<void> {
  const { repo, outDir, sourceCommit, failOnSecrets } = options;
  const baseDir = path.resolve(outDir, "deepwiki");
  const pagesDir = path.join(baseDir, "pages");

  const existingManifest = loadManifest(baseDir);

  // 1. read_wiki_structure (DeepWiki uses repoName, not repo)
  const structResult = await client.callTool("read_wiki_structure", { repoName: repo });
  const structText = structResult.content.map((c) => c.text).join("\n");
  if (structResult.isError || !structText) {
    throw new Error(`read_wiki_structure failed: ${structText || "empty response"}`);
  }

  const pages = parseStructure(structText);
  if (pages.length === 0) {
    throw new Error("No wiki pages found. Repo may not be indexed on DeepWiki. Add it at https://deepwiki.com");
  }

  const manifest = buildManifest(repo, sourceCommit, pages, existingManifest);
  fs.mkdirSync(pagesDir, { recursive: true });

  let sanitizeResult: SanitizeResult = { passed: true, violations: [] };

  // 2. read_wiki_contents - DeepWiki returns all pages in one response when only repoName is passed
  const contentResult = await client.callTool("read_wiki_contents", { repoName: repo });
  const fullContent = contentResult.content.map((c) => c.text).join("\n");
  if (contentResult.isError) {
    throw new Error(`read_wiki_contents failed: ${fullContent}`);
  }

  // Split by "# Page: " - DeepWiki concatenates pages with this header
  const pageBlocks = splitByPageHeader(fullContent);
  const contentByTitle = new Map<string, string>();
  for (const { title, content } of pageBlocks) {
    contentByTitle.set(normalizeTitleForMatch(title), content);
  }

  for (const page of pages) {
    const entry = manifest.pages[page.id];
    if (!entry) continue;

    const rawContent =
      contentByTitle.get(normalizeTitleForMatch(page.title)) ??
      contentByTitle.get(page.id) ??
      "";
    const mdx = formatFrontmatter(entry, repo) + (rawContent || `# ${page.title}\n\nNo content.`);
    const outPath = path.join(baseDir, entry.outPath);

    const sr = sanitizeContent(mdx, outPath);
    if (!sr.passed) {
      sanitizeResult = sr;
      if (failOnSecrets) {
        failOnViolations(sr);
      }
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, mdx, "utf8");
  }

  saveManifest(baseDir, manifest);

  fs.writeFileSync(
    path.join(baseDir, "_meta.json"),
    JSON.stringify(buildMeta(repo, sourceCommit), null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(baseDir, "nav.json"),
    JSON.stringify(buildNav(manifest), null, 2),
    "utf8"
  );

  if (failOnSecrets && !sanitizeResult.passed) {
    failOnViolations(sanitizeResult);
  }

  console.log(`[docdrift] Exported ${pages.length} pages to ${baseDir}`);
}
