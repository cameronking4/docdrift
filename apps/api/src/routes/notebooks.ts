import { FastifyInstance } from "fastify";
import { AUTH_SCOPE_HEADER } from "../auth/policy";
import {
  buildNotebookSchema,
  buildNotebookListSchema,
  buildErrorSchema,
} from "../model";

export async function registerNotebookRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get(
    "/v1/notebooks",
    {
      schema: {
        summary: "List notebooks",
        description:
          "Lists notebooks in the workspace. Supports path prefix and pagination.",
        tags: ["Notebooks"],
        querystring: {
          type: "object",
          properties: {
            pathPrefix: { type: "string", description: "Filter by path prefix" },
            limit: { type: "integer", default: 25 },
            offset: { type: "integer", default: 0 },
          },
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildNotebookListSchema(),
          403: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const q = request.query as { limit?: number; offset?: number };
      const limit = Math.min(100, Math.max(1, q.limit ?? 25));
      const offset = Math.max(0, q.offset ?? 0);
      return {
        notebooks: [
          { path: "/Workspace/ETL/daily_pipeline", language: "PYTHON", modifiedAt: "2024-03-09T18:00:00Z" },
          { path: "/Workspace/Reports/weekly", language: "PYTHON", modifiedAt: "2024-03-08T12:00:00Z" },
          { path: "/Workspace/Ad-hoc/explore", language: "SQL", modifiedAt: "2024-03-10T09:00:00Z" },
        ],
        totalCount: 3,
      };
    }
  );

  app.get(
    "/v1/notebooks/export",
    {
      schema: {
        summary: "Export notebook",
        description:
          "Exports a notebook at the given path in the requested format (SOURCE, HTML, JUPYTER).",
        tags: ["Notebooks"],
        querystring: {
          type: "object",
          properties: {
            path: { type: "string" },
            format: { type: "string", enum: ["SOURCE", "HTML", "JUPYTER"] },
          },
          required: ["path", "format"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildNotebookSchema(),
          404: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const q = request.query as { path: string; format: string };
      return {
        path: q.path,
        language: "PYTHON",
        format: (q.format || "SOURCE") as "SOURCE" | "HTML" | "JUPYTER",
        content: "# Databricks notebook source\n# MAGIC %md\n# Sample",
        createdAt: "2024-02-01T10:00:00Z",
        modifiedAt: "2024-03-09T18:00:00Z",
      };
    }
  );

  app.put(
    "/v1/notebooks",
    {
      schema: {
        summary: "Create or overwrite notebook",
        description: "Creates a new notebook or overwrites existing at path.",
        tags: ["Notebooks"],
        body: {
          type: "object",
          properties: {
            path: { type: "string" },
            language: { type: "string", enum: ["PYTHON", "SQL", "SCALA", "R"] },
            content: { type: "string" },
          },
          required: ["path", "language"],
        },
        headers: {
          type: "object",
          properties: { [AUTH_SCOPE_HEADER]: { type: "string" } },
          required: [AUTH_SCOPE_HEADER],
        },
        response: {
          200: buildNotebookSchema(),
          400: buildErrorSchema(),
        },
      },
    },
    async (request) => {
      const body = request.body as { path: string; language: string; content?: string };
      return {
        path: body.path,
        language: body.language as "PYTHON" | "SQL" | "SCALA" | "R",
        format: "SOURCE",
        content: body.content ?? "",
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };
    }
  );
}
