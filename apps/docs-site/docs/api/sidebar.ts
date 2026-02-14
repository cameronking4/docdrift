import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api/datastack-api",
    },
    {
      type: "category",
      label: "Identity & Access",
      items: [
        {
          type: "doc",
          id: "api/get-a-user-by-id",
          label: "Get a user by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/list-users-with-pagination",
          label: "List users with pagination",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Workspaces",
      items: [
        {
          type: "doc",
          id: "api/list-workspaces",
          label: "List workspaces",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-workspace-by-id",
          label: "Get workspace by ID",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Compute / Clusters",
      items: [
        {
          type: "doc",
          id: "api/list-clusters",
          label: "List clusters",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-cluster",
          label: "Create cluster",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-cluster-by-id",
          label: "Get cluster by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/terminate-cluster",
          label: "Terminate cluster",
          className: "api-method delete",
        },
      ],
    },
    {
      type: "category",
      label: "Jobs",
      items: [
        {
          type: "doc",
          id: "api/list-jobs",
          label: "List jobs",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-job-by-id",
          label: "Get job by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/trigger-job-run",
          label: "Trigger job run",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-job-run",
          label: "Get job run",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Notebooks",
      items: [
        {
          type: "doc",
          id: "api/list-notebooks",
          label: "List notebooks",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-or-overwrite-notebook",
          label: "Create or overwrite notebook",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/export-notebook",
          label: "Export notebook",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "SQL Warehouses",
      items: [
        {
          type: "doc",
          id: "api/list-sql-warehouses",
          label: "List SQL warehouses",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-sql-warehouse-by-id",
          label: "Get SQL warehouse by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/start-sql-warehouse",
          label: "Start SQL warehouse",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/stop-sql-warehouse",
          label: "Stop SQL warehouse",
          className: "api-method post",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
