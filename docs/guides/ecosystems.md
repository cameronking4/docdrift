# Ecosystem Guides

Docdrift supports multiple ecosystems. Here are focused greenfield demos for different providers.

## 1. OpenAPI3 + Node/Express (default)

- **API:** Express + swagger-jsdoc or @nestjs/swagger → `openapi/generated.json`
- **Docs:** Docusaurus + docusaurus-plugin-openapi-docs, or simple Markdown
- **Flow:** Change a route or schema, run `openapi:export`, drift vs published spec, Devin fixes docs

## 2. OpenAPI3 + FastAPI (Python)

- **API:** FastAPI with OpenAPI export (`openapi.json` or `npm run openapi:export` script)
- **Docs:** MkDocs + mkdocstrings or mkdocs-openapi
- **Flow:** Add/change endpoints, regenerate spec, drift detected, Devin updates MkDocs docs

## 3. Fern

- **Layout:** `definition/` (API), `pages/` (MDX), `generators.yml`
- **Config:** `specProviders` with `format: fern` and path mappings from `definition/**` to `pages/**`
- **Flow:** Change Fern API definitions, docs drift, Devin updates guides and API reference

## 4. GraphQL

- **API:** Schema-first or code-first (e.g. Apollo, Pothos)
- **Docs:** Docusaurus/GraphQL plugin or schema docs in Markdown
- **Config:** `format: graphql` with schema export command
- **Flow:** Update schema, regenerate, Devin syncs docs with new types/resolvers

## 5. Mintlify

- **Layout:** `docs/` (MDX), `mint.json`, OpenAPI for API reference
- **Config:** Path mappings from `api/**` and `src/**` to `docs/**`
- **Flow:** Change backend/API, Mintlify docs drift, Devin patches guides and reference

## 6. Postman Collection

- **API:** Postman collection JSON as source of truth
- **Config:** `format: postman` with export or copy command
- **Flow:** Collection changes, Devin keeps external docs or README in sync

## 7. Swagger2 / OpenAPI 2

- **API:** Old Swagger 2.0 (`swagger: "2.0"`)
- **Config:** `format: swagger2` with export path
- **Flow:** Same as OpenAPI3, with legacy spec format

## 8. Monorepo (multiple packages)

- **Layout:** `packages/api/`, `packages/sdk-ts/`, `docs/` or `apps/docs-site/`
- **Config:** Path mappings per package (`packages/api/**` → `docs/api/**`, etc.)
- **Flow:** Change API or SDK, Devin updates matching doc sections

## Suggested demo order

1. **OpenAPI3 + Docusaurus** — Matches the current docdrift repo, minimal setup.
2. **FastAPI + MkDocs** — Good Python example.
3. **Fern** — Structured API-defs + docs layout, common for API platforms.
4. **GraphQL** — Different spec format and doc tooling.
