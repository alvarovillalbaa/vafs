---
name: vafs-use
description: Reference the historical VAFS prototype and its maintained AFS export template under explicit task authority; the virtual filesystem layer is cancelled.
---

# VAFS Use

The virtual filesystem layer is cancelled. This package retains historical operation references and an existing AFS scaffold. Do not announce, roadmap, activate, or develop that layer. Use the canonical AFS standard for workspace semantics; legacy raw API/MCP behavior is not a private Drive integration.

## Core Rules

1. Identify the active VAFS workspace before reading or writing.
2. Check access scope before using any VAFS operation.
3. Search maintained knowledge and SOURCES.md before consulting preserved source artifacts.
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

- Preserve unprocessed inputs in the correct private Drive; verify a recoverable copy before deleting original bytes.
- Put unique generalized synthesis in `knowledge/`; operational procedures belong in `cookbooks/` or `runbooks/`.
- Catalog references in REFERENCES.md and provenance/capture status in SOURCES.md. Record unresolved understanding in GAPS.md.
- Define continuous research in `research/<unit>/README.md` with ordered questions, hypotheses, reasoning, method, evidence and status.
- Use `YYYY/MM-DD/` for evidence and at most two lines per log entry. Specs, facts and decisions remain living; goals belong in Notion and link from ROADMAP.md.
- Prefer updating existing canonical pages over creating duplicates.
- Cleanup work must use branch and pull request writeback.

## Templates

The existing `assets/agents-fs-template/` holds the maintained standalone AFS scaffold beside the content this skill exports. Its Markdown bytes must match the runtime template in `lib/vafs/afs-contract.ts`.
