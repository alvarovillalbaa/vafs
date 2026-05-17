# Testing
Last updated: 2026-05-17

## Current Gates

```bash
npm run lint
npm run typecheck
npm run test
```

`npm run test` currently validates that the required VAFS surfaces exist and that README documents the public route contract.

## Next Test Additions

- Unit tests for AFS validation, hybrid ranking, chunking, and scope checks.
- Contract tests for `/api/v1/*` response envelopes.
- Integration tests for Supabase RLS and GitHub webhook signature validation.
- Eval cases for cleanup-agent routing, provenance preservation, and no direct default-branch writes.
- CLI/MCP smoke tests against a running local Next server.
