# vAFS
Last updated: 2026-10-30

vAFS is the Virtual Agentic FileSystem: productized infrastructure for AFS-compatible `agents-fs` GitHub repositories.

## What This Repo Implements

- Next.js 16 app and route handlers for the VAFS console and public API.
- An imported AFS draft contract in `lib/vafs/afs-contract.ts`; the [AFS repository](https://github.com/alvarovillalbaa/afs) owns the standard.
- Supabase-first metadata model for users, workspaces, memberships, OAuth grants, repo connections, jobs, and audit events.
- GitHub `agents-fs` source-of-truth model with branch-and-PR writeback.
- Hosted retrieval contracts for metadata, keyword/vector adapters and reranking hooks; their external integration remains unfinished.
- A file-based local CLI bridge with explicit-root metadata, real `rg`, optional configured QMD keyword retrieval, fresh content hashes and line/byte provenance. See [local retrieval](docs/local-retrieval.md).
- A separate read-only local MCP stdio entrypoint for that reader, without a hosted API. See [local MCP](docs/local-mcp.md); its focused functional checks remain pending approval.
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

Local checkout commands require installed Node and `rg`, with no application
dependency installation. Supply the checkout explicitly:

```bash
node bin/vafs.mjs local index --root /path/to/agents-fs
node bin/vafs.mjs local search "hybrid retrieval" --root /path/to/agents-fs
node bin/vafs.mjs local get knowledge/retrieval.md --root /path/to/agents-fs
```

Local retrieval reads literal files and reports each signal's availability.
It does not upload a checkout, create a hosted workspace or manufacture search
results from the demo catalogue. Raw intake is excluded unless requested.
QMD collection setup and live QMD acceptance remain separate prerequisites.
The new focused checks are authored but have not run; source inspection is not
functional acceptance.

MCP stdio bridge:

```bash
VAFS_API_URL=http://127.0.0.1:3000 node bin/vafs-mcp.mjs
```

For a trusted local checkout, select the separate local server explicitly:

```bash
node bin/vafs-local-mcp.mjs --root /path/to/agents-fs
```

It exposes metadata index, literal search and exact page reads. Raw intake is
excluded and QMD is disabled. It does not connect to the hosted API, change
account access or implement sync/write tools. Source/static evidence and
pending protocol/stdio acceptance are kept separate in [local MCP](docs/local-mcp.md).

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

`VAFS_AUTH_REQUIRED` controls the initial header-based scope check. That interim
`x-vafs-scopes` behavior does not establish verified OAuth identity or workspace
ownership. It has not been changed by the local reader. Hosted Auth/access and
external-service acceptance remain unfinished.

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

The hosted implementation exposes contracts, route handlers, HTTP-backed CLI
and MCP, schema and worker boundaries. Its inspected search remains
fixture-backed; credentialed Supabase/GitHub/AWS/OpenAI behavior and production
access enforcement are unverified. Do not treat these surfaces as completed
integrations. The local file bridge has an independent explicit-root contract
and pending focused proof recorded under `docs/`.
