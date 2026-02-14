// @ts-check
/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "DataStack Docs",
  tagline: "API and platform documentation",
  favicon: "img/favicon.ico",
  url: "https://docs.example.com",
  baseUrl: "/",
  organizationName: "datastack",
  projectName: "docdrift-docs",
  onBrokenLinks: "throw",
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: "./sidebars.js",
          docItemComponent: "@theme/ApiItem",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
        blog: false,
      }),
    ],
  ],
  plugins: [
    [
      "docusaurus-plugin-openapi-docs",
      {
        id: "api",
        docsPluginId: "classic",
        config: {
          api: {
            specPath: "openapi/openapi.json",
            outputDir: "docs/api",
            sidebarOptions: {
              groupPathsBy: "tag",
            },
            markdownGenerators: {
              createInfoPageMD: (pageData) => {
                const desc =
                  pageData?.info?.description ||
                  "REST API for DataStack: workspaces, compute clusters, jobs, notebooks, and SQL warehouses.";
                return `${desc}\n\nBrowse endpoints by category in the sidebar: **Authentication**, **Identity & Access**, **Workspaces**, **Compute / Clusters**, **Jobs**, **Notebooks**, **Pipelines**, **SQL Warehouses**, and **Webhooks**.`;
              },
            },
          },
        },
      },
    ],
  ],
  themes: ["docusaurus-theme-openapi-docs"],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "DataStack Docs",
        items: [
          {
            type: "docSidebar",
            sidebarId: "tutorialSidebar",
            position: "left",
            label: "Docs",
          },
          {
            href: "https://github.com",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        copyright: `Copyright © ${new Date().getFullYear()} DataStack. Built with Docusaurus.`,
      },
    }),
};

export default config;
