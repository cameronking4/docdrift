import { FastifyInstance } from "fastify";
import { AUTH_SCOPE_HEADER } from "../auth/policy";
import {
  buildClusterSchema,
  buildClusterListSchema,
  buildErrorSchema,
} from "../model";

export async function registerClusterRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get(
    "/v1/clusters",
    {
      schema: {
        summary: "List clusters",
        description:
          "Lists all compute clusters in the workspace. Filter by state optional.",
        tags: ["Compute / Clusters"],
        querystring: {
          type: "object",
          properties: {
            workspaceId: { type: "string" },
            state: {
              type: "string",
              enum: ["PENDING", "RUNNING", "TERMINATING", "TERMINATED", "ERROR"],
            },
            page: { type: "integer", default: 1 },
            pageSize: { type: "integer", default: 25 },
          },
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildClusterListSchema(),
          403: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const q = request.query as {
        workspaceId?: string;
        state?: string;
        page?: number;
        pageSize?: number;
      };
      const page = Math.max(1, q.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 25));
      return {
        clusters: [
          {
            id: "cluster-001",
            name: "Analytics Cluster",
            clusterSize: "Medium",
            region: "us-east-1",
            state: "RUNNING",
            sparkVersion: "3.5.x-scala2.12",
            nodeType: "i3.xlarge",
            numWorkers: 4,
            autoTerminationMinutes: 30,
            createdAt: "2024-03-01T09:00:00Z",
          },
          {
            id: "cluster-002",
            name: "ETL Jobs",
            clusterSize: "Large",
            region: "us-west-2",
            state: "RUNNING",
            sparkVersion: "3.5.x-scala2.12",
            nodeType: "r5.2xlarge",
            numWorkers: 8,
            autoTerminationMinutes: 0,
            createdAt: "2024-03-15T14:00:00Z",
          },
        ],
        totalCount: 2,
      };
    }
  );

  app.get(
    "/v1/clusters/{clusterId}",
    {
      schema: {
        summary: "Get cluster by ID",
        description: "Returns configuration and state for a single cluster.",
        tags: ["Compute / Clusters"],
        params: {
          type: "object",
          properties: { clusterId: { type: "string" } },
          required: ["clusterId"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildClusterSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { clusterId: string };
      return {
        id: params.clusterId,
        name: "Analytics Cluster",
        clusterSize: "Medium",
        region: "us-east-1",
        state: "RUNNING",
        sparkVersion: "3.5.x-scala2.12",
        nodeType: "i3.xlarge",
        numWorkers: 4,
        autoTerminationMinutes: 30,
        createdAt: "2024-03-01T09:00:00Z",
      };
    }
  );

  app.post(
    "/v1/clusters",
    {
      schema: {
        summary: "Create cluster",
        description: "Creates a new compute cluster with the given configuration.",
        tags: ["Compute / Clusters"],
            body: {
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
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          201: buildClusterSchema(),
          400: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const body = request.body as {
        name: string;
        workspaceId: string;
        sparkVersion: string;
        nodeType: string;
        workerCount?: number;
        enableAutoscaling?: boolean;
        minWorkers?: number;
        maxWorkers?: number;
        autoTerminationMinutes?: number;
        tags?: Record<string, string>;
      };
      return {
        id: "cluster-new",
        name: body.name,
        workspaceId: body.workspaceId,
        clusterSize: "Medium",
        region: "us-east-1",
        state: "PENDING",
        sparkVersion: body.sparkVersion,
        nodeType: body.nodeType,
        workerCount: body.workerCount ?? 2,
        enableAutoscaling: body.enableAutoscaling ?? false,
        minWorkers: body.minWorkers ?? 1,
        maxWorkers: body.maxWorkers ?? 8,
        autoTerminationMinutes: body.autoTerminationMinutes ?? 30,
        tags: body.tags ?? {},
        createdAt: new Date().toISOString(),
        createdBy: "api",
      };
    }
  );

  app.delete(
    "/v1/clusters/{clusterId}",
    {
      schema: {
        summary: "Terminate cluster",
        description: "Terminates a cluster. Billing stops when termination completes.",
        tags: ["Compute / Clusters"],
        params: {
          type: "object",
          properties: { clusterId: { type: "string" } },
          required: ["clusterId"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: { type: "object", properties: { message: { type: "string" } } },
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { clusterId: string };
      return { message: `Cluster ${params.clusterId} termination initiated.` };
    }
  );

  app.post(
    "/v1/clusters/{clusterId}/resize",
    {
      schema: {
        summary: "Resize cluster",
        description: "Changes the number of workers on a running cluster.",
        tags: ["Compute / Clusters"],
        params: {
          type: "object",
          properties: { clusterId: { type: "string" } },
          required: ["clusterId"],
        },
        body: {
          type: "object",
          properties: {
            workerCount: { type: "integer" },
            minWorkers: { type: "integer" },
            maxWorkers: { type: "integer" },
          },
          required: ["workerCount"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildClusterSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { clusterId: string };
      const body = request.body as { workerCount: number };
      return {
        id: params.clusterId,
        name: "Analytics Cluster",
        workspaceId: "ws-001",
        clusterSize: "Medium",
        region: "us-east-1",
        state: "RESIZING",
        sparkVersion: "3.5.x-scala2.12",
        nodeType: "i3.xlarge",
        workerCount: body.workerCount,
        autoTerminationMinutes: 30,
        createdAt: "2024-03-01T09:00:00Z",
        createdBy: "ada@datastack.dev",
      };
    }
  );
}
