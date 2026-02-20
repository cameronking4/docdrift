# DocDrift custom instructions

- **PR titles:** Prefix all docdrift PR titles with `[docdrift]`.
- **Tone:** Write in a clear, concise, developer-friendly tone consistent with the existing documentation style.
- **Commit messages:** Use conventional commit format, e.g. `docs: update API reference for new endpoints`.
- **Scope:** Focus on keeping the Mintlify docs (`docs/`) and Docusaurus docs site (`apps/docs-site/`) in sync with the source code and OpenAPI spec.
- **OpenAPI:** When the exported spec (`openapi/generated.json`) diverges from the published spec (`apps/docs-site/openapi/openapi.json`), update the published spec and any affected API reference pages.
- **Guides:** When code in `src/` or `apps/api/` changes, review and update related guides under `docs/guides/`.
- **Do not modify:** Source code files, test files, CI workflows, or package configuration. Only documentation and OpenAPI spec files.
