# OAuth Integration
Last updated: 2026-05-17

Use VAFS OAuth for third-party app access.

Minimum integration flow:

1. Register OAuth client in VAFS.
2. Redirect user to `/api/v1/oauth/authorize`.
3. Request only required scopes.
4. Exchange code at `/api/v1/oauth/token`.
5. Store access and refresh tokens securely.
6. Call VAFS API with bearer token.
7. Add agent tools that enforce the same scopes.
