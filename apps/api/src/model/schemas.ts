/**
 * Shared OpenAPI schema builders for DataStack API.
 * Used by routes and by the OpenAPI export script.
 */

export const USER_RESPONSE_FIELDS = [
  "id",
  "displayName",
  "email",
  "avatarUrl",
  "createdAt",
  "updatedAt",
  "role",
  "status",
  "lastLoginAt",
] as const;

export function buildUserSchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" as const },
      displayName: { type: "string" as const },
      email: { type: "string" as const, format: "email" },
      avatarUrl: { type: "string" as const },
      createdAt: { type: "string" as const, format: "date-time" },
      updatedAt: { type: "string" as const, format: "date-time" },
      role: { type: "string" as const, enum: ["admin", "editor", "viewer"] },
      status: { type: "string" as const, enum: ["active", "suspended", "pending_verification"] },
      lastLoginAt: { type: "string" as const, format: "date-time" },
    },
    required: ["id", "displayName", "email", "createdAt", "role", "status"] as const,
  };
}

export function buildUserListSchema() {
  return {
    type: "object" as const,
    properties: {
      data: { type: "array" as const, items: buildUserSchema() },
      pagination: {
        type: "object" as const,
        properties: {
          total: { type: "integer" as const },
          page: { type: "integer" as const },
          perPage: { type: "integer" as const },
          hasMore: { type: "boolean" as const },
        },
        required: ["total", "page", "perPage", "hasMore"] as const,
      },
    },
    required: ["data", "pagination"] as const,
  };
}

// --- Workspace ---
export function buildWorkspaceSchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      region: { type: "string" },
      deploymentUrl: { type: "string" },
      status: { type: "string", enum: ["ACTIVE", "SUSPENDED", "PENDING"] },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "region", "status", "createdAt"],
  };
}

export function buildWorkspaceListSchema() {
  return {
    type: "object" as const,
    properties: {
      workspaces: { type: "array", items: buildWorkspaceSchema() },
      totalCount: { type: "number" },
      nextPageToken: { type: "string" },
    },
    required: ["workspaces", "totalCount"],
  };
}

// --- Cluster ---
export function buildClusterSchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      workspaceId: { type: "string" },
      clusterSize: { type: "string" },
      region: { type: "string", description: "Cloud region where the cluster runs (e.g. us-east-1)" },
      state: {
        type: "string",
        enum: ["PENDING", "RUNNING", "RESIZING", "TERMINATING", "TERMINATED", "ERROR"],
      },
      sparkVersion: { type: "string" },
      nodeType: { type: "string" },
      workerCount: { type: "integer" },
      minWorkers: { type: "integer" },
      maxWorkers: { type: "integer" },
      enableAutoscaling: { type: "boolean" },
      autoTerminationMinutes: { type: "integer" },
      tags: { type: "object", additionalProperties: { type: "string" } },
      createdAt: { type: "string", format: "date-time" },
      createdBy: { type: "string" },
    },
    required: ["id", "name", "workspaceId", "region", "state", "createdAt"],
  };
}

export function buildClusterListSchema() {
  return {
    type: "object" as const,
    properties: {
      clusters: { type: "array", items: buildClusterSchema() },
      totalCount: { type: "number" },
    },
    required: ["clusters", "totalCount"],
  };
}

// --- Job ---
export function buildJobSchema() {
  return {
    type: "object" as const,
    properties: {
      jobId: { type: "integer" },
      name: { type: "string" },
      description: { type: "string" },
      schedule: { type: "string", description: "Cron expression" },
      trigger: { type: "string", enum: ["PERIODIC", "MANUAL", "ONE_TIME"] },
      settings: {
        type: "object",
        properties: {
          clusterId: { type: "string" },
          notebookPath: { type: "string" },
          timeoutSeconds: { type: "integer" },
        },
      },
      createdAt: { type: "string", format: "date-time" },
      createdBy: { type: "string" },
    },
    required: ["jobId", "name", "trigger", "createdAt"],
  };
}

export function buildJobRunSchema() {
  return {
    type: "object" as const,
    properties: {
      runId: { type: "integer" },
      jobId: { type: "integer" },
      state: {
        type: "string",
        enum: ["QUEUED", "PENDING", "RUNNING", "SUCCESS", "FAILED", "CANCELED", "TIMED_OUT", "SKIPPED"],
      },
      startTime: { type: "string", format: "date-time" },
      endTime: { type: "string", format: "date-time" },
      duration: { type: "integer", description: "Run duration in seconds" },
      triggeredBy: { type: "string" },
      attempt: { type: "integer" },
      clusterSpec: {
        type: "object",
        properties: {
          clusterId: { type: "string" },
          nodeType: { type: "string" },
          workerCount: { type: "integer" },
        },
      },
    },
    required: ["runId", "jobId", "state"],
  };
}

export function buildJobListSchema() {
  return {
    type: "object" as const,
    properties: {
      jobs: { type: "array", items: buildJobSchema() },
      totalCount: { type: "number" },
    },
    required: ["jobs", "totalCount"],
  };
}

// --- Notebook ---
export function buildNotebookSchema() {
  return {
    type: "object" as const,
    properties: {
      path: { type: "string" },
      language: { type: "string", enum: ["PYTHON", "SQL", "SCALA", "R"] },
      format: { type: "string", enum: ["SOURCE", "HTML", "JUPYTER"] },
      content: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      modifiedAt: { type: "string", format: "date-time" },
    },
    required: ["path", "language", "format"],
  };
}

export function buildNotebookListSchema() {
  return {
    type: "object" as const,
    properties: {
      notebooks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            path: { type: "string" },
            language: { type: "string" },
            modifiedAt: { type: "string" },
          },
        },
      },
      totalCount: { type: "number" },
    },
    required: ["notebooks", "totalCount"],
  };
}

// --- Pipeline ---
export function buildPipelineSchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      workspaceId: { type: "string" },
      state: {
        type: "string",
        enum: ["IDLE", "RUNNING", "FAILED", "STOPPING", "DELETED"],
      },
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
      createdAt: { type: "string", format: "date-time" },
      createdBy: { type: "string" },
      lastRunAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "workspaceId", "state", "target", "createdAt"],
  };
}

export function buildPipelineListSchema() {
  return {
    type: "object" as const,
    properties: {
      pipelines: { type: "array", items: buildPipelineSchema() },
      totalCount: { type: "number" },
      nextPageToken: { type: "string" },
    },
    required: ["pipelines", "totalCount"],
  };
}

export function buildPipelineEventSchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      pipelineId: { type: "string" },
      eventType: { type: "string", enum: ["STARTED", "COMPLETED", "FAILED", "RETRYING"] },
      message: { type: "string" },
      timestamp: { type: "string", format: "date-time" },
      details: { type: "object" },
    },
    required: ["id", "pipelineId", "eventType", "timestamp"],
  };
}

// --- Webhook ---
export function buildWebhookSchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      url: { type: "string", format: "uri" },
      events: { type: "array", items: { type: "string" } },
      secret: { type: "string" },
      active: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      lastTriggeredAt: { type: "string", format: "date-time" },
      failureCount: { type: "integer" },
    },
    required: ["id", "url", "events", "active", "createdAt"],
  };
}

export function buildWebhookListSchema() {
  return {
    type: "object" as const,
    properties: {
      webhooks: { type: "array", items: buildWebhookSchema() },
      totalCount: { type: "number" },
    },
    required: ["webhooks", "totalCount"],
  };
}

export function buildWebhookDeliverySchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      webhookId: { type: "string" },
      event: { type: "string" },
      requestUrl: { type: "string" },
      requestHeaders: { type: "object" },
      requestBody: { type: "string" },
      responseStatus: { type: "integer" },
      responseBody: { type: "string" },
      success: { type: "boolean" },
      duration: { type: "integer" },
      timestamp: { type: "string", format: "date-time" },
    },
    required: ["id", "webhookId", "event", "success", "timestamp"],
  };
}

// --- SQL Warehouse ---
export function buildSqlWarehouseSchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      workspaceId: { type: "string" },
      clusterSize: { type: "string" },
      warehouseType: { type: "string", enum: ["CLASSIC", "PRO", "SERVERLESS"] },
      state: {
        type: "string",
        enum: ["STARTING", "RUNNING", "STOPPING", "STOPPED", "DELETED", "DEGRADED"],
      },
      maxNumClusters: { type: "integer" },
      minNumClusters: { type: "integer" },
      enableServerlessCompute: { type: "boolean" },
      jdbcUrl: { type: "string" },
      odbcUrl: { type: "string" },
      httpPath: { type: "string" },
      tags: { type: "object", additionalProperties: { type: "string" } },
      createdAt: { type: "string", format: "date-time" },
      createdBy: { type: "string" },
    },
    required: ["id", "name", "workspaceId", "state", "warehouseType", "createdAt"],
  };
}

export function buildSqlWarehouseListSchema() {
  return {
    type: "object" as const,
    properties: {
      warehouses: { type: "array", items: buildSqlWarehouseSchema() },
      totalCount: { type: "number" },
    },
    required: ["warehouses", "totalCount"],
  };
}

// --- Common ---
export function buildErrorSchema() {
  return {
    type: "object" as const,
    properties: {
      code: { type: "string" },
      message: { type: "string" },
      details: { type: "object" },
    },
    required: ["code", "message"],
  };
}
