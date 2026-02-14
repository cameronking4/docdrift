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
  "role",
  "lastLoginAt",
  "status",
  "updatedAt",
] as const;

export function buildUserSchema() {
  return {
    type: "object" as const,
    properties: Object.fromEntries(
      USER_RESPONSE_FIELDS.map((f) => [f, { type: "string" as const }])
    ),
    required: [...USER_RESPONSE_FIELDS],
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
          page: { type: "integer" as const },
          limit: { type: "integer" as const },
          totalCount: { type: "integer" as const },
          totalPages: { type: "integer" as const },
        },
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
      clusterSize: { type: "string" },
      region: { type: "string", description: "Cloud region where the cluster runs (e.g. us-east-1)" },
      state: {
        type: "string",
        enum: ["PENDING", "RUNNING", "TERMINATING", "TERMINATED", "ERROR"],
      },
      sparkVersion: { type: "string" },
      nodeType: { type: "string" },
      workerCount: { type: "integer" },
      autoTerminationMinutes: { type: "integer" },
      createdAt: { type: "string", format: "date-time" },
      createdBy: { type: "string" },
      enableAutoscaling: { type: "boolean" },
      maxWorkers: { type: "integer" },
      minWorkers: { type: "integer" },
      tags: { type: "object", additionalProperties: { type: "string" } },
      workspaceId: { type: "string" },
    },
    required: ["id", "name", "region", "state", "createdAt"],
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
        enum: ["PENDING", "RUNNING", "SUCCESS", "FAILED", "CANCELED", "TIMED_OUT"],
      },
      startTime: { type: "string", format: "date-time" },
      endTime: { type: "string", format: "date-time" },
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
      duration: { type: "integer", description: "Duration in milliseconds" },
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

// --- SQL Warehouse ---
export function buildSqlWarehouseSchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      clusterSize: { type: "string" },
      state: {
        type: "string",
        enum: ["STARTING", "RUNNING", "STOPPING", "STOPPED", "DELETED"],
      },
      jdbcUrl: { type: "string" },
      odbcUrl: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      createdBy: { type: "string" },
      enableServerlessCompute: { type: "boolean" },
      httpPath: { type: "string" },
      maxNumClusters: { type: "integer" },
      minNumClusters: { type: "integer" },
      tags: { type: "object", additionalProperties: { type: "string" } },
      warehouseType: { type: "string", enum: ["CLASSIC", "PRO", "SERVERLESS"] },
      workspaceId: { type: "string" },
    },
    required: ["id", "name", "state", "createdAt"],
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

// --- Pipeline ---
export function buildPipelineSchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      state: {
        type: "string",
        enum: ["IDLE", "RUNNING", "STOPPING", "FAILED"],
      },
      catalog: { type: "string" },
      clusters: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            nodeType: { type: "string" },
            workerCount: { type: "integer" },
          },
        },
      },
      continuous: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      createdBy: { type: "string" },
      edition: { type: "string", enum: ["CORE", "PRO", "ADVANCED"] },
      lastRunAt: { type: "string", format: "date-time" },
      photon: { type: "boolean" },
      schema: { type: "string" },
      target: { type: "string" },
      workspaceId: { type: "string" },
    },
    required: ["id", "name", "state", "createdAt"],
  };
}

export function buildPipelineListSchema() {
  return {
    type: "object" as const,
    properties: {
      pipelines: { type: "array", items: buildPipelineSchema() },
      totalCount: { type: "integer" },
      nextPageToken: { type: "string" },
    },
    required: ["pipelines", "totalCount"],
  };
}

export function buildPipelineEventListSchema() {
  return {
    type: "object" as const,
    properties: {
      events: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            eventType: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
            message: { type: "string" },
          },
        },
      },
      totalCount: { type: "integer" },
    },
    required: ["events", "totalCount"],
  };
}

// --- Webhook ---
export function buildWebhookSchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      url: { type: "string" },
      events: { type: "array", items: { type: "string" } },
      active: { type: "boolean" },
      secret: { type: "string" },
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
      totalCount: { type: "integer" },
    },
    required: ["webhooks", "totalCount"],
  };
}

export function buildWebhookDeliveryListSchema() {
  return {
    type: "object" as const,
    properties: {
      deliveries: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            event: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
            responseStatus: { type: "integer" },
            success: { type: "boolean" },
          },
        },
      },
      totalCount: { type: "integer" },
    },
    required: ["deliveries", "totalCount"],
  };
}

export function buildWebhookTestResultSchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      webhookId: { type: "string" },
      event: { type: "string" },
      requestUrl: { type: "string" },
      requestHeaders: { type: "object", additionalProperties: { type: "string" } },
      requestBody: { type: "string" },
      responseStatus: { type: "integer" },
      responseBody: { type: "string" },
      success: { type: "boolean" },
      duration: { type: "integer", description: "Duration in milliseconds" },
      timestamp: { type: "string", format: "date-time" },
    },
    required: ["id", "webhookId", "event", "success", "timestamp"],
  };
}

// --- Auth ---
export function buildApiKeySchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      prefix: { type: "string" },
      scopes: { type: "array", items: { type: "string" } },
      status: { type: "string", enum: ["ACTIVE", "REVOKED", "EXPIRED"] },
      createdAt: { type: "string", format: "date-time" },
      expiresAt: { type: "string", format: "date-time" },
      lastUsedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "prefix", "status", "createdAt"],
  };
}

export function buildApiKeyListSchema() {
  return {
    type: "object" as const,
    properties: {
      apiKeys: { type: "array", items: buildApiKeySchema() },
      totalCount: { type: "integer" },
    },
    required: ["apiKeys", "totalCount"],
  };
}

export function buildAuthTokenSchema() {
  return {
    type: "object" as const,
    properties: {
      accessToken: { type: "string" },
      refreshToken: { type: "string" },
      tokenType: { type: "string" },
      expiresIn: { type: "integer", description: "Token lifetime in seconds" },
      scopes: { type: "array", items: { type: "string" } },
    },
    required: ["accessToken", "tokenType", "expiresIn"],
  };
}

export function buildTokenRevokeSchema() {
  return {
    type: "object" as const,
    properties: {
      revoked: { type: "boolean" },
    },
    required: ["revoked"],
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
