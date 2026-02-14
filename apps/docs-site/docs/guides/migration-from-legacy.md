---
sidebar_position: 7
---

# Migration from legacy platforms

If you are moving from an older data platform (on-prem Hadoop, legacy ETL, or a previous cloud offering), this guide outlines how to map concepts to DataStack and use the API to automate migration.

## Concept mapping

| Legacy concept | DataStack equivalent |
|----------------|----------------------|
| Cluster / YARN | [Clusters](/docs/api/list-clusters) (Spark); create and manage via API. |
| Scheduled job | [Jobs](/docs/api/list-jobs) with schedule or [Trigger job run](/docs/api/trigger-job-run). |
| Notebook / Zeppelin | [Notebooks](/docs/api/list-notebooks); export/import via [Export notebook](/docs/api/export-notebook) and create with [Create or overwrite notebook](/docs/api/create-or-overwrite-notebook). |
| Hive / Presto warehouse | [SQL Warehouses](/docs/api/list-sql-warehouses); connect via JDBC/ODBC URLs from the API. |
| Workspace / tenant | [Workspaces](/docs/api/list-workspaces); one workspace per team or environment. |

## Migration steps

1. **Create workspaces**: Use [List workspaces](/docs/api/list-workspaces) and create target workspaces in the desired regions.
2. **Move identity**: Sync users and groups from your IdP; use SCIM or the Identity & Access APIs where available. See [Authentication](/docs/guides/authentication).
3. **Migrate code and notebooks**: Export notebooks/jobs from the legacy system, then create or update them in DataStack via the [Notebooks](/docs/api/create-or-overwrite-notebook) and [Jobs](/docs/api/list-jobs) APIs. Adjust paths and cluster config as needed.
4. **Migrate data**: Use your existing ETL or DataStack jobs to read from the legacy store and write into DataStack tables (e.g. Delta). The API does not replace bulk data copy; use jobs and clusters for that.
5. **Recreate schedules**: Define [Jobs](/docs/api/list-jobs) with the same schedule (cron) and dependencies as before; trigger once via [Trigger job run](/docs/api/trigger-job-run) to validate.
6. **Switch consumers**: Point BI tools and applications at DataStack SQL warehouses (JDBC/ODBC from [Get SQL warehouse by ID](/docs/api/get-sql-warehouse-by-id)) and deprecate the legacy endpoints.

## API-driven automation

Use the REST API or [SDKs](/docs/guides/sdks-and-cli) to script workspace creation, cluster config, job definitions, and notebook creation so that your migration is repeatable and auditable. Combine with CI/CD to promote config from dev to staging to production.

## Support

For large or complex migrations, contact your DataStack account team or [Support](/docs/guides/support-and-sla) for guidance and optional migration tooling.
