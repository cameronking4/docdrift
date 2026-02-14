---
sidebar_position: 3
---

# Billing and usage

DataStack usage is metered in **DataStack Billing Units (DBUs)** for compute and in **GB-months** for storage. This guide summarizes how usage is tracked and how to stay within limits.

## What counts toward usage

- **Compute**
  - Cluster node-hours (driver + workers) by node type
  - SQL warehouse run time by size (2X-Small through Large)
  - Job run duration
- **Storage**
  - Managed tables (Delta, etc.) in your workspace
  - Notebook and file storage
- **Data transfer**
  - Egress from the DataStack control plane and from clusters (varies by plan)

## DBU rates

DBU rates depend on the asset type and size. Examples (check the latest [pricing page](https://datastack.cloud/pricing) for your region):

- **Clusters**: Per node-hour by instance family (e.g. i3, r5).
- **SQL Warehouses**: Per hour by size (2X-Small, X-Small, Small, Medium, Large).
- **Jobs**: Billed as cluster or job run time; no separate job “scheduler” fee.

Auto-termination and stopping SQL warehouses when idle reduce cost. Use [Terminate cluster](/docs/api/terminate-cluster) and [Stop SQL warehouse](/docs/api/stop-sql-warehouse) when resources are no longer needed.

## Viewing usage

- **Console**: **Settings** → **Billing** → **Usage** for current period and history.
- **API**: Usage and billing APIs are available for enterprise plans; contact your account team for access.

## Quotas and limits

- **Rate limits**: See [Rate limits and quotas](/docs/guides/rate-limits-and-quotas).
- **Concurrent clusters / warehouses**: Plan-dependent; excess requests return `429` or a quota error.
- **Storage**: Per-workspace and per-account limits apply; see your contract or the console.

## Best practices

1. Set **auto-termination** on clusters to avoid idle cost.
2. **Stop** SQL warehouses when not in use.
3. Use **job clusters** for scheduled work instead of long-lived all-purpose clusters where possible.
4. Monitor usage in the console and set billing alerts if available for your plan.
