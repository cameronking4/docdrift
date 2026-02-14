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
            sparkVersion: { type: "string" },
            nodeType: { type: "string" },
            numWorkers: { type: "integer" },
            autoTerminationMinutes: { type: "integer" },
          },
          required: ["name", "sparkVersion", "nodeType"],
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
        sparkVersion: string;
        nodeType: string;
        numWorkers?: number;
        autoTerminationMinutes?: number;
      };
      return {
        id: "cluster-new",
        name: body.name,
        clusterSize: "Medium",
        region: "us-east-1",
        state: "PENDING",
        sparkVersion: body.sparkVersion,
        nodeType: body.nodeType,
        numWorkers: body.numWorkers ?? 2,
        autoTerminationMinutes: body.autoTerminationMinutes ?? 30,
        createdAt: new Date().toISOString(),
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
}
