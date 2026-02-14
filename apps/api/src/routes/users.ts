import { FastifyInstance } from "fastify";
import { AUTH_SCOPE_HEADER, AUTH_SCOPE_VALUE } from "../auth/policy";
import { buildUserSchema, buildUserListSchema } from "../model";

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/v1/users/:id",
    {
      schema: {
        summary: "Get a user by ID",
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        headers: {
          type: "object",
          properties: {
            [AUTH_SCOPE_HEADER]: { type: "string", const: AUTH_SCOPE_VALUE },
          },
          required: [AUTH_SCOPE_HEADER],
        },
        response: { 200: buildUserSchema() },
      },
    },
    async (request) => {
      const params = request.params as { id: string };
      return {
        id: params.id,
        fullName: "Ada Lovelace",
        email: "ada@datastack.dev",
        avatarUrl: "https://api.datastack.dev/avatars/ada.png",
        createdAt: "2024-01-15T10:00:00Z",
        role: "admin",
      };
    }
  );

  app.get(
    "/v1/users",
    {
      schema: {
        summary: "List users with pagination",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", default: 1 },
            limit: { type: "integer", default: 20 },
          },
        },
        headers: {
          type: "object",
          properties: {
            [AUTH_SCOPE_HEADER]: { type: "string", const: AUTH_SCOPE_VALUE },
          },
          required: [AUTH_SCOPE_HEADER],
        },
        response: { 200: buildUserListSchema() },
      },
    },
    async (request) => {
      const q = request.query as { page?: number; limit?: number };
      const page = Math.max(1, q.page ?? 1);
      const limit = Math.min(100, Math.max(1, q.limit ?? 20));
      return {
        users: [
          {
            id: "u1",
            fullName: "Ada Lovelace",
            email: "ada@datastack.dev",
            avatarUrl: "https://api.datastack.dev/avatars/ada.png",
            createdAt: "2024-01-15T10:00:00Z",
            role: "admin",
          },
        ],
        totalCount: 1,
      };
    }
  );
}
