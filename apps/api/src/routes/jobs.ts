import { FastifyInstance } from "fastify";
import { AUTH_SCOPE_HEADER } from "../auth/policy";
import {
  buildJobSchema,
  buildJobRunSchema,
  buildJobListSchema,
  buildErrorSchema,
} from "../model";

export async function registerJobRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/v1/jobs",
    {
      schema: {
        summary: "List jobs",
        description: "Lists all jobs in the workspace with optional filters.",
        tags: ["Jobs"],
        querystring: {
          type: "object",
          properties: {
            workspaceId: { type: "string" },
            limit: { type: "integer", default: 25 },
            offset: { type: "integer", default: 0 },
            expand: { type: "string", description: "Comma-separated: runs, tasks" },
          },
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildJobListSchema(),
          403: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const q = request.query as { limit?: number; offset?: number };
      const limit = Math.min(100, Math.max(1, q.limit ?? 25));
      const offset = Math.max(0, q.offset ?? 0);
      return {
        jobs: [
          {
            jobId: 1001,
            name: "Daily ETL",
            description: "Ingest and transform raw events",
            schedule: "0 0 2 * * ?",
            trigger: "PERIODIC",
            settings: {
              clusterId: "cluster-001",
              notebookPath: "/Workspace/ETL/daily_pipeline",
              timeoutSeconds: 3600,
            },
            createdAt: "2024-02-01T10:00:00Z",
            createdBy: "ada@datastack.dev",
          },
          {
            jobId: 1002,
            name: "Weekly Report",
            description: "Aggregate metrics and send report",
            schedule: "0 0 9 ? * MON",
            trigger: "PERIODIC",
            settings: {
              clusterId: "cluster-002",
              notebookPath: "/Workspace/Reports/weekly",
              timeoutSeconds: 7200,
            },
            createdAt: "2024-02-15T08:00:00Z",
            createdBy: "ada@datastack.dev",
          },
        ],
        totalCount: 2,
      };
    }
  );

  app.get(
    "/v1/jobs/{jobId}",
    {
      schema: {
        summary: "Get job by ID",
        description: "Returns full job configuration and metadata.",
        tags: ["Jobs"],
        params: {
          type: "object",
          properties: { jobId: { type: "integer" } },
          required: ["jobId"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildJobSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { jobId: string };
      const jobId = parseInt(params.jobId, 10);
      return {
        jobId,
        name: "Daily ETL",
        description: "Ingest and transform raw events",
        schedule: "0 0 2 * * ?",
        trigger: "PERIODIC",
        settings: {
          clusterId: "cluster-001",
          notebookPath: "/Workspace/ETL/daily_pipeline",
          timeoutSeconds: 3600,
        },
        createdAt: "2024-02-01T10:00:00Z",
        createdBy: "ada@datastack.dev",
      };
    }
  );

  app.post(
    "/v1/jobs/{jobId}/runs",
    {
      schema: {
        summary: "Trigger job run",
        description: "Runs a job immediately. Returns the run ID for polling.",
        tags: ["Jobs"],
        params: {
          type: "object",
          properties: { jobId: { type: "integer" } },
          required: ["jobId"],
        },
        body: {
          type: "object",
          properties: {
            pythonParams: { type: "array", items: { type: "string" } },
            sparkSubmitParams: { type: "array", items: { type: "string" } },
            idempotencyKey: { type: "string" },
          },
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildJobRunSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { jobId: string };
      const jobId = parseInt(params.jobId, 10);
      return {
        runId: 5001,
        jobId,
        state: "PENDING",
        startTime: new Date().toISOString(),
        endTime: undefined,
        triggeredBy: "api",
      };
    }
  );

  app.get(
    "/v1/jobs/{jobId}/runs/{runId}",
    {
      schema: {
        summary: "Get job run",
        description: "Returns state and timing for a single job run.",
        tags: ["Jobs"],
        params: {
          type: "object",
          properties: {
            jobId: { type: "integer" },
            runId: { type: "integer" },
          },
          required: ["jobId", "runId"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildJobRunSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { jobId: string; runId: string };
      return {
        runId: parseInt(params.runId, 10),
        jobId: parseInt(params.jobId, 10),
        state: "SUCCESS",
        startTime: "2024-03-10T02:00:01Z",
        endTime: "2024-03-10T02:15:33Z",
        triggeredBy: "schedule",
      };
    }
  );
}
