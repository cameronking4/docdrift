---
sidebar_position: 4
---

# Security best practices

DataStack is built for enterprise security. Follow these practices to keep your data and access secure.

## Network and access

- **Private connectivity**: Use VPC peering or PrivateLink (where available) so that clusters and warehouses do not need public IPs.
- **IP access lists**: Restrict workspace and API access by IP where supported.
- **Firewall**: Allow only required endpoints (e.g. `api.datastack.cloud`, `*.datastack.cloud`) and block unnecessary egress from your network.

## Authentication and secrets

- **Tokens**: Prefer OAuth with your IdP over long-lived personal access tokens. Rotate PATs regularly and never commit them to repos.
- **Scopes**: Use the minimum scope required per request (e.g. `read:clusters` instead of broad admin scopes) and enforce least privilege in your IdP.
- **Secrets**: Store API tokens and credentials in a secrets manager (e.g. HashiCorp Vault, AWS Secrets Manager). Use [secret scopes](https://docs.datastack.cloud/security/secrets.html) in the workspace for notebook and job secrets instead of hardcoding.

## Data and encryption

- **Encryption at rest**: DataStack encrypts managed data at rest; no extra configuration required.
- **Encryption in transit**: All API and UI traffic uses TLS. Do not disable certificate verification in clients.
- **Data residency**: Choose workspace regions that meet your compliance requirements.

## Audit and compliance

- **Audit logs**: Enable and retain audit logs for workspace and API activity. Use them to detect anomalous access and satisfy compliance.
- **Access reviews**: Periodically review users, tokens, and scope assignments; remove or narrow access that is no longer needed.
- **Compliance**: DataStack supports common frameworks (e.g. SOC 2, HIPAA on eligible plans). Confirm controls with your account team and our [Trust Center](https://trust.datastack.cloud).

## API-specific

- Use **HTTPS only** for all API calls.
- Validate **response signatures** or use official SDKs where we provide them.
- Respect **rate limits** and use exponential backoff to avoid abuse flags.

For more, see [Authentication](/docs/guides/authentication) and [Rate limits and quotas](/docs/guides/rate-limits-and-quotas).
