import { FastifyInstance } from "fastify";
import { AUTH_SCOPE_HEADER } from "../auth/policy";
import {
  buildWorkspaceSchema,
  buildWorkspaceListSchema,
  buildErrorSchema,
} from "../model";

export async function registerWorkspaceRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get(
    "/v1/workspaces",
    {
      schema: {
        summary: "List workspaces",
        description:
          "Returns all workspaces the caller has access to. Supports pagination.",
        tags: ["Workspaces"],
        querystring: {
          type: "object",
          properties: {
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
          200: buildWorkspaceListSchema(),
          403: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const q = request.query as { pageSize?: number; pageToken?: string };
      const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 25));
      return {
        workspaces: [
          {
            id: "ws-001",
            name: "Acme Corp Production",
            region: "us-west-2",
            deploymentUrl: "https://acme.datastack.cloud",
            status: "ACTIVE",
            createdAt: "2024-01-10T08:00:00Z",
          },
          {
            id: "ws-002",
            name: "Acme Corp Staging",
            region: "us-east-1",
            deploymentUrl: "https://acme-staging.datastack.cloud",
            status: "ACTIVE",
            createdAt: "2024-02-01T12:00:00Z",
          },
        ],
        totalCount: 2,
        nextPageToken: undefined,
      };
    }
  );

  app.get(
    "/v1/workspaces/{workspaceId}",
    {
      schema: {
        summary: "Get workspace by ID",
        description: "Returns a single workspace by ID.",
        tags: ["Workspaces"],
        params: {
          type: "object",
          properties: { workspaceId: { type: "string" } },
          required: ["workspaceId"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildWorkspaceSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { workspaceId: string };
      return {
        id: params.workspaceId,
        name: "Acme Corp Production",
        region: "us-west-2",
        deploymentUrl: "https://acme.datastack.cloud",
        status: "ACTIVE",
        createdAt: "2024-01-10T08:00:00Z",
      };
    }
  );
}
