export const AUTH_HEADER = "authorization";
export const AUTH_SCOPE_HEADER = "x-datastack-scope";
export const API_KEY_HEADER = "x-api-key";

export const SCOPES = {
  READ_USERS: "read:users",
  WRITE_USERS: "write:users",
  READ_WORKSPACES: "read:workspaces",
  MANAGE_WORKSPACES: "manage:workspaces",
  READ_CLUSTERS: "read:clusters",
  MANAGE_CLUSTERS: "manage:clusters",
  READ_JOBS: "read:jobs",
  MANAGE_JOBS: "manage:jobs",
  READ_NOTEBOOKS: "read:notebooks",
  MANAGE_NOTEBOOKS: "manage:notebooks",
  READ_SQL: "read:sql",
  MANAGE_SQL: "manage:sql",
  READ_PIPELINES: "read:pipelines",
  MANAGE_PIPELINES: "manage:pipelines",
  MANAGE_WEBHOOKS: "manage:webhooks",
  MANAGE_API_KEYS: "manage:api_keys",
} as const;

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

export const AUTH_SCOPE_VALUE = SCOPES.READ_USERS;

export interface TokenPayload {
  sub: string;
  scopes: Scope[];
  exp: number;
  iat: number;
  iss: string;
}

export function buildTokenResponseSchema() {
  return {
    type: "object" as const,
    properties: {
      accessToken: { type: "string" },
      refreshToken: { type: "string" },
      tokenType: { type: "string", enum: ["Bearer"] },
      expiresIn: { type: "integer" },
      scopes: { type: "array", items: { type: "string" } },
    },
    required: ["accessToken", "tokenType", "expiresIn", "scopes"] as const,
  };
}

export function buildApiKeySchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      prefix: { type: "string" },
      scopes: { type: "array", items: { type: "string" } },
      expiresAt: { type: "string", format: "date-time" },
      createdAt: { type: "string", format: "date-time" },
      lastUsedAt: { type: "string", format: "date-time" },
      status: { type: "string", enum: ["ACTIVE", "REVOKED", "EXPIRED"] },
    },
    required: ["id", "name", "prefix", "scopes", "status", "createdAt"] as const,
  };
}

export function buildApiKeyListSchema() {
  return {
    type: "object" as const,
    properties: {
      apiKeys: { type: "array", items: buildApiKeySchema() },
      totalCount: { type: "number" },
    },
    required: ["apiKeys", "totalCount"] as const,
  };
}

export function buildApiKeyCreatedSchema() {
  return {
    type: "object" as const,
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      key: { type: "string" },
      prefix: { type: "string" },
      scopes: { type: "array", items: { type: "string" } },
      expiresAt: { type: "string", format: "date-time" },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "key", "prefix", "scopes", "createdAt"] as const,
  };
}
