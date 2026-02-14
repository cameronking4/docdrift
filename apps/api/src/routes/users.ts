import { FastifyInstance } from "fastify";
import { AUTH_SCOPE_HEADER, AUTH_SCOPE_VALUE } from "../auth/policy";
import { buildUserSchema } from "../model";

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/v1/users/:id",
    {
      schema: {
        summary: "Get a user",
        params: {
          type: "object",
          properties: {
            id: { type: "string" }
          },
          required: ["id"]
        },
        headers: {
          type: "object",
          properties: {
            [AUTH_SCOPE_HEADER]: { type: "string", const: AUTH_SCOPE_VALUE }
          },
          required: [AUTH_SCOPE_HEADER]
        },
        response: {
          200: buildUserSchema()
        }
      }
    },
    async (request) => {
      const params = request.params as { id: string };
      return {
        id: params.id,
        name: "Ada Lovelace",
        email: "ada@datastack.dev"
      };
    }
  );
}
