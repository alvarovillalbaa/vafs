# Agent Tools
Last updated: 2026-05-17

Agent tools should be small wrappers around VAFS capabilities.

Recommended tools:

- `search_vafs(query, workspace_id)`
- `get_vafs_page(workspace_id, path)`
- `upload_vafs_raw(workspace_id, filename, content)`
- `propose_vafs_write(workspace_id, path, content)`
- `trigger_vafs_sync(workspace_id)`

Write tools should preserve provenance and use confirmation when the host app can mutate user knowledge.
