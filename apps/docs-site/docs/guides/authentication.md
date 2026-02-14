---
sidebar_position: 2
---

# Authentication

DataStack APIs use token-based authentication. This guide covers personal access tokens, OAuth, and scopes.

## Required headers

| Header | Description |
|--------|-------------|
| `Authorization` | `Bearer <token>` — Your API token or OAuth access token. |
| `x-datastack-scope` | Scope required for the operation (e.g. `read:users`, `manage:clusters`). |

Example:

```http
GET /v1/clusters HTTP/1.1
Host: api.datastack.cloud
Authorization: Bearer dapi1234567890abcdef
x-datastack-scope: read:clusters
```

## Personal access tokens (PATs)

1. In the DataStack UI: **Settings** → **Developer** → **Access tokens**.
2. Click **Generate new token** and give it a label and optional lifetime.
3. Copy the token once; it is not shown again.
4. Use it as the `Authorization: Bearer <token>` value.

Rotate tokens periodically and avoid committing them to source control. Use environment variables or a secrets manager in CI.

## OAuth 2.0 (SSO and IdP)

DataStack supports OAuth 2.0 for single sign-on and identity providers (Okta, Azure AD, etc.).

- **Authorization URL**: `https://accounts.datastack.cloud/oauth2/authorize`
- **Token URL**: `https://accounts.datastack.cloud/oauth2/token`
- **Scopes**: Request the scopes your app needs (e.g. `all-apis` or fine-grained scopes).

Configure your IdP to issue tokens with the correct audience (`https://api.datastack.cloud`) and scopes. Use the access token in the `Authorization` header the same way as a PAT.

## Scopes

Operations are gated by scope. Send the required scope in `x-datastack-scope` for each request.

| Scope | Typical use |
|-------|-------------|
| `read:users` | List and get users (Identity & Access). |
| `read:workspaces`, `manage:workspaces` | Workspace list and details. |
| `read:clusters`, `manage:clusters` | Clusters list, get, create, terminate. |
| `read:jobs`, `manage:jobs` | Jobs and runs. |
| `read:notebooks`, `manage:notebooks` | Notebooks list, export, create. |
| `read:sql`, `manage:sql` | SQL warehouses list, get, start, stop. |

If the token does not have the required scope, the API returns `403 Forbidden`.

## Token lifetime and rotation

- PATs can have an expiration; expired tokens return `401 Unauthorized`.
- For OAuth, use the refresh token to obtain a new access token before it expires.
- We recommend rotating PATs at least every 90 days and immediately if compromise is suspected.

## Errors

| HTTP | Meaning |
|------|---------|
| 401 | Missing or invalid token. Check `Authorization` and token validity. |
| 403 | Token valid but missing required scope. Add the correct `x-datastack-scope` or use a token with that scope. |
