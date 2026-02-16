/**
 * "Coming soon" messages and help text for docsite conversion options
 * that are not yet implemented.
 */

import path from "node:path";

export type DocsiteOption =
  | "docusaurus"
  | "nextjs"
  | "docsify"
  | "vitepress"
  | "mkdocs";

interface ComingSoonInfo {
  docsUrl: string;
  steps: string;
}

export const INFO: Record<DocsiteOption, ComingSoonInfo> = {
  docusaurus: {
    docsUrl: "https://docusaurus.io",
    steps:
      "Copy deepwiki/pages/*.mdx into your docs/ folder and add entries to sidebars.js. Use createDocsPlugin for MDX.",
  },
  nextjs: {
    docsUrl: "https://nextjs.org/docs/app/building-your-application/configuring/mdx",
    steps:
      "Use @next/mdx and configure contentDir to point at deepwiki/. Add dynamic routes for pages.",
  },
  docsify: {
    docsUrl: "https://docsify.js.org",
    steps:
      "Create an index.html in deepwiki/ with window.$docsify loading from pages/. No build step - point a dev server at that directory.",
  },
  vitepress: {
    docsUrl: "https://vitepress.dev",
    steps:
      "Initialize a minimal VitePress project, set srcDir to deepwiki/, configure nav in .vitepress/config.ts, run npm run docs:dev.",
  },
  mkdocs: {
    docsUrl: "https://www.mkdocs.org",
    steps:
      "Point docs_dir in mkdocs.yml at deepwiki/pages/. Add nav structure to mkdocs.yml. Use mkdocs-material for theming. Run mkdocs serve.",
  },
};

export function printComingSoon(option: DocsiteOption, outDir: string): void {
  const { docsUrl, steps } = INFO[option];
  const deepwikiPath = path.join(outDir, "deepwiki");

  console.log("");
  console.log("  Coming soon!");
  console.log("");
  console.log(`  Your exported content is in: ${deepwikiPath}`);
  console.log("");
  console.log("  To use with " + option + ":");
  console.log("    " + steps);
  console.log("");
  console.log("  Documentation: " + docsUrl);
  console.log("");
}
