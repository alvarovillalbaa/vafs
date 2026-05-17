---
name: vafs-use
description: Use VAFS as an AFS-compliant knowledge infrastructure layer through MCP, CLI, or API. Use when searching, reading, writing, syncing, permissioning, cleaning, or integrating agents-fs knowledge through VAFS.
---

# VAFS Use

## Core Rules

1. Identify the active VAFS workspace before reading or writing.
2. Check access scope before using any VAFS operation.
3. Search canonical knowledge before raw sources.
4. Use VAFS MCP first, CLI second, API third.
5. Use local file fallback only for trusted private checkouts.
6. Preserve provenance on every write.
7. Trigger or verify sync after material changes.
8. Never bypass VAFS when access control, audit trail, or integration consistency matters.

## Tool Order

- MCP: `vafs_search`, `vafs_get_page`, `vafs_upload_raw`, `vafs_trigger_sync`, `vafs_cleanup`.
- CLI: `vafs search`, `vafs get`, `vafs raw upload`, `vafs sync`, `vafs cleanup`.
- API: use `/api/v1/*` when remote access or app integration is required.

## Writeback

- Put unprocessed sources in `raw/`.
- Put durable current knowledge in `knowledge/`, `references/`, `runbooks/`, or another AFS canonical path.
- Prefer updating existing canonical pages over creating duplicates.
- Cleanup work must use branch and pull request writeback.

## Templates

Use `assets/agents-fs-template/` when creating a new `agents-fs` repository.
