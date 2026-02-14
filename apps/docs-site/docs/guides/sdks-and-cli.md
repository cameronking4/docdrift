---
sidebar_position: 5
---

# SDKs and CLI

DataStack provides official SDKs and a CLI so you can automate workspace management, jobs, and data operations without calling the REST API directly.

## Official SDKs

| Language | Package | Repo / docs |
|----------|---------|-------------|
| Python | `datastack-sdk` | [PyPI](https://pypi.org/project/datastack-sdk/) — install: `pip install datastack-sdk` |
| TypeScript/Node | `@datastack/sdk` | [npm](https://www.npmjs.com/package/@datastack/sdk) — install: `npm i @datastack/sdk` |

Both SDKs support the same operations as the REST API: workspaces, clusters, jobs, notebooks, and SQL warehouses. Authentication is via environment variables (`DATASTACK_HOST`, `DATASTACK_TOKEN`) or explicit config.

### Python example

```python
from datastack_sdk import WorkspaceClient

client = WorkspaceClient()
clusters = client.clusters.list()
for c in clusters:
    print(c.name, c.state)
```

### TypeScript example

```typescript
import { DataStackClient } from "@datastack/sdk";

const client = new DataStackClient({ token: process.env.DATASTACK_TOKEN });
const { clusters } = await client.clusters.list();
clusters.forEach((c) => console.log(c.name, c.state));
```

## DataStack CLI

The DataStack CLI is a single binary for scripting and CI/CD.

- **Install**: Download from [releases](https://github.com/datastack/cli/releases) or `brew install datastack/tap/datastack` (macOS).
- **Auth**: `datastack auth login` (browser) or `datastack auth set-token <token>`.
- **Examples**:
  - `datastack clusters list`
  - `datastack jobs run --job-id 1001`
  - `datastack sql warehouse start --id wh-001`

CLI commands map to the same REST endpoints documented in the [API reference](/docs/api/datastack-api).

## Using the REST API directly

When an SDK or CLI is not available, use the [REST API](/docs/api/datastack-api) with `Authorization: Bearer <token>` and the required `x-datastack-scope` header. See [Authentication](/docs/guides/authentication) for details.

## API versioning

The API version is in the path (e.g. `/v1/...`). We add new fields and endpoints in a backward-compatible way; breaking changes are announced and versioned. Prefer the latest stable `v1` base path unless you need a specific version.
