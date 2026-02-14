import fs from "node:fs";
import path from "node:path";
import { buildUserSchema, buildUserListSchema } from "../src/model";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "DataStack API",
    version: "1.0.0",
  },
  paths: {
    "/v1/users/{id}": {
      get: {
        summary: "Get a user by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": { schema: buildUserSchema() },
            },
          },
        },
      },
    },
    "/v1/users": {
      get: {
        summary: "List users with pagination",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": { schema: buildUserListSchema() },
            },
          },
        },
      },
    },
  },
};

const outputPath = path.resolve("openapi/generated.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
