import fs from "node:fs";
import path from "node:path";
import {
  buildUserSchema,
  buildUserListSchema,
  buildWorkspaceSchema,
  buildWorkspaceListSchema,
  buildClusterSchema,
  buildClusterListSchema,
  buildJobSchema,
  buildJobRunSchema,
  buildJobListSchema,
  buildNotebookSchema,
  buildNotebookListSchema,
  buildSqlWarehouseSchema,
  buildSqlWarehouseListSchema,
  buildPipelineSchema,
  buildPipelineListSchema,
  buildPipelineEventListSchema,
  buildWebhookSchema,
  buildWebhookListSchema,
  buildWebhookDeliveryListSchema,
  buildWebhookTestResultSchema,
  buildApiKeySchema,
  buildApiKeyListSchema,
  buildAuthTokenSchema,
  buildTokenRevokeSchema,
} from "../src/model";

function pathResp(schema: object) {
  return {
    "200": { description: "OK", content: { "application/json": { schema } } },
  };
}

function pathResp201(schema: object) {
  return {
    "201": { description: "Created", content: { "application/json": { schema } } },
  };
}

const paths: Record<string, object> = {
  "/v1/users":{
    get: {
      summary: "List users with pagination",
      tags: ["Identity & Access"],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
      ],
      responses: pathResp(buildUserListSchema()),
    },
  },
  "/v1/workspaces": {
    get: {
      summary: "List workspaces",
      tags: ["Workspaces"],
      parameters: [
        { name: "pageSize", in: "query", schema: { type: "integer", default: 25 } },
        { name: "pageToken", in: "query", schema: { type: "string" } },
      ],
      responses: pathResp(buildWorkspaceListSchema()),
    },
  },
  "/v1/workspaces/{workspaceId}": {
    get: {
      summary: "Get workspace by ID",
      tags: ["Workspaces"],
      parameters: [{ name: "workspaceId", in: "path", required: true, schema: { type: "string" } }],
      responses: pathResp(buildWorkspaceSchema()),
    },
  },
  "/v1/clusters": {
    get: {
      summary: "List clusters",
      tags: ["Compute / Clusters"],
      parameters: [
        { name: "workspaceId", in: "query", schema: { type: "string" } },
        { name: "state", in: "query", schema: { type: "string", enum: ["PENDING", "RUNNING", "TERMINATING", "TERMINATED", "ERROR"] } },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "pageSize", in: "query", schema: { type: "integer", default: 25 } },
      ],
      responses: pathResp(buildClusterListSchema()),
    },
    post: {
      summary: "Create cluster",
      tags: ["Compute / Clusters"],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { name: { type: "string" }, sparkVersion: { type: "string" }, nodeType: { type: "string" }, numWorkers: { type: "integer" }, autoTerminationMinutes: { type: "integer" } },
              required: ["name", "sparkVersion", "nodeType"],
            },
          },
        },
      },
      responses: pathResp201(buildClusterSchema()),
    },
  },
  "/v1/clusters/{clusterId}": {
    get: {
      summary: "Get cluster by ID",
      tags: ["Compute / Clusters"],
      parameters: [{ name: "clusterId", in: "path", required: true, schema: { type: "string" } }],
      responses: pathResp(buildClusterSchema()),
    },
    delete: {
      summary: "Terminate cluster",
      tags: ["Compute / Clusters"],
      parameters: [{ name: "clusterId", in: "path", required: true, schema: { type: "string" } }],
      responses: pathResp({ type: "object", properties: { message: { type: "string" } } }),
    },
  },
  "/v1/jobs": {
    get: {
      summary: "List jobs",
      tags: ["Jobs"],
      parameters: [
        { name: "workspaceId", in: "query", schema: { type: "string" } },
        { name: "limit", in: "query", schema: { type: "integer", default: 25 } },
        { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
      ],
      responses: pathResp(buildJobListSchema()),
    },
  },
  "/v1/jobs/{jobId}": {
    get: {
      summary: "Get job by ID",
      tags: ["Jobs"],
      parameters: [{ name: "jobId", in: "path", required: true, schema: { type: "integer" } }],
      responses: pathResp(buildJobSchema()),
    },
  },
  "/v1/jobs/{jobId}/runs": {
    post: {
      summary: "Trigger job run",
      tags: ["Jobs"],
      parameters: [{ name: "jobId", in: "path", required: true, schema: { type: "integer" } }],
      requestBody: { content: { "application/json": { schema: { type: "object", properties: { pythonParams: { type: "array", items: { type: "string" } }, idempotencyKey: { type: "string" } } } } } },
      responses: pathResp(buildJobRunSchema()),
    },
  },
  "/v1/jobs/{jobId}/runs/{runId}": {
    get: {
      summary: "Get job run",
      tags: ["Jobs"],
      parameters: [
        { name: "jobId", in: "path", required: true, schema: { type: "integer" } },
        { name: "runId", in: "path", required: true, schema: { type: "integer" } },
      ],
      responses: pathResp(buildJobRunSchema()),
    },
  },
  "/v1/notebooks": {
    get: {
      summary: "List notebooks",
      tags: ["Notebooks"],
      parameters: [
        { name: "pathPrefix", in: "query", schema: { type: "string" } },
        { name: "limit", in: "query", schema: { type: "integer", default: 25 } },
        { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
      ],
      responses: pathResp(buildNotebookListSchema()),
    },
    put: {
      summary: "Create or overwrite notebook",
      tags: ["Notebooks"],
      requestBody: {
        content: {
          "application/json": {
            schema: { type: "object", properties: { path: { type: "string" }, language: { type: "string", enum: ["PYTHON", "SQL", "SCALA", "R"] }, content: { type: "string" } }, required: ["path", "language"] },
          },
        },
      },
      responses: pathResp(buildNotebookSchema()),
    },
  },
  "/v1/notebooks/export": {
    get: {
      summary: "Export notebook",
      tags: ["Notebooks"],
      parameters: [
        { name: "path", in: "query", required: true, schema: { type: "string" } },
        { name: "format", in: "query", required: true, schema: { type: "string", enum: ["SOURCE", "HTML", "JUPYTER"] } },
      ],
      responses: pathResp(buildNotebookSchema()),
    },
  },
  "/v1/sql/warehouses": {
    get: {
      summary: "List SQL warehouses",
      tags: ["SQL Warehouses"],
      parameters: [
        { name: "workspaceId", in: "query", schema: { type: "string" } },
        { name: "state", in: "query", schema: { type: "string", enum: ["STARTING", "RUNNING", "STOPPING", "STOPPED", "DELETED"] } },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "pageSize", in: "query", schema: { type: "integer", default: 25 } },
      ],
      responses: pathResp(buildSqlWarehouseListSchema()),
    },
  },
  "/v1/sql/warehouses/{warehouseId}": {
    get: {
      summary: "Get SQL warehouse by ID",
      tags: ["SQL Warehouses"],
      parameters: [{ name: "warehouseId", in: "path", required: true, schema: { type: "string" } }],
      responses: pathResp(buildSqlWarehouseSchema()),
    },
  },
  "/v1/sql/warehouses/{warehouseId}/start": {
    post: {
      summary: "Start SQL warehouse",
      tags: ["SQL Warehouses"],
      parameters: [{ name: "warehouseId", in: "path", required: true, schema: { type: "string" } }],
      responses: pathResp(buildSqlWarehouseSchema()),
    },
  },
  "/v1/sql/warehouses/{warehouseId}/stop": {
    post: {
      summary: "Stop SQL warehouse",
      tags: ["SQL Warehouses"],
      parameters: [{ name: "warehouseId", in: "path", required: true, schema: { type: "string" } }],
      responses: pathResp(buildSqlWarehouseSchema()),
    },
  },
  "/v1/clusters/{clusterId}/resize": {
    post: {
      summary: "Resize cluster",
      tags: ["Compute / Clusters"],
      parameters: [{ name: "clusterId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { workerCount: { type: "integer" }, enableAutoscaling: { type: "boolean" }, minWorkers: { type: "integer" }, maxWorkers: { type: "integer" } },
            },
          },
        },
      },
      responses: pathResp(buildClusterSchema()),
    },
  },
  "/v1/users/{id}": {
    get: {
      summary: "Get a user by ID",
      tags: ["Identity & Access"],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: pathResp(buildUserSchema()),
    },
    patch: {
      summary: "Update user",
      tags: ["Identity & Access"],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { displayName: { type: "string" }, email: { type: "string" }, role: { type: "string" } },
            },
          },
        },
      },
      responses: pathResp(buildUserSchema()),
    },
  },
  "/v1/pipelines": {
    get: {
      summary: "List pipelines",
      tags: ["Pipelines"],
      parameters: [
        { name: "pageSize", in: "query", schema: { type: "integer", default: 25 } },
        { name: "pageToken", in: "query", schema: { type: "string" } },
      ],
      responses: pathResp(buildPipelineListSchema()),
    },
  },
  "/v1/pipelines/{pipelineId}": {
    get: {
      summary: "Get pipeline by ID",
      tags: ["Pipelines"],
      parameters: [{ name: "pipelineId", in: "path", required: true, schema: { type: "string" } }],
      responses: pathResp(buildPipelineSchema()),
    },
    delete: {
      summary: "Delete pipeline",
      tags: ["Pipelines"],
      parameters: [{ name: "pipelineId", in: "path", required: true, schema: { type: "string" } }],
      responses: pathResp({ type: "object", properties: { message: { type: "string" } } }),
    },
  },
  "/v1/pipelines/{pipelineId}/events": {
    get: {
      summary: "List pipeline events",
      tags: ["Pipelines"],
      parameters: [
        { name: "pipelineId", in: "path", required: true, schema: { type: "string" } },
        { name: "limit", in: "query", schema: { type: "integer", default: 25 } },
      ],
      responses: pathResp(buildPipelineEventListSchema()),
    },
  },
  "/v1/pipelines/{pipelineId}/start": {
    post: {
      summary: "Start pipeline",
      tags: ["Pipelines"],
      parameters: [{ name: "pipelineId", in: "path", required: true, schema: { type: "string" } }],
      responses: pathResp(buildPipelineSchema()),
    },
  },
  "/v1/pipelines/{pipelineId}/stop": {
    post: {
      summary: "Stop pipeline",
      tags: ["Pipelines"],
      parameters: [{ name: "pipelineId", in: "path", required: true, schema: { type: "string" } }],
      responses: pathResp(buildPipelineSchema()),
    },
  },
  "/v1/webhooks": {
    get: {
      summary: "List webhooks",
      tags: ["Webhooks"],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "pageSize", in: "query", schema: { type: "integer", default: 25 } },
      ],
      responses: pathResp(buildWebhookListSchema()),
    },
  },
  "/v1/webhooks/{webhookId}": {
    get: {
      summary: "Get webhook by ID",
      tags: ["Webhooks"],
      parameters: [{ name: "webhookId", in: "path", required: true, schema: { type: "string" } }],
      responses: pathResp(buildWebhookSchema()),
    },
    patch: {
      summary: "Update webhook",
      tags: ["Webhooks"],
      parameters: [{ name: "webhookId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { url: { type: "string" }, events: { type: "array", items: { type: "string" } }, active: { type: "boolean" } },
            },
          },
        },
      },
      responses: pathResp(buildWebhookSchema()),
    },
  },
  "/v1/webhooks/{webhookId}/deliveries": {
    get: {
      summary: "List webhook deliveries",
      tags: ["Webhooks"],
      parameters: [
        { name: "webhookId", in: "path", required: true, schema: { type: "string" } },
        { name: "limit", in: "query", schema: { type: "integer", default: 25 } },
      ],
      responses: pathResp(buildWebhookDeliveryListSchema()),
    },
  },
  "/v1/webhooks/{webhookId}/test": {
    post: {
      summary: "Test webhook",
      tags: ["Webhooks"],
      parameters: [{ name: "webhookId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { event: { type: "string" } },
              required: ["event"],
            },
          },
        },
      },
      responses: pathResp(buildWebhookTestResultSchema()),
    },
  },
  "/v1/auth/api-keys": {
    get: {
      summary: "List API keys",
      tags: ["Authentication"],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
      ],
      responses: pathResp(buildApiKeyListSchema()),
    },
  },
  "/v1/auth/api-keys/{keyId}": {
    delete: {
      summary: "Revoke API key",
      tags: ["Authentication"],
      parameters: [{ name: "keyId", in: "path", required: true, schema: { type: "string" } }],
      responses: pathResp(buildApiKeySchema()),
    },
  },
  "/v1/auth/token": {
    post: {
      summary: "Generate access token",
      tags: ["Authentication"],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { grantType: { type: "string" }, refreshToken: { type: "string" }, scopes: { type: "array", items: { type: "string" } } },
              required: ["grantType"],
            },
          },
        },
      },
      responses: pathResp(buildAuthTokenSchema()),
    },
  },
  "/v1/auth/token/revoke": {
    post: {
      summary: "Revoke access token",
      tags: ["Authentication"],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { token: { type: "string" } },
              required: ["token"],
            },
          },
        },
      },
      responses: pathResp(buildTokenRevokeSchema()),
    },
  },
};

const spec = {
  openapi: "3.1.0",
  info: {
    title: "DataStack API",
    version: "1.0.0",
    description: "REST API for DataStack: workspaces, compute clusters, jobs, notebooks, and SQL warehouses.",
  },
  tags: [
    { name: "Identity & Access", description: "Users and permissions" },
    { name: "Authentication", description: "API keys and tokens" },
    { name: "Workspaces", description: "Workspace management" },
    { name: "Compute / Clusters", description: "Spark compute clusters" },
    { name: "Jobs", description: "Scheduled and triggered jobs" },
    { name: "Notebooks", description: "Notebook CRUD and export" },
    { name: "SQL Warehouses", description: "SQL warehouse lifecycle" },
    { name: "Pipelines", description: "Delta Live Tables pipelines" },
    { name: "Webhooks", description: "Webhook management and delivery" },
  ],
  paths,
};

const outputPath = path.resolve(process.cwd(), "openapi/generated.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
