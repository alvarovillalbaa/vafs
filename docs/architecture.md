# vAFS Architecture
Last updated: 2026-10-30

## Ownership

| Layer | Owns |
| --- | --- |
| AFS | Standard, folder contract, root files, path semantics |
| vAFS | App, API, CLI, MCP, sync, indexing, OAuth, access control |
| agents-fs | User and workspace source-of-truth knowledge repositories |
| Supabase | Users, workspaces, membership, OAuth grants, repo metadata, jobs, audit |
| S3 Vectors | Derived vector chunks for retrieval |
| plugins | Agent-facing skills, templates, recipes, and usage rules |

## Data Flow

1. User authenticates through Supabase.
2. User connects GitHub via login plus GitHub App installation.
3. vAFS discovers or creates `agents-fs`.
4. GitHub webhooks enqueue sync jobs.
5. Supabase Edge workers fetch changed files, chunk content, and upsert S3 Vectors.
6. API, CLI, and MCP retrieve through hybrid search.
7. Cleanup agent writes only through branch and pull request.

## Retrieval

Hosted VAFS uses:

- title/date/description metadata
- BM25-style keyword scoring
- S3 Vectors semantic recall
- reranking hooks

The local CLI reader uses real `rg` against a trusted explicit checkout. The
separate [local MCP stdio entrypoint](local-mcp.md) reuses its corpus/page/search
functions, with a pinned startup root and no write tools. Raw intake and QMD
remain disabled in that MCP profile. Its functional checks are approval-pending;
source implementation is not real-client acceptance. The existing hosted MCP
bridge and access behavior are unchanged. Hosted Supabase Edge workers do not
run arbitrary shell commands.

## Write Policy

All writes that touch `agents-fs` are proposed as branch-and-PR operations. Direct default-branch commits are not part of the default policy.
