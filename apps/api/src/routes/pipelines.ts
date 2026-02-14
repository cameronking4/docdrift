import { FastifyInstance } from "fastify";
import { AUTH_SCOPE_HEADER } from "../auth/policy";
import {
  buildPipelineSchema,
  buildPipelineListSchema,
  buildPipelineEventSchema,
  buildErrorSchema,
} from "../model";

export async function registerPipelineRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get(
    "/v1/pipelines",
    {
      schema: {
        summary: "List pipelines",
        description:
          "Lists all Delta Live Tables pipelines in the workspace.",
        tags: ["Pipelines"],
        querystring: {
          type: "object",
          properties: {
            workspaceId: { type: "string" },
            state: {
              type: "string",
              enum: ["IDLE", "RUNNING", "FAILED", "STOPPING", "DELETED"],
            },
            pageSize: { type: "integer", default: 25 },
            pageToken: { type: "string" },
          },
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildPipelineListSchema(),
          403: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const q = request.query as { pageSize?: number };
      const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 25));
      return {
        pipelines: [
          {
            id: "pipe-001",
            name: "Bronze Ingestion",
            workspaceId: "ws-001",
            state: "RUNNING",
            target: "PRODUCTION",
            catalog: "main",
            schema: "bronze",
            continuous: true,
            photon: true,
            edition: "PRO",
            clusters: [
              { label: "default", nodeType: "i3.xlarge", workerCount: 4, enableAutoscaling: true },
            ],
            createdAt: "2024-03-01T09:00:00Z",
            createdBy: "ada@datastack.dev",
            lastRunAt: "2024-06-10T02:00:00Z",
          },
          {
            id: "pipe-002",
            name: "Silver Transform",
            workspaceId: "ws-001",
            state: "IDLE",
            target: "DEVELOPMENT",
            catalog: "main",
            schema: "silver",
            continuous: false,
            photon: false,
            edition: "CORE",
            clusters: [],
            createdAt: "2024-04-15T14:00:00Z",
            createdBy: "bob@datastack.dev",
          },
        ],
        totalCount: 2,
      };
    }
  );

  app.get(
    "/v1/pipelines/{pipelineId}",
    {
      schema: {
        summary: "Get pipeline by ID",
        description: "Returns full configuration and state for a single pipeline.",
        tags: ["Pipelines"],
        params: {
          type: "object",
          properties: { pipelineId: { type: "string" } },
          required: ["pipelineId"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildPipelineSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { pipelineId: string };
      return {
        id: params.pipelineId,
        name: "Bronze Ingestion",
        workspaceId: "ws-001",
        state: "RUNNING",
        target: "PRODUCTION",
        catalog: "main",
        schema: "bronze",
        continuous: true,
        photon: true,
        edition: "PRO",
        clusters: [
          { label: "default", nodeType: "i3.xlarge", workerCount: 4, enableAutoscaling: true },
        ],
        createdAt: "2024-03-01T09:00:00Z",
        createdBy: "ada@datastack.dev",
        lastRunAt: "2024-06-10T02:00:00Z",
      };
    }
  );

  app.post(
    "/v1/pipelines",
    {
      schema: {
        summary: "Create pipeline",
        description: "Creates a new Delta Live Tables pipeline.",
        tags: ["Pipelines"],
        body: {
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
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          201: buildPipelineSchema(),
          400: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const body = request.body as {
        name: string;
        workspaceId: string;
        target: string;
        catalog?: string;
        schema?: string;
        continuous?: boolean;
        photon?: boolean;
        edition?: string;
      };
      return {
        id: "pipe-new",
        name: body.name,
        workspaceId: body.workspaceId,
        state: "IDLE",
        target: body.target,
        catalog: body.catalog ?? "main",
        schema: body.schema ?? "default",
        continuous: body.continuous ?? false,
        photon: body.photon ?? false,
        edition: body.edition ?? "CORE",
        clusters: [],
        createdAt: new Date().toISOString(),
        createdBy: "api",
      };
    }
  );

  app.delete(
    "/v1/pipelines/{pipelineId}",
    {
      schema: {
        summary: "Delete pipeline",
        description: "Deletes a pipeline and all associated resources.",
        tags: ["Pipelines"],
        params: {
          type: "object",
          properties: { pipelineId: { type: "string" } },
          required: ["pipelineId"],
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
      const params = request.params as { pipelineId: string };
      return { message: `Pipeline ${params.pipelineId} deleted.` };
    }
  );

  app.post(
    "/v1/pipelines/{pipelineId}/start",
    {
      schema: {
        summary: "Start pipeline",
        description: "Triggers a pipeline update (full refresh or incremental).",
        tags: ["Pipelines"],
        params: {
          type: "object",
          properties: { pipelineId: { type: "string" } },
          required: ["pipelineId"],
        },
        body: {
          type: "object",
          properties: {
            fullRefresh: { type: "boolean" },
            refreshSelection: { type: "array", items: { type: "string" } },
          },
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildPipelineSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { pipelineId: string };
      return {
        id: params.pipelineId,
        name: "Bronze Ingestion",
        workspaceId: "ws-001",
        state: "RUNNING",
        target: "PRODUCTION",
        catalog: "main",
        schema: "bronze",
        continuous: true,
        photon: true,
        edition: "PRO",
        clusters: [],
        createdAt: "2024-03-01T09:00:00Z",
        createdBy: "ada@datastack.dev",
        lastRunAt: new Date().toISOString(),
      };
    }
  );

  app.post(
    "/v1/pipelines/{pipelineId}/stop",
    {
      schema: {
        summary: "Stop pipeline",
        description: "Stops a running pipeline.",
        tags: ["Pipelines"],
        params: {
          type: "object",
          properties: { pipelineId: { type: "string" } },
          required: ["pipelineId"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildPipelineSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { pipelineId: string };
      return {
        id: params.pipelineId,
        name: "Bronze Ingestion",
        workspaceId: "ws-001",
        state: "STOPPING",
        target: "PRODUCTION",
        catalog: "main",
        schema: "bronze",
        continuous: true,
        photon: true,
        edition: "PRO",
        clusters: [],
        createdAt: "2024-03-01T09:00:00Z",
        createdBy: "ada@datastack.dev",
      };
    }
  );

  app.get(
    "/v1/pipelines/{pipelineId}/events",
    {
      schema: {
        summary: "List pipeline events",
        description: "Returns recent events for a pipeline run.",
        tags: ["Pipelines"],
        params: {
          type: "object",
          properties: { pipelineId: { type: "string" } },
          required: ["pipelineId"],
        },
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", default: 50 },
            orderBy: { type: "string", enum: ["timestamp_asc", "timestamp_desc"] },
          },
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: {
            type: "object",
            properties: {
              events: { type: "array", items: buildPipelineEventSchema() },
              totalCount: { type: "number" },
            },
            required: ["events", "totalCount"],
          },
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { pipelineId: string };
      return {
        events: [
          {
            id: "evt-001",
            pipelineId: params.pipelineId,
            eventType: "STARTED",
            message: "Pipeline update started",
            timestamp: "2024-06-10T02:00:00Z",
          },
          {
            id: "evt-002",
            pipelineId: params.pipelineId,
            eventType: "COMPLETED",
            message: "Pipeline update completed successfully",
            timestamp: "2024-06-10T02:15:33Z",
          },
        ],
        totalCount: 2,
      };
    }
  );
}
