---
name: vafs-devs
description: Build VAFS-first applications and agent integrations. Use when implementing OAuth, API, CLI, MCP, SDK, or AI-agent tool calls that connect an external app to VAFS.
---

# VAFS Developers

## Integration Contract

1. Treat VAFS as the user's permissioned knowledge/context layer.
2. Keep transactional app data in the application database.
3. Connect through OAuth and request the narrowest VAFS scopes needed.
4. Add agent tool calls only for actions the app is allowed to perform.
5. Preserve workspace IDs, source paths, and provenance in every write.
6. Do not store VAFS documents in the app database unless caching is explicit and expiring.

## Common Scopes

- `vafs.search`
- `vafs.read.pages`
- `vafs.write.raw`
- `vafs.write.knowledge`
- `vafs.sync.trigger`
- `vafs.admin.sources`
- `vafs.admin.integrations`

## Agent Tool Pattern

Expose tools that map directly to VAFS API/MCP capabilities:

- search context
- read page
- upload raw
- propose canonical write
- trigger sync

Sensitive tools should require confirmation in the host app.
