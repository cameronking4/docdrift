/**
 * Shared OpenAPI schema builders for DataStack API.
 * Used by routes and by the OpenAPI export script.
 */

export const USER_RESPONSE_FIELDS = [
  "id",
  "fullName",
  "email",
  "avatarUrl",
  "createdAt",
  "role",
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
      users: { type: "array" as const, items: buildUserSchema() },
      totalCount: { type: "number" as const },
    },
    required: ["users", "totalCount"] as const,
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
      numWorkers: { type: "integer" },
      autoTerminationMinutes: { type: "integer" },
      createdAt: { type: "string", format: "date-time" },
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
