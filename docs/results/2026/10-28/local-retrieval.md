# Local file bridge source receipt

Date: 2026-10-28. Inspected base:
[`1f243e494f14d746425192ffed77b48333ea3509`](https://github.com/alvarovillalbaa/vafs/tree/1f243e494f14d746425192ffed77b48333ea3509).
The [owning Notion brief](https://app.notion.com/p/3a5a1ee8bd0680c1a696d7e708f1f601)
directly requests QMD/grep/file-and-folder metadata retrieval and an agent-facing
CLI. Its returned snapshot is dated 2026-10-15; the direct requirement list was
inspected, without treating its longer research section as an activated design.
The existing architecture already reserves shell retrieval for trusted local
CLI/MCP and forbids it in hosted workers.

## Implemented source

- Explicit-root metadata indexing, fresh page reads, normal ignore behavior,
  raw opt-in, bounded regular-file decoding and original-byte hashes.
- Actual `rg` retrieval over vetted stdin, line/byte validation, folder metadata
  and deterministic rank fusion. A pre-existing QMD collection can contribute
  candidates without replacing current local file text.
- QMD's documented absolute/`./` full-path forms reconcile against the exact
  canonical subprocess cwd and selected inventory. Stale/foreign identifiers
  are excluded with reasons; the protocol fixture does not stand in for a real
  installed QMD index.
- Native Node entry, complete local command integration, private atomic index
  exports outside the checkout and a corrected remote-search parser that keeps
  the first and repeated query tokens. Existing remote routes/methods/payloads
  remain; errors no longer print private upstream bodies.
- Owned POSIX process groups, referenced deadlines, bounded stdout/stderr and
  a restricted child environment. An independent review identified inherited
  descendant pipes as a deadline hole; the source now closes those pipes and
  stops its owned group. A finite regression fixture is authored.

The [local contract](../../../local-retrieval.md) records formats, byte limits,
per-file snapshot semantics and the concurrent-directory boundary. No hosted
API, Supabase/Auth policy, MCP tool, package, lockfile, schema, credential or
provider configuration is changed. No corpus source is written or migrated.

## Verification and pending execution

Only source syntax, imports, read-only independent review and whitespace/link
checks are claimed for this checkpoint. The same authoring shell attributed
Node 22.23.3 on Darwin arm64. Agents also performed syntax-only checks using
Node 24/26. No product module was imported or command invoked by those checks.

All **63 focused cases are authored and unexecuted**: 17 corpus, 16 retrieval,
17 CLI and 13 process/export. The exact [approval proposal](../../../proposals/local-retrieval-checks.md)
uses disposable authored files, real installed Node/rg, a scripted QMD fixture,
mocked remote fetch and no browser/server/database/CI/model/provider call.
Other projects' closed check approvals are not reused.

Installed `rg` was located; QMD was not found on the authoring PATH. No package
or model installation was attempted. A bounded Vercel project-name lookup for
`vafs` returned no match in the selected team; that is not a global hosting
absence claim. No new hosted project or deployment was created. Live QMD,
hosted authentication, GitHub/Supabase/AWS/OpenAI integrations, local MCP tools
and full application acceptance remain unfinished.

The selected-text working bundle contains no Git history or dependency
environment. Canonical source/evidence belong to this repository, not the
local handoff. The full portfolio objective remains active.
