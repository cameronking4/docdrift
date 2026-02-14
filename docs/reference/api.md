# API Reference

## GET /v1/users/{id}
Returns a user by ID.

Response body fields:
- `id`: string
- `fullName`: string
- `email`: string
- `avatarUrl`: string
- `createdAt`: string
- `role`: string

## GET /v1/users
List users with pagination.

Query parameters:
- `page`: integer (default: 1)
- `limit`: integer (default: 20)

Response body fields:
- `users`: array of user objects
- `totalCount`: number
