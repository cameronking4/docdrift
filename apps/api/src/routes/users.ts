import { FastifyInstance } from "fastify";
import { AUTH_SCOPE_HEADER, AUTH_SCOPE_VALUE } from "../auth/policy";
import { buildUserSchema, buildUserListSchema, buildErrorSchema } from "../model";

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/v1/users/:id",
    {
      schema: {
        summary: "Get user by ID",
        tags: ["Identity & Access"],
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
        response: {
          200: buildUserSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { id: string };
      return {
        id: params.id,
        fullName: "Ada Lovelace",
        email: "ada@datastack.dev",
        avatarUrl: "https://api.datastack.dev/avatars/ada.png",
        department: "Engineering",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-06-01T15:30:00Z",
        role: "admin",
        status: "active",
        lastLoginAt: "2024-06-10T08:00:00Z",
      };
    }
  );

  app.get(
    "/v1/users",
    {
      schema: {
        summary: "List users",
        tags: ["Identity & Access"],
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", default: 1 },
            perPage: { type: "integer", default: 20 },
            role: { type: "string", enum: ["admin", "editor", "viewer"] },
            status: { type: "string", enum: ["active", "suspended", "pending_verification"] },
            search: { type: "string", description: "Search by name or email" },
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
      const q = request.query as { page?: number; perPage?: number };
      const page = Math.max(1, q.page ?? 1);
      const perPage = Math.min(100, Math.max(1, q.perPage ?? 20));
      return {
        data: [
          {
            id: "u1",
            fullName: "Ada Lovelace",
            email: "ada@datastack.dev",
            avatarUrl: "https://api.datastack.dev/avatars/ada.png",
            department: "Engineering",
            createdAt: "2024-01-15T10:00:00Z",
            updatedAt: "2024-06-01T15:30:00Z",
            role: "admin",
            status: "active",
            lastLoginAt: "2024-06-10T08:00:00Z",
          },
        ],
        pagination: {
          total: 1,
          page,
          perPage,
          hasMore: false,
        },
      };
    }
  );

  app.post(
    "/v1/users",
    {
      schema: {
        summary: "Create user",
        tags: ["Identity & Access"],
        body: {
          type: "object",
          properties: {
            fullName: { type: "string" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["admin", "editor", "viewer"] },
          },
          required: ["fullName", "email", "role"],
        },
        headers: {
          type: "object",
          properties: {
            [AUTH_SCOPE_HEADER]: { type: "string", const: AUTH_SCOPE_VALUE },
          },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          201: buildUserSchema(),
          400: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const body = request.body as { fullName: string; email: string; role: string };
      return {
        id: "u-new",
        fullName: body.fullName,
        email: body.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        role: body.role,
        status: "pending_verification",
      };
    }
  );

  app.patch(
    "/v1/users/:id",
    {
      schema: {
        summary: "Update user",
        tags: ["Identity & Access"],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            fullName: { type: "string" },
            role: { type: "string", enum: ["admin", "editor", "viewer"] },
            status: { type: "string", enum: ["active", "suspended"] },
          },
        },
        headers: {
          type: "object",
          properties: {
            [AUTH_SCOPE_HEADER]: { type: "string", const: AUTH_SCOPE_VALUE },
          },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildUserSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { id: string };
      return {
        id: params.id,
        fullName: "Ada Lovelace",
        email: "ada@datastack.dev",
        avatarUrl: "https://api.datastack.dev/avatars/ada.png",
        department: "Engineering",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: new Date().toISOString(),
        role: "admin",
        status: "active",
        lastLoginAt: "2024-06-10T08:00:00Z",
      };
    }
  );

  app.delete(
    "/v1/users/:id",
    {
      schema: {
        summary: "Delete user",
        tags: ["Identity & Access"],
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
        response: {
          204: { type: "null" },
          404: buildErrorSchema(),
        },
      },
    },
    async (_request, reply) => {
      reply.code(204);
    }
  );
}
