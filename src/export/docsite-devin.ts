/**
 * Hand off docsite creation to Devin for frameworks not yet implemented locally.
 * Devin runs docdrift export, creates the docsite end-to-end, opens a PR, and we return the PR link.
 */

import path from "node:path";
import { devinCreateSession, pollUntilTerminal } from "../devin/v1";
import type { DevinSession } from "../devin/v1";
import type { DocsiteOption } from "./docsite-coming-soon";
import { INFO } from "./docsite-coming-soon";

export interface DocsiteDevinResult {
  sessionUrl: string;
  prUrl?: string;
}

function inferPrUrl(session: DevinSession): string | undefined {
  if (typeof session.pull_request_url === "string" && session.pull_request_url) {
    return session.pull_request_url;
  }
  if (typeof session.pr_url === "string" && session.pr_url) {
    return session.pr_url;
  }
  const s = session as Record<string, unknown>;
  const pr = s.pull_request as { url?: string } | undefined;
  if (pr?.url) return pr.url;
  const structured = (session.structured_output ?? (s.data as Record<string, unknown>)?.structured_output) as
    | { pr?: { url?: string } }
    | undefined;
  if (structured?.pr?.url && typeof structured.pr.url === "string") {
    return structured.pr.url;
  }
  return undefined;
}

function buildDocsitePrompt(
  repo: string,
  outDir: string,
  docsiteType: DocsiteOption
): string {
  const deepwikiPath = path.join(outDir, "deepwiki");
  const { docsUrl, steps } = INFO[docsiteType];

  const frameworkInstructions: Record<DocsiteOption, string> = {
    docusaurus: [
      "Create or update a Docusaurus docsite. Copy docs/deepwiki/pages/*.mdx into your docs/ folder.",
      "Add entries to sidebars.js or sidebars.ts. Use createDocsPlugin for MDX support.",
      "Use nav.json (in docs/deepwiki/) for the sidebar structure. Build and verify with npm run build.",
    ].join(" "),
    nextjs: [
      "Create a Next.js docsite with @next/mdx. Configure contentDir to point at docs/deepwiki/.",
      "Add dynamic routes for the MDX pages. Use nav.json for navigation structure.",
      "Build and verify with npm run build.",
    ].join(" "),
    docsify: [
      "Create a Docsify site: index.html in the docs root with window.$docsify loading from deepwiki/pages/.",
      "No build step — Docsify loads Markdown at runtime. Configure nav from deepwiki/nav.json.",
      "Use a simple dev server (e.g. npx docsify serve) to verify.",
    ].join(" "),
    vitepress: [
      "Initialize a VitePress project. Set srcDir to docs/ and point content at deepwiki/pages/.",
      "Configure nav in .vitepress/config.ts using deepwiki/nav.json structure.",
      "Add npm scripts: docs:dev, docs:build. Run npm run docs:build to verify.",
    ].join(" "),
    mkdocs: [
      "Create mkdocs.yml. Set docs_dir to docs/deepwiki/pages/ (or symlink).",
      "Add nav structure to mkdocs.yml using deepwiki/nav.json.",
      "Use mkdocs-material for theming. Add requirements.txt. Run mkdocs build to verify.",
    ].join(" "),
  };

  return [
    "You are Devin. Task: create a complete documentation site for this repository and open a PR.",
    "",
    "REPOSITORY: " + repo,
    "",
    "STEP 1 — Export DeepWiki (REQUIRED FIRST):",
    "Run this command to export the DeepWiki documentation:",
    "  npx @devinnn/docdrift export --repo " + repo,
    "",
    "This creates docs/deepwiki/ with:",
    "  - pages/*.mdx (MDX content)",
    "  - nav.json (hierarchy for sidebar/nav)",
    "  - .docdrift-manifest.json (pageId -> path mapping)",
    "",
    "STEP 2 — Create the " + docsiteType + " docsite:",
    frameworkInstructions[docsiteType],
    "",
    "Reference: " + docsUrl,
    "",
    "STEP 2a — Review and Organize Pages:",
    "- Before organizing the navigation, browse all pages in docs/deepwiki/pages/ to understand each article's topic and content.",
    "- Take note of recurring themes, guides, references, tutorials, and any special pages (e.g., contributing, architecture, API, troubleshooting).",
    "- Group related pages together to create an effective, intuitive navigation structure. Avoid excessive nesting—make it easy to discover all major topics.",
    "- Ensure every single page appears somewhere in the navigation (nav.json, sidebar, or equivalent). Do not leave any pages orphaned or hard to find.",
    "- Use clear and concise group labels (e.g., Overview, Guides, API Reference, Advanced Topics, Troubleshooting).",
    "- List all articles visibly and make sure the navigation reflects the content's organization logically.",
    "- Preview the docsite to verify all articles are discoverable and the groups make sense to a new user.",
    "",
    "STEP 3 — Open a pull request:",
    "- Create a branch: docdrift/docsite-" + docsiteType,
    "- Commit all new/updated docsite files",
    "- Push and open a PR to main",
    "- PR title: [docdrift] Add " + docsiteType + " documentation site",
    "- In the PR description, summarize what was created (framework, structure, how to run)",
    "",
    "CRITICAL — Return the PR URL:",
    "In your final message, clearly include the PR URL (e.g. https://github.com/owner/repo/pull/123) so the user can open it.",
  ].join("\n");
}

/**
 * Hand off to Devin: run export, create docsite, open PR. Returns session URL and PR URL.
 */
export async function runDocsiteDevin(options: {
  repo: string;
  outDir: string;
  docsiteType: DocsiteOption;
  apiKey: string;
}): Promise<DocsiteDevinResult> {
  const { repo, outDir, docsiteType, apiKey } = options;

  const prompt = buildDocsitePrompt(repo, outDir, docsiteType);

  process.stdout.write("Creating Devin session for " + docsiteType + " docsite…\n");
  const session = await devinCreateSession(apiKey, {
    prompt,
    unlisted: true,
    max_acu_limit: 3,
    tags: ["docdrift", "export", "docsite", docsiteType],
    metadata: {
      purpose: "docdrift-docsite",
      repository: repo,
      docsiteType,
    },
  });

  console.log("Devin is running docdrift export, creating the docsite, and opening a PR…");
  console.log("Session: " + session.url);

  const finalSession = await pollUntilTerminal(apiKey, session.session_id, 20 * 60_000);
  const prUrl = inferPrUrl(finalSession);

  return {
    sessionUrl: session.url,
    prUrl,
  };
}
