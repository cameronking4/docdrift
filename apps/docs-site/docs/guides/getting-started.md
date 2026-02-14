---
sidebar_position: 1
---

# Getting started with DataStack

DataStack is a unified analytics and data platform. This guide gets you from sign-up to your first query.

## Prerequisites

- A DataStack account (sign up at [datastack.cloud](https://datastack.cloud))
- Your workspace URL (e.g. `https://acme.datastack.cloud`)
- An API token or OAuth access (see [Authentication](/docs/guides/authentication))

## Step 1: Create a workspace

Workspaces are isolated environments for your data, compute, and users.

1. In the DataStack console, go to **Workspaces** and click **Create workspace**.
2. Choose a region and name (e.g. `Production`).
3. After creation, note your workspace URL and workspace ID for API calls.

Use the [List workspaces](/docs/api/list-workspaces) and [Get workspace by ID](/docs/api/get-workspace-by-id) APIs to manage workspaces programmatically.

## Step 2: Configure compute

- **Clusters**: Spark clusters for notebooks and ad-hoc jobs. Create via [Create cluster](/docs/api/create-cluster) or the UI.
- **SQL Warehouses**: Serverless SQL for BI and ad-hoc queries. Start from the UI or [List SQL warehouses](/docs/api/list-sql-warehouses) and [Start SQL warehouse](/docs/api/start-sql-warehouse).

Start with a small cluster or a 2X-Small SQL warehouse for development.

## Step 3: Run your first job

Create a notebook (Python, SQL, or Scala) in the workspace, then define a [Job](/docs/api/list-jobs) that runs it on a schedule or on demand. Use [Trigger job run](/docs/api/trigger-job-run) to run a job immediately via the API.

## Step 4: Call the API

All API requests require authentication. Set the `Authorization: Bearer <token>` header and the `x-datastack-scope` header as described in [Authentication](/docs/guides/authentication).

Example: list clusters

```bash
curl -H "Authorization: Bearer $TOKEN" \
     -H "x-datastack-scope: read:clusters" \
     "https://api.datastack.cloud/v1/clusters?workspaceId=ws-001"
```

## Next steps

- [Authentication](/docs/guides/authentication) — Tokens, scopes, and SSO
- [Billing and usage](/docs/guides/billing-and-usage) — DBUs, storage, and limits
- [Security best practices](/docs/guides/security-best-practices) — Network, secrets, and audit
