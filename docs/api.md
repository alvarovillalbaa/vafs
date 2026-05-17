# API Reference
Last updated: 2026-05-17

## Auth

During local development, `VAFS_AUTH_REQUIRED=false` allows demo access. With auth required, callers must pass granted scopes through the bearer token integration; the temporary local gate also accepts `x-vafs-scopes`.

## Endpoints

| Endpoint | Purpose | Scope |
| --- | --- | --- |
| `GET /api/v1/workspaces` | List workspaces | session |
| `GET|POST /api/v1/search` | Hybrid retrieval | `vafs.search` |
| `GET /api/v1/files` | Read page | `vafs.read.pages` |
| `PUT /api/v1/files` | Propose canonical write | `vafs.write.knowledge` or `vafs.write.raw` |
| `POST /api/v1/raw` | Upload raw material | `vafs.write.raw` |
| `POST /api/v1/sync` | Queue sync/index | `vafs.sync.trigger` |
| `GET|POST /api/v1/cleanup-runs` | Inspect or start cleanup | read/write scopes |
| `GET|POST /api/v1/github/repos` | Discover or create agents-fs | `vafs.admin.sources` |
| `GET /api/v1/oauth/authorize` | OAuth authorization preview | public |
| `POST /api/v1/oauth/token` | OAuth token exchange stub | public |
| `GET|POST /api/mcp` | HTTP MCP-compatible JSON-RPC surface | tool-specific |

## MCP Tools

- `vafs_search`
- `vafs_get_page`
- `vafs_trigger_sync`
- `vafs_cleanup`
- `vafs_health`

## Write Responses

Write endpoints return a proposal containing:

- branch name
- proposed file
- pull request title/body
- write mode `branch_and_pull_request`

The API does not pretend the default branch has been mutated.
