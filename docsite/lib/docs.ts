import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DEEPWIKI_DIR = path.join(process.cwd(), "..", "docs", "deepwiki");
const PAGES_DIR = path.join(DEEPWIKI_DIR, "pages");

export interface NavItem {
  id: string;
  title: string;
  path: string;
  slug: string;
}

export interface DocPage {
  slug: string;
  title: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

export function getNavItems(): NavItem[] {
  const navPath = path.join(DEEPWIKI_DIR, "nav.json");
  const raw = fs.readFileSync(navPath, "utf8");
  return JSON.parse(raw) as NavItem[];
}

export function getAllSlugs(): string[] {
  const nav = getNavItems();
  return nav.map((item) => item.slug);
}

export function getDocBySlug(slug: string): DocPage | null {
  const filePath = path.join(PAGES_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  return {
    slug,
    title: (data.title as string) || slug,
    content,
    frontmatter: data,
  };
}

export function getAllDocs(): DocPage[] {
  const nav = getNavItems();
  const docs: DocPage[] = [];
  for (const item of nav) {
    const doc = getDocBySlug(item.slug);
    if (doc) docs.push(doc);
  }
  return docs;
}
