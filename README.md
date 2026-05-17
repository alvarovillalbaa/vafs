# vAFS
Last updated: 2026-05-17

vAFS is the Virtual Agentic FileSystem: productized infrastructure for AFS-compatible `agents-fs` GitHub repositories.

## What This Repo Implements

- Next.js 16 app and route handlers for the VAFS console and public API.
- AFS contract imported into `lib/vafs/afs-contract.ts` from the local standard at `/Users/alvarovillalba/Desktop/afs`.
- Supabase-first metadata model for users, workspaces, memberships, OAuth grants, repo connections, jobs, and audit events.
- GitHub `agents-fs` source-of-truth model with branch-and-PR writeback.
- Hybrid retrieval: metadata, BM25, S3 Vectors adapter, rerank hooks, and local `rg` mode reserved for CLI/MCP.
- OpenAI Agents SDK cleanup-agent contract in `lib/vafs/cleanup-agent.ts`.
- CLI and MCP bridge in `bin/vafs.mjs` and `bin/vafs-mcp.mjs`.
- Exportable skills in `packages/skills/vafs-use` and `packages/skills/vafs-devs`.

Supabase is intentionally not document storage. Canonical knowledge, raw inputs, root files, and AFS folders live in GitHub `agents-fs`.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
```

CLI examples:

```bash
node bin/vafs.mjs health
node bin/vafs.mjs workspaces
node bin/vafs.mjs search "hybrid retrieval" --workspace ws_personal_alvaro
node bin/vafs.mjs get ws_personal_alvaro knowledge/vafs-product.md
node bin/vafs.mjs sync ws_personal_alvaro
node bin/vafs.mjs cleanup ws_personal_alvaro "Compile raw retrieval notes"
```

MCP stdio bridge:

```bash
VAFS_API_URL=http://127.0.0.1:3000 node bin/vafs-mcp.mjs
```

## API

The API is implemented with Next route handlers:

- `GET /api/v1/workspaces`
- `GET|POST /api/v1/search`
- `GET|PUT /api/v1/files`
- `POST /api/v1/raw`
- `POST /api/v1/sync`
- `GET|POST /api/v1/cleanup-runs`
- `GET|POST /api/v1/github/repos`
- `GET /api/v1/oauth/authorize`
- `POST /api/v1/oauth/token`
- `GET /api/v1/health`
- `GET|POST /api/mcp`

Set `VAFS_AUTH_REQUIRED=true` to enforce scope checks through `x-vafs-scopes` while the Supabase OAuth server is being wired.

## Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=

AWS_REGION=
AWS_S3_VECTOR_BUCKET=
AWS_S3_VECTOR_INDEX=

OPENAI_API_KEY=
VAFS_CLEANUP_MODEL=gpt-5.5
VAFS_AUTH_REQUIRED=false
```

## Repository Layout

- `app/` - Next app, docs, and API route handlers.
- `lib/vafs/` - AFS contract, demo repository, service layer, hybrid search, sync, and cleanup agent contracts.
- `bin/` - CLI and MCP stdio bridge.
- `supabase/` - migrations and Edge Function worker entrypoints.
- `packages/skills/` - exportable `vafs-use` and `vafs-devs` skills.
- `docs/` - architecture, API, deployment, and test documentation.

## Current Integration State

The implementation is credential-safe. It exposes real contracts, route handlers, CLI, MCP, schema, and worker boundaries, but external services are mocked until Supabase, GitHub App, AWS, and OpenAI credentials are configured.
