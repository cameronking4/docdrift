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
  buildPipelineSchema,
  buildPipelineListSchema,
  buildPipelineEventSchema,
  buildWebhookSchema,
  buildWebhookListSchema,
  buildWebhookDeliverySchema,
  buildSqlWarehouseSchema,
  buildSqlWarehouseListSchema,
} from "../src/model";
import {
  buildTokenResponseSchema,
  buildApiKeySchema,
  buildApiKeyListSchema,
  buildApiKeyCreatedSchema,
} from "../src/auth/policy";

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

function errResp(code: string, desc: string) {
  return {
    [code]: {
      description: desc,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: { type: "object" },
            },
            required: ["code", "message"],
          },
        },
      },
    },
  };
}

const paths: Record<string, object> = {
  "/v1/auth/token": {
    post: {
      summary: "Exchange credentials for access token",
      tags: ["Authentication"],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                grantType: { type: "string", enum: ["client_credentials", "refresh_token"] },
                clientId: { type: "string" },
                clientSecret: { type: "string" },
                refreshToken: { type: "string" },
                scopes: { type: "array", items: { type: "string" } },
              },
              required: ["grantType"],
            },
          },
        },
      },
      responses: { ...pathResp(buildTokenResponseSchema()), ...errResp("401", "Unauthorized") },
    },
  },
  "/v1/auth/token/revoke": {
    post: {
      summary: "Revoke a token",
      tags: ["Authentication"],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                token: { type: "string" },
                tokenTypeHint: { type: "string", enum: ["access_token", "refresh_token"] },
              },
              required: ["token"],
            },
          },
        },
      },
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { revoked: { type: "boolean" } },
                required: ["revoked"],
              },
            },
          },
        },
        ...errResp("401", "Unauthorized"),
      },
    },
  },
  "/v1/auth/api-keys": {
    get: {
      summary: "List API keys",
      tags: ["Authentication"],
      parameters: [
        { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "REVOKED", "EXPIRED"] } },
      ],
      responses: { ...pathResp(buildApiKeyListSchema()), ...errResp("403", "Forbidden") },
    },
    post: {
      summary: "Create API key",
      tags: ["Authentication"],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                scopes: { type: "array", items: { type: "string" } },
                expiresInDays: { type: "integer" },
              },
              required: ["name", "scopes"],
            },
          },
        },
      },
      responses: { ...pathResp201(buildApiKeyCreatedSchema()), ...errResp("400", "Bad Request") },
    },
  },
  "/v1/auth/api-keys/{keyId}": {
    delete: {
      summary: "Revoke API key",
      tags: ["Authentication"],
      parameters: [{ name: "keyId", in: "path", required: true, schema: { type: "string" } }],
      responses: { ...pathResp(buildApiKeySchema()), ...errResp("404", "Not Found") },
    },
  },
  "/v1/users/{id}": {
    get: {
      summary: "Get a user by ID",
      tags: ["Identity & Access"],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { ...pathResp(buildUserSchema()), ...errResp("404", "Not Found") },
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
              properties: {
                fullName: { type: "string" },
                role: { type: "string", enum: ["admin", "editor", "viewer"] },
                status: { type: "string", enum: ["active", "suspended"] },
              },
            },
          },
        },
      },
      responses: { ...pathResp(buildUserSchema()), ...errResp("404", "Not Found") },
    },
    delete: {
      summary: "Delete user",
      tags: ["Identity & Access"],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "204": { description: "No Content" },
        ...errResp("404", "Not Found"),
      },
    },
  },
  "/v1/users": {
    get: {
      summary: "List users",
      tags: ["Identity & Access"],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "perPage", in: "query", schema: { type: "integer", default: 20 } },
        { name: "role", in: "query", schema: { type: "string", enum: ["admin", "editor", "viewer"] } },
        { name: "status", in: "query", schema: { type: "string", enum: ["active", "suspended", "pending_verification"] } },
        { name: "search", in: "query", schema: { type: "string" } },
      ],
      responses: pathResp(buildUserListSchema()),
    },
    post: {
      summary: "Create user",
      tags: ["Identity & Access"],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                fullName: { type: "string" },
                email: { type: "string", format: "email" },
                role: { type: "string", enum: ["admin", "editor", "viewer"] },
              },
              required: ["fullName", "email", "role"],
            },
          },
        },
      },
      responses: { ...pathResp201(buildUserSchema()), ...errResp("400", "Bad Request") },
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
        { name: "state", in: "query", schema: { type: "string", enum: ["PENDING", "RUNNING", "RESIZING", "TERMINATING", "TERMINATED", "ERROR"] } },
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
              properties: {
                name: { type: "string" },
                workspaceId: { type: "string" },
                sparkVersion: { type: "string" },
                nodeType: { type: "string" },
                workerCount: { type: "integer" },
                enableAutoscaling: { type: "boolean" },
                minWorkers: { type: "integer" },
                maxWorkers: { type: "integer" },
                autoTerminationMinutes: { type: "integer" },
                tags: { type: "object", additionalProperties: { type: "string" } },
              },
              required: ["name", "workspaceId", "sparkVersion", "nodeType"],
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
              properties: {
                workerCount: { type: "integer" },
                minWorkers: { type: "integer" },
                maxWorkers: { type: "integer" },
              },
              required: ["workerCount"],
            },
          },
        },
      },
      responses: { ...pathResp(buildClusterSchema()), ...errResp("404", "Not Found") },
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
        { name: "expand", in: "query", schema: { type: "string" }, description: "Comma-separated: runs, tasks" },
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
      requestBody: { content: { "application/json": { schema: { type: "object", properties: { pythonParams: { type: "array", items: { type: "string" } }, sparkSubmitParams: { type: "array", items: { type: "string" } }, idempotencyKey: { type: "string" } } } } } },
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
        { name: "state", in: "query", schema: { type: "string", enum: ["STARTING", "RUNNING", "STOPPING", "STOPPED", "DELETED", "DEGRADED"] } },
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
  "/v1/pipelines": {
    get: {
      summary: "List pipelines",
      tags: ["Pipelines"],
      parameters: [
        { name: "workspaceId", in: "query", schema: { type: "string" } },
        { name: "state", in: "query", schema: { type: "string", enum: ["IDLE", "RUNNING", "FAILED", "STOPPING", "DELETED"] } },
        { name: "pageSize", in: "query", schema: { type: "integer", default: 25 } },
        { name: "pageToken", in: "query", schema: { type: "string" } },
      ],
      responses: pathResp(buildPipelineListSchema()),
    },
    post: {
      summary: "Create pipeline",
      tags: ["Pipelines"],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                workspaceId: { type: "string" },
                target: { type: "string", enum: ["DEVELOPMENT", "PRODUCTION"] },
                catalog: { type: "string" },
                schema: { type: "string" },
                continuous: { type: "boolean" },
                photon: { type: "boolean" },
                edition: { type: "string", enum: ["CORE", "PRO", "ADVANCED"] },
                clusters: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      nodeType: { type: "string" },
                      workerCount: { type: "integer" },
                      enableAutoscaling: { type: "boolean" },
                    },
                  },
                },
              },
              required: ["name", "workspaceId", "target"],
            },
          },
        },
      },
      responses: pathResp201(buildPipelineSchema()),
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
  "/v1/pipelines/{pipelineId}/start": {
    post: {
      summary: "Start pipeline",
      tags: ["Pipelines"],
      parameters: [{ name: "pipelineId", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                fullRefresh: { type: "boolean" },
                refreshSelection: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
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
  "/v1/pipelines/{pipelineId}/events": {
    get: {
      summary: "List pipeline events",
      tags: ["Pipelines"],
      parameters: [
        { name: "pipelineId", in: "path", required: true, schema: { type: "string" } },
        { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        { name: "orderBy", in: "query", schema: { type: "string", enum: ["timestamp_asc", "timestamp_desc"] } },
      ],
      responses: pathResp({
        type: "object",
        properties: {
          events: { type: "array", items: buildPipelineEventSchema() },
          totalCount: { type: "number" },
        },
        required: ["events", "totalCount"],
      }),
    },
  },
  "/v1/webhooks": {
    get: {
      summary: "List webhooks",
      tags: ["Webhooks"],
      parameters: [
        { name: "active", in: "query", schema: { type: "boolean" } },
        { name: "event", in: "query", schema: { type: "string" } },
      ],
      responses: pathResp(buildWebhookListSchema()),
    },
    post: {
      summary: "Create webhook",
      tags: ["Webhooks"],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                url: { type: "string", format: "uri" },
                events: { type: "array", items: { type: "string" } },
                secret: { type: "string" },
                active: { type: "boolean" },
              },
              required: ["url", "events"],
            },
          },
        },
      },
      responses: pathResp201(buildWebhookSchema()),
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
              properties: {
                url: { type: "string", format: "uri" },
                events: { type: "array", items: { type: "string" } },
                secret: { type: "string" },
                active: { type: "boolean" },
              },
            },
          },
        },
      },
      responses: pathResp(buildWebhookSchema()),
    },
    delete: {
      summary: "Delete webhook",
      tags: ["Webhooks"],
      parameters: [{ name: "webhookId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "204": { description: "No Content" },
      },
    },
  },
  "/v1/webhooks/{webhookId}/test": {
    post: {
      summary: "Test webhook",
      tags: ["Webhooks"],
      parameters: [{ name: "webhookId", in: "path", required: true, schema: { type: "string" } }],
      responses: pathResp(buildWebhookDeliverySchema()),
    },
  },
  "/v1/webhooks/{webhookId}/deliveries": {
    get: {
      summary: "List webhook deliveries",
      tags: ["Webhooks"],
      parameters: [
        { name: "webhookId", in: "path", required: true, schema: { type: "string" } },
        { name: "limit", in: "query", schema: { type: "integer", default: 25 } },
        { name: "success", in: "query", schema: { type: "boolean" } },
      ],
      responses: pathResp({
        type: "object",
        properties: {
          deliveries: { type: "array", items: buildWebhookDeliverySchema() },
          totalCount: { type: "number" },
        },
        required: ["deliveries", "totalCount"],
      }),
    },
  },
};

const spec = {
  openapi: "3.1.0",
  info: {
    title: "DataStack API",
    version: "2.0.0",
    description: "REST API for DataStack: authentication, workspaces, compute clusters, jobs, notebooks, pipelines, SQL warehouses, and webhooks.",
  },
  tags: [
    { name: "Authentication", description: "OAuth2 token exchange and API key management" },
    { name: "Identity & Access", description: "Users and permissions" },
    { name: "Workspaces", description: "Workspace management" },
    { name: "Compute / Clusters", description: "Spark compute clusters" },
    { name: "Jobs", description: "Scheduled and triggered jobs" },
    { name: "Notebooks", description: "Notebook CRUD and export" },
    { name: "Pipelines", description: "Delta Live Tables pipeline management" },
    { name: "SQL Warehouses", description: "SQL warehouse lifecycle" },
    { name: "Webhooks", description: "Webhook registration and delivery tracking" },
  ],
  paths,
};

const outputPath = path.resolve(process.cwd(), "openapi/generated.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
