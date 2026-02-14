#!/usr/bin/env node
/**
 * Generates docdrift.schema.json from the Zod schema for IDE autocomplete/validation.
 * Run: npm run schema:generate (also runs automatically before build).
 *
 * Keeps docdrift.schema.json in sync with src/config/schema.ts — single source of truth.
 */
import * as fs from "fs";
import * as path from "path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { docDriftConfigBaseSchema } from "../src/config/schema";

const jsonSchema = zodToJsonSchema(docDriftConfigBaseSchema, {
  target: "jsonSchema7",
  $refStrategy: "none",
});

const output = {
  $schema: "https://json-schema.org/draft-07/schema#",
  $id: "https://github.com/devinnn/docdrift/docdrift.schema.json",
  title: "DocDrift Configuration",
  description:
    "Repository-local config for docdrift (detect and remediate documentation drift with Devin). See docdrift-yml.md for full reference.",
  ...jsonSchema,
};

const outPath = path.resolve(__dirname, "..", "docdrift.schema.json");
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf-8");
console.log(`[docdrift] Wrote ${outPath}`);
