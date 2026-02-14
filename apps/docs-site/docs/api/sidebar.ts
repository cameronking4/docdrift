import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api/datastack-api",
    },
    {
      type: "category",
      label: "Authentication",
      items: [
        {
          type: "doc",
          id: "api/exchange-credentials-for-access-token",
          label: "Exchange credentials for access token",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/revoke-a-token",
          label: "Revoke a token",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/list-api-keys",
          label: "List API keys",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-api-key",
          label: "Create API key",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/revoke-api-key",
          label: "Revoke API key",
          className: "api-method delete",
        },
      ],
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
          id: "api/update-user",
          label: "Update user",
          className: "api-method patch",
        },
        {
          type: "doc",
          id: "api/delete-user",
          label: "Delete user",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/list-users",
          label: "List users",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-user",
          label: "Create user",
          className: "api-method post",
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
        {
          type: "doc",
          id: "api/resize-cluster",
          label: "Resize cluster",
          className: "api-method post",
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
      label: "Pipelines",
      items: [
        {
          type: "doc",
          id: "api/list-pipelines",
          label: "List pipelines",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-pipeline",
          label: "Create pipeline",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-pipeline-by-id",
          label: "Get pipeline by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/delete-pipeline",
          label: "Delete pipeline",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/start-pipeline",
          label: "Start pipeline",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/stop-pipeline",
          label: "Stop pipeline",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/list-pipeline-events",
          label: "List pipeline events",
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
    {
      type: "category",
      label: "Webhooks",
      items: [
        {
          type: "doc",
          id: "api/list-webhooks",
          label: "List webhooks",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-webhook",
          label: "Create webhook",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-webhook-by-id",
          label: "Get webhook by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/update-webhook",
          label: "Update webhook",
          className: "api-method patch",
        },
        {
          type: "doc",
          id: "api/delete-webhook",
          label: "Delete webhook",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/test-webhook",
          label: "Test webhook",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/list-webhook-deliveries",
          label: "List webhook deliveries",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
