---
sidebar_position: 8
---

# Support and SLA

DataStack offers tiered support and SLAs so you can align service levels with your use case.

## Support plans

| Plan | Scope | Response (target) |
|------|--------|-------------------|
| **Standard** | Documentation, community, and in-product help. | Best effort. |
| **Premium** | Email and in-app ticket; designated support contacts. | P1 &lt; 4 h, P2 &lt; 8 h, P3 &lt; 24 h (business hours). |
| **Enterprise** | Dedicated CSM, phone, and optional 24/7. | P1 &lt; 1 h; 24/7 for critical severity. |

Severity definitions (P1 = critical/down, P2 = major impact, P3 = minor/question). Exact targets are in your contract.

## Opening a case

- **Console**: **Help** → **Support** → **New case**. Attach logs, workspace ID, and job/run IDs when relevant.
- **Email**: support@datastack.cloud (Premium/Enterprise).
- **API issues**: Include request ID (from response headers), endpoint, token scope, and a minimal repro.

## SLA (availability)

- **Enterprise** plans include an uptime SLA (e.g. 99.9% or 99.95% for the control plane and API). Credits and exclusions are defined in your agreement.
- **Standard** and **Premium** are best-effort availability unless otherwise agreed.

## Status and incidents

- **Status page**: [status.datastack.cloud](https://status.datastack.cloud) for platform and API status.
- **Incidents**: We post updates and root cause summaries on the status page and, for Enterprise, via your designated channels.

## Resources

- [API reference](/docs/api/datastack-api) for endpoints and errors.
- [Authentication](/docs/guides/authentication) and [Rate limits](/docs/guides/rate-limits-and-quotas) for common “not working” causes (wrong token, scope, or 429).
