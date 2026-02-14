import fs from "node:fs";
import path from "node:path";
import { buildUserSchema } from "../src/model";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "DataStack API",
    version: "1.0.0"
  },
  paths: {
    "/v1/users/{id}": {
      get: {
        summary: "Get a user",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: buildUserSchema()
              }
            }
          }
        }
      }
    }
  }
};

const outputPath = path.resolve("openapi/generated.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
