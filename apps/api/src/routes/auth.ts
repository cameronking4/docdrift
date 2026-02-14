import { FastifyInstance } from "fastify";
import {
  buildTokenResponseSchema,
  buildApiKeySchema,
  buildApiKeyListSchema,
  buildApiKeyCreatedSchema,
} from "../auth/policy";
import { buildErrorSchema } from "../model";
import { AUTH_SCOPE_HEADER } from "../auth/policy";

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/v1/auth/token",
    {
      schema: {
        summary: "Exchange credentials for access token",
        description:
          "Authenticates using client credentials (OAuth2 client_credentials grant) and returns a bearer token.",
        tags: ["Authentication"],
        body: {
          type: "object",
          properties: {
            grantType: { type: "string", enum: ["client_credentials", "refresh_token"] },
            clientId: { type: "string" },
            clientSecret: { type: "string" },
            refreshToken: { type: "string" },
            scopes: { type: "array", items: { type: "string" } },
          },
          required: ["grantType"],
        },
        response: {
          200: buildTokenResponseSchema(),
          401: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const body = request.body as {
        grantType: string;
        scopes?: string[];
      };
      return {
        accessToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.demo-token",
        refreshToken: "drt_refresh_demo_token",
        tokenType: "Bearer",
        expiresIn: 3600,
        scopes: body.scopes ?? ["read:users", "read:workspaces"],
      };
    }
  );

  app.post(
    "/v1/auth/token/revoke",
    {
      schema: {
        summary: "Revoke a token",
        description: "Revokes an access or refresh token.",
        tags: ["Authentication"],
        body: {
          type: "object",
          properties: {
            token: { type: "string" },
            tokenTypeHint: { type: "string", enum: ["access_token", "refresh_token"] },
          },
          required: ["token"],
        },
        response: {
          200: {
            type: "object",
            properties: { revoked: { type: "boolean" } },
            required: ["revoked"],
          },
          401: buildErrorSchema(),
        },
      },
    },
    async () => {
      return { revoked: true };
    }
  );

  app.get(
    "/v1/auth/api-keys",
    {
      schema: {
        summary: "List API keys",
        description: "Lists all API keys for the authenticated user.",
        tags: ["Authentication"],
        querystring: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["ACTIVE", "REVOKED", "EXPIRED"] },
          },
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildApiKeyListSchema(),
          403: buildErrorSchema(),
        },
      },
    },
    async () => {
      return {
        apiKeys: [
          {
            id: "key-001",
            name: "CI/CD Pipeline Key",
            prefix: "dsk_live_abc",
            scopes: ["read:clusters", "manage:jobs"],
            expiresAt: "2025-06-01T00:00:00Z",
            createdAt: "2024-06-01T10:00:00Z",
            lastUsedAt: "2024-06-10T08:00:00Z",
            status: "ACTIVE",
          },
        ],
        totalCount: 1,
      };
    }
  );

  app.post(
    "/v1/auth/api-keys",
    {
      schema: {
        summary: "Create API key",
        description:
          "Creates a new API key. The full key value is only returned once in the response.",
        tags: ["Authentication"],
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            scopes: { type: "array", items: { type: "string" } },
            expiresInDays: { type: "integer" },
          },
          required: ["name", "scopes"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          201: buildApiKeyCreatedSchema(),
          400: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const body = request.body as {
        name: string;
        scopes: string[];
        expiresInDays?: number;
      };
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (body.expiresInDays ?? 90));
      return {
        id: "key-new",
        name: body.name,
        key: "dsk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        prefix: "dsk_live_xxx",
        scopes: body.scopes,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      };
    }
  );

  app.delete(
    "/v1/auth/api-keys/{keyId}",
    {
      schema: {
        summary: "Revoke API key",
        description: "Revokes an API key. This action cannot be undone.",
        tags: ["Authentication"],
        params: {
          type: "object",
          properties: { keyId: { type: "string" } },
          required: ["keyId"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildApiKeySchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { keyId: string };
      return {
        id: params.keyId,
        name: "CI/CD Pipeline Key",
        prefix: "dsk_live_abc",
        scopes: ["read:clusters", "manage:jobs"],
        expiresAt: "2025-06-01T00:00:00Z",
        createdAt: "2024-06-01T10:00:00Z",
        lastUsedAt: "2024-06-10T08:00:00Z",
        status: "REVOKED",
      };
    }
  );
}
