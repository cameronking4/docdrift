---
sidebar_position: 6
---

# Rate limits and quotas

DataStack APIs are rate-limited to ensure fair use and platform stability. This guide describes limits and how to handle them.

## Rate limits

- **REST API**: Limits are per token (and per workspace where applicable). Typical baseline is on the order of hundreds to thousands of requests per minute per token; exact numbers depend on the endpoint and your plan.
- **Responses**: When you exceed a limit, the API returns **HTTP 429 Too Many Requests**. The response may include a `Retry-After` header (seconds) or a `X-RateLimit-Reset`-style header indicating when the window resets.

## Best practices

1. **Back off**: On 429, wait at least the `Retry-After` period (or a few seconds if not present) before retrying.
2. **Exponential backoff**: Increase wait time after repeated 429s (e.g. 1s, 2s, 4s, …) and cap the delay.
3. **Batch where possible**: Prefer list or batch endpoints instead of many single-resource calls (e.g. list clusters once and filter client-side).
4. **Cache**: Cache stable data (e.g. workspace list, cluster config) for a short TTL to reduce API calls.
5. **Concurrency**: Limit concurrent requests per process; use a connection pool or queue if you run many jobs in parallel.

## Quotas

Besides per-minute rate limits, your plan may enforce:

- **Concurrent clusters** per workspace or account
- **Concurrent SQL warehouses** per workspace
- **Job runs** per day or per job
- **Storage** per workspace (GB)

Exceeding a quota usually returns **403** or **429** with a message indicating the quota (e.g. “cluster limit reached”). Reduce usage or request a quota increase through support or your account team.

## Checking limits

Response headers may include:

- `X-RateLimit-Limit`: Max requests in the current window
- `X-RateLimit-Remaining`: Remaining requests in the window
- `X-RateLimit-Reset`: Time when the window resets

Use these when available to throttle before hitting 429. Official SDKs can optionally respect these headers automatically.
