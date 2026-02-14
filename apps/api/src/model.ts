export const USER_RESPONSE_FIELDS = [
  "id",
  "fullName",
  "email",
  "avatarUrl",
  "createdAt",
  "role",
] as const;

export function buildUserSchema(): {
  type: "object";
  properties: Record<string, { type: string }>;
  required: readonly string[];
} {
  return {
    type: "object",
    properties: Object.fromEntries(
      USER_RESPONSE_FIELDS.map((field) => [field, { type: "string" }])
    ),
    required: [...USER_RESPONSE_FIELDS],
  };
}

export function buildUserListSchema(): {
  type: "object";
  properties: {
    users: { type: "array"; items: ReturnType<typeof buildUserSchema> };
    totalCount: { type: "number" };
  };
  required: ["users", "totalCount"];
} {
  return {
    type: "object",
    properties: {
      users: { type: "array", items: buildUserSchema() },
      totalCount: { type: "number" },
    },
    required: ["users", "totalCount"],
  };
}
