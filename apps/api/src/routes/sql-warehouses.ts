import { FastifyInstance } from "fastify";
import { AUTH_SCOPE_HEADER } from "../auth/policy";
import {
  buildSqlWarehouseSchema,
  buildSqlWarehouseListSchema,
  buildErrorSchema,
} from "../model";

export async function registerSqlWarehouseRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get(
    "/v1/sql/warehouses",
    {
      schema: {
        summary: "List SQL warehouses",
        description:
          "Lists all SQL warehouses (formerly SQL endpoints) in the workspace.",
        tags: ["SQL Warehouses"],
        querystring: {
          type: "object",
          properties: {
            workspaceId: { type: "string" },
            state: {
              type: "string",
              enum: ["STARTING", "RUNNING", "STOPPING", "STOPPED", "DELETED"],
            },
            page: { type: "integer", default: 1 },
            pageSize: { type: "integer", default: 25 },
          },
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildSqlWarehouseListSchema(),
          403: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const q = request.query as { page?: number; pageSize?: number };
      const page = Math.max(1, q.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 25));
      return {
        warehouses: [
          {
            id: "wh-001",
            name: "BI Warehouse",
            clusterSize: "Small",
            state: "RUNNING",
            jdbcUrl: "jdbc:datastack:sql://wh-001.us-west-2.datastack.cloud:443",
            odbcUrl: "Driver={DataStack};Server=wh-001.us-west-2.datastack.cloud;Port=443",
            createdAt: "2024-01-20T10:00:00Z",
          },
          {
            id: "wh-002",
            name: "Ad-hoc SQL",
            clusterSize: "2X-Small",
            state: "STOPPED",
            jdbcUrl: "jdbc:datastack:sql://wh-002.us-west-2.datastack.cloud:443",
            odbcUrl: "Driver={DataStack};Server=wh-002.us-west-2.datastack.cloud;Port=443",
            createdAt: "2024-02-05T14:00:00Z",
          },
        ],
        totalCount: 2,
      };
    }
  );

  app.get(
    "/v1/sql/warehouses/{warehouseId}",
    {
      schema: {
        summary: "Get SQL warehouse by ID",
        description: "Returns configuration and connection URLs for a warehouse.",
        tags: ["SQL Warehouses"],
        params: {
          type: "object",
          properties: { warehouseId: { type: "string" } },
          required: ["warehouseId"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildSqlWarehouseSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { warehouseId: string };
      return {
        id: params.warehouseId,
        name: "BI Warehouse",
        clusterSize: "Small",
        state: "RUNNING",
        jdbcUrl: `jdbc:datastack:sql://${params.warehouseId}.us-west-2.datastack.cloud:443`,
        odbcUrl: `Driver={DataStack};Server=${params.warehouseId}.us-west-2.datastack.cloud;Port=443`,
        createdAt: "2024-01-20T10:00:00Z",
      };
    }
  );

  app.post(
    "/v1/sql/warehouses/{warehouseId}/start",
    {
      schema: {
        summary: "Start SQL warehouse",
        description: "Starts a stopped warehouse. Billing begins when running.",
        tags: ["SQL Warehouses"],
        params: {
          type: "object",
          properties: { warehouseId: { type: "string" } },
          required: ["warehouseId"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildSqlWarehouseSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { warehouseId: string };
      return {
        id: params.warehouseId,
        name: "Ad-hoc SQL",
        clusterSize: "2X-Small",
        state: "STARTING",
        jdbcUrl: `jdbc:datastack:sql://${params.warehouseId}.us-west-2.datastack.cloud:443`,
        odbcUrl: `Driver={DataStack};Server=${params.warehouseId}.us-west-2.datastack.cloud;Port=443`,
        createdAt: "2024-02-05T14:00:00Z",
      };
    }
  );

  app.post(
    "/v1/sql/warehouses/{warehouseId}/stop",
    {
      schema: {
        summary: "Stop SQL warehouse",
        description: "Stops a running warehouse. Billing stops when stopped.",
        tags: ["SQL Warehouses"],
        params: {
          type: "object",
          properties: { warehouseId: { type: "string" } },
          required: ["warehouseId"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildSqlWarehouseSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const params = request.params as { warehouseId: string };
      return {
        id: params.warehouseId,
        name: "BI Warehouse",
        clusterSize: "Small",
        state: "STOPPING",
        jdbcUrl: `jdbc:datastack:sql://${params.warehouseId}.us-west-2.datastack.cloud:443`,
        odbcUrl: `Driver={DataStack};Server=${params.warehouseId}.us-west-2.datastack.cloud;Port=443`,
        createdAt: "2024-01-20T10:00:00Z",
      };
    }
  );
}
