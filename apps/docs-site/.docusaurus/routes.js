import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/docs',
    component: ComponentCreator('/docs', '274'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'dc6'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '5ae'),
            routes: [
              {
                path: '/docs/api/create-cluster',
                component: ComponentCreator('/docs/api/create-cluster', '95a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/create-or-overwrite-notebook',
                component: ComponentCreator('/docs/api/create-or-overwrite-notebook', '37b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/datastack-api',
                component: ComponentCreator('/docs/api/datastack-api', '54e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/export-notebook',
                component: ComponentCreator('/docs/api/export-notebook', '5f5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/get-a-user',
                component: ComponentCreator('/docs/api/get-a-user', 'e9e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/get-a-user-by-id',
                component: ComponentCreator('/docs/api/get-a-user-by-id', '123'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/get-cluster-by-id',
                component: ComponentCreator('/docs/api/get-cluster-by-id', '55b'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/get-job-by-id',
                component: ComponentCreator('/docs/api/get-job-by-id', '0cf'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/get-job-run',
                component: ComponentCreator('/docs/api/get-job-run', '697'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/get-sql-warehouse-by-id',
                component: ComponentCreator('/docs/api/get-sql-warehouse-by-id', '9b6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/get-workspace-by-id',
                component: ComponentCreator('/docs/api/get-workspace-by-id', '127'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/list-clusters',
                component: ComponentCreator('/docs/api/list-clusters', 'c3c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/list-jobs',
                component: ComponentCreator('/docs/api/list-jobs', 'bc7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/list-notebooks',
                component: ComponentCreator('/docs/api/list-notebooks', '233'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/list-sql-warehouses',
                component: ComponentCreator('/docs/api/list-sql-warehouses', 'dce'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/list-users-with-pagination',
                component: ComponentCreator('/docs/api/list-users-with-pagination', 'a6f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/list-workspaces',
                component: ComponentCreator('/docs/api/list-workspaces', '6e6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/start-sql-warehouse',
                component: ComponentCreator('/docs/api/start-sql-warehouse', 'e7f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/stop-sql-warehouse',
                component: ComponentCreator('/docs/api/stop-sql-warehouse', '9b6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/terminate-cluster',
                component: ComponentCreator('/docs/api/terminate-cluster', 'd1a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/api/trigger-job-run',
                component: ComponentCreator('/docs/api/trigger-job-run', 'f58'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/guides/authentication',
                component: ComponentCreator('/docs/guides/authentication', '838'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/guides/billing-and-usage',
                component: ComponentCreator('/docs/guides/billing-and-usage', 'b82'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/guides/getting-started',
                component: ComponentCreator('/docs/guides/getting-started', '988'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/guides/migration-from-legacy',
                component: ComponentCreator('/docs/guides/migration-from-legacy', '18d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/guides/rate-limits-and-quotas',
                component: ComponentCreator('/docs/guides/rate-limits-and-quotas', '97c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/guides/sdks-and-cli',
                component: ComponentCreator('/docs/guides/sdks-and-cli', '8ee'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/guides/security-best-practices',
                component: ComponentCreator('/docs/guides/security-best-practices', 'b92'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/guides/support-and-sla',
                component: ComponentCreator('/docs/guides/support-and-sla', '49f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/intro',
                component: ComponentCreator('/docs/intro', '13e'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', '2e1'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
