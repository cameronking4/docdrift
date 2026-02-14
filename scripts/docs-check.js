#!/usr/bin/env node
const fs = require("node:fs");

const files = ["docs/reference/api.md", "docs/reference/openapi.json", "docs/guides/auth.md"];

const missing = files.filter((p) => !fs.existsSync(p));
if (missing.length) {
  console.error(`Missing docs files: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Docs check passed");
