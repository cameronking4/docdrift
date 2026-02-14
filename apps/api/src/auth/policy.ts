export const AUTH_SCOPE_HEADER = "x-datastack-scope";

export const SCOPES = {
  READ_USERS: "read:users",
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
} as const;

/** Default scope accepted for demo; in production validate per-route. */
export const AUTH_SCOPE_VALUE = SCOPES.READ_USERS;
