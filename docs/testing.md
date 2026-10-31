# Testing
Last updated: 2026-10-31

## Current Gates

```bash
npm run lint
npm run typecheck
npm run test
```

`npm run test` currently validates that the required VAFS surfaces exist and that README documents the public route contract.

## Focused Local Verification

The [local reader CI receipt](results/2026/10-31/local-reader-ci-checks.md)
records **63/63 passing cases** on Ubuntu 24.04, Node 26.13.0 and ripgrep
14.1.0, using the signed Ubuntu package `14.1.0-1`. Exact source/name guards,
real file/rg/CLI behavior, atomic outputs and the Linux owned-descendant
deadline case passed. The [earlier macOS result](results/2026/10-31/local-reader-checks.md)
remains 62/63: its process-inspection case received `ps` EPERM. The Linux pass
does not establish that missing macOS permission.

The separate [local MCP receipt](https://github.com/alvarovillalbaa/vafs/blob/d6888b7ab92cc17630858831879453402397b91e/docs/results/2026/10-31/local-mcp-checks.md)
records **34/34 passing cases** on macOS, Node 26.8.2 and rg 15.2.0, including
actual authored file reads and in-memory protocol/stream boundaries. Neither
scope uses a private corpus. All selected implementation/test bytes stayed
unchanged, and owned fixture cleanup passed. The temporary reader workflow is
retired with the final result publication.

These focused results are separate from the surface-presence validator above.
Hosted identity/RLS, real QMD collections/models, registered MCP-client
interoperability and the full application remain unverified by these scopes.

## Next Test Additions

- Unit tests for AFS validation, hybrid ranking, chunking, and scope checks.
- Contract tests for `/api/v1/*` response envelopes.
- Integration tests for Supabase RLS and GitHub webhook signature validation.
- Eval cases for cleanup-agent routing, provenance preservation, and no direct default-branch writes.
- CLI/MCP smoke tests against a running local Next server.
