import { FastifyInstance } from "fastify";
import { AUTH_SCOPE_HEADER } from "../auth/policy";
import {
  buildWebhookSchema,
  buildWebhookListSchema,
  buildWebhookDeliverySchema,
  buildErrorSchema,
} from "../model";

export async function registerWebhookRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get(
    "/v1/webhooks",
    {
      schema: {
        summary: "List webhooks",
        description: "Lists all registered webhooks for the account.",
        tags: ["Webhooks"],
        querystring: {
          type: "object",
          properties: {
            active: { type: "boolean" },
            event: { type: "string" },
          },
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildWebhookListSchema(),
          403: buildErrorSchema(),
        },
      },
    },
    async () => {
      return {
        webhooks: [
          {
            id: "wh-001",
            url: "https://example.com/hooks/datastack",
            events: ["job.completed", "job.failed", "cluster.terminated"],
            active: true,
            createdAt: "2024-03-01T09:00:00Z",
            updatedAt: "2024-05-15T10:00:00Z",
            lastTriggeredAt: "2024-06-10T02:15:33Z",
            failureCount: 0,
          },
        ],
        totalCount: 1,
      };
    }
  );

  app.post(
    "/v1/webhooks",
    {
      schema: {
        summary: "Create webhook",
        description: "Registers a new webhook endpoint.",
        tags: ["Webhooks"],
        body: {
          type: "object",
          properties: {
            url: { type: "string", format: "uri" },
            events: { type: "array", items: { type: "string" } },
            secret: { type: "string" },
            active: { type: "boolean" },
          },
          required: ["url", "events"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          201: buildWebhookSchema(),
          400: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const body = request.body as {
        url: string;
        events: string[];
        secret?: string;
        active?: boolean;
      };
      return {
        id: "wh-new",
        url: body.url,
        events: body.events,
        secret: body.secret ?? undefined,
        active: body.active ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        failureCount: 0,
      };
    }
  );

  app.get(
    "/v1/webhooks/{webhookId}",
    {
      schema: {
        summary: "Get webhook by ID",
        description: "Returns configuration and status for a single webhook.",
        tags: ["Webhooks"],
        params: {
          type: "object",
          properties: { webhookId: { type: "string" } },
          required: ["webhookId"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildWebhookSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { webhookId: string };
      return {
        id: params.webhookId,
        url: "https://example.com/hooks/datastack",
        events: ["job.completed", "job.failed"],
        active: true,
        createdAt: "2024-03-01T09:00:00Z",
        updatedAt: "2024-05-15T10:00:00Z",
        lastTriggeredAt: "2024-06-10T02:15:33Z",
        failureCount: 0,
      };
    }
  );

  app.patch(
    "/v1/webhooks/{webhookId}",
    {
      schema: {
        summary: "Update webhook",
        description: "Updates webhook configuration.",
        tags: ["Webhooks"],
        params: {
          type: "object",
          properties: { webhookId: { type: "string" } },
          required: ["webhookId"],
        },
        body: {
          type: "object",
          properties: {
            url: { type: "string", format: "uri" },
            events: { type: "array", items: { type: "string" } },
            secret: { type: "string" },
            active: { type: "boolean" },
          },
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildWebhookSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { webhookId: string };
      return {
        id: params.webhookId,
        url: "https://example.com/hooks/datastack",
        events: ["job.completed", "job.failed"],
        active: true,
        createdAt: "2024-03-01T09:00:00Z",
        updatedAt: new Date().toISOString(),
        failureCount: 0,
      };
    }
  );

  app.delete(
    "/v1/webhooks/{webhookId}",
    {
      schema: {
        summary: "Delete webhook",
        description: "Removes a registered webhook.",
        tags: ["Webhooks"],
        params: {
          type: "object",
          properties: { webhookId: { type: "string" } },
          required: ["webhookId"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
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

  app.post(
    "/v1/webhooks/{webhookId}/test",
    {
      schema: {
        summary: "Test webhook",
        description: "Sends a test payload to the webhook URL.",
        tags: ["Webhooks"],
        params: {
          type: "object",
          properties: { webhookId: { type: "string" } },
          required: ["webhookId"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildWebhookDeliverySchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { webhookId: string };
      return {
        id: "del-test-001",
        webhookId: params.webhookId,
        event: "test.ping",
        requestUrl: "https://example.com/hooks/datastack",
        responseStatus: 200,
        success: true,
        duration: 120,
        timestamp: new Date().toISOString(),
      };
    }
  );

  app.get(
    "/v1/webhooks/{webhookId}/deliveries",
    {
      schema: {
        summary: "List webhook deliveries",
        description: "Returns recent delivery attempts for a webhook.",
        tags: ["Webhooks"],
        params: {
          type: "object",
          properties: { webhookId: { type: "string" } },
          required: ["webhookId"],
        },
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", default: 25 },
            success: { type: "boolean" },
          },
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: {
            type: "object",
            properties: {
              deliveries: { type: "array", items: buildWebhookDeliverySchema() },
              totalCount: { type: "number" },
            },
            required: ["deliveries", "totalCount"],
          },
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { webhookId: string };
      return {
        deliveries: [
          {
            id: "del-001",
            webhookId: params.webhookId,
            event: "job.completed",
            requestUrl: "https://example.com/hooks/datastack",
            responseStatus: 200,
            success: true,
            duration: 85,
            timestamp: "2024-06-10T02:15:33Z",
          },
        ],
        totalCount: 1,
      };
    }
  );
}
