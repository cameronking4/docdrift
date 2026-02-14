export const USER_RESPONSE_FIELDS = ["id", "name", "email"] as const;

export function buildUserSchema(): {
  type: "object";
  properties: Record<string, { type: "string" }>;
  required: readonly string[];
} {
  return {
    type: "object",
    properties: Object.fromEntries(USER_RESPONSE_FIELDS.map((field) => [field, { type: "string" }])),
    required: USER_RESPONSE_FIELDS
  };
}
