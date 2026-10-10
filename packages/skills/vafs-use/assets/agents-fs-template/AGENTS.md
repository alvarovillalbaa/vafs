# AGENTS.md
Last updated: 2026-10-10

This repository is an AFS-compatible agents-fs workspace.

## Operating Rules

- Search maintained knowledge and its references before consulting source artifacts.
- Preserve source identity, URLs, dates, status, and authors when available in SOURCES.md.
- Keep raw inputs and copied artifacts in the correct private Google Drive; verify a recoverable copy before removing original bytes.
- Keep unique generalized knowledge and perspectives in knowledge/; operations belong in cookbooks/ or runbooks/.
- Define continuous research in research/<unit>/README.md with ordered questions, hypotheses, reasoning, method, evidence, and status.
- Use YYYY/MM-DD/ for logs, lessons, fixes, audits, plans, and results; each log entry is at most two lines.
- Keep facts/<domain>/, decisions/, specs/, cookbooks/, knowledge/, runbooks/, and research/ living without date directories.
- Folder docs: core README.md/ARCHITECTURE.md/TESTS.md; conditional SETUP.md/CHANGELOG.md/SECURITY.md; rare OVERVIEW.md/FAQ.md/DEPENDENCIES.md. Procedures and decisions use their topic folders, with no folder-level RUNBOOK.md or DECISIONS.md.
- Goals belong in canonical Notion and link from ROADMAP.md; templates stay beside generated content.
- REFERENCES.md catalogs links and owner guides; GAPS.md records unresolved understanding.
- Use branch and pull request writeback when authorized; never infer permission to merge or publish.
