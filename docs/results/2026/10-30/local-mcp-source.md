# Local MCP source delivery

30 October 2026. Source implementation and static review complete; 34 focused
functional cases remain authored and unrun, pending their separate approval.

## Requirement and change

The vAFS brief requires MCP/CLI/API access. Existing personal main
`9e05d6e918789e6c4f81b74d04740293250333ce` provides an actual local CLI reader,
but `bin/vafs-mcp.mjs` exclusively calls the hosted HTTP API. The owning
architecture explicitly permits local CLI/MCP retrieval. The additive local
entrypoint closes that interface gap without presenting hosted fixtures as
real local knowledge or replacing the wider persistent-service objective.

`bin/vafs-local-mcp.mjs` starts a separate read-only stdio server.
`bin/local/mcp.mjs` binds an operator-selected root and reuses the existing
corpus/document/search functions. Index, metadata/real-rg search and exact page
reads preserve the CLI envelopes and provenance. Raw intake and QMD are fixed
off. No root override, hosted fallback, write or export operation is exposed.
The [contract](../../../local-mcp.md) records modern/legacy protocol handling,
root identity, cancellation, resource bounds and filesystem limits.

The original hosted MCP, all reader modules, package/lockfile, Auth/security
policies, schemas, provider settings, CI and deployment configuration are
unchanged. No MCP server was installed in a client or started against a corpus.
No AFS content was read, rewritten, moved or ingested by this source preparation.

## Review and static evidence

Independent source review confirmed this is an existing explicit interface
requirement. It found and corrected malformed legacy-notification advancement,
partial modern metadata falling back to legacy state, null parameter coercion,
the timeout-abort error race, post-read root identity checking and error-write
queue accounting. These corrections came from inspection, not observed passing
behavior. The contract retains EOF response suppression, non-preemptable OS I/O
and the non-atomic hostile-directory boundary rather than claiming stronger
guarantees than the unchanged reader supplies.

The one new T2 file has 34 unique literal cases. Node 22.23.3 syntax checking and
independent TypeScript AST syntax/count review passed without importing product
or test registration modules. Source imports are only built-ins and the selected
unchanged reader closure. The [seal](local-mcp-source.json) records every selected
input/mode/size/hash and all case names. Seven executable/test modules passed
syntax checking, 29 import records resolved to built-ins or selected local
source, and ten relative Markdown links resolved against the source tree.
JSON and whitespace checks passed. No functional test, app build,
server, browser, QMD/model/provider call, installation or CI ran.

The EOF case covers buffered-result suppression, not measured rg-child shutdown.
The authored write-failure case does not measure the five-second write timeout.
Actual client interoperability, OS-level shutdown/deadline behavior and platform
compatibility remain open. The new [check proposal](../../../proposals/local-mcp-checks.md)
does not inherit the old 63-case reader approval request.

## Delivery boundary

Preparation uses a bounded selected-text bundle: nine original inputs were
verified against the current untruncated 940-leaf GitHub tree before copying.
No Git history, dependency environment, user data or private corpus was copied.
The bundle is not a full checkout or canonical AFS ingestion.

Published source is
[`ac3d57c077c7fc728ae18274e5c3a84107d9f552`](https://github.com/alvarovillalbaa/vafs/commit/ac3d57c077c7fc728ae18274e5c3a84107d9f552).
The conditional non-force main update preserved concurrent-head protection.
An untruncated readback matched all 947 paths, modes, types and blob SHAs against
the original tree plus the exact nine-file overlay: two documentation changes,
seven additions, 938 unrelated leaves preserved and none removed. Main and the
immutable proposal read back exactly; zero Actions runs and no active workflow
files were observed. The [machine receipt](local-mcp-publication.json) retains
base/source trees, changed identities and limits.

The first readback wrapper mistakenly parsed file Markdown as API JSON. Its
handling was corrected and immutable reads repeated successfully; no product,
test or assertion changed. This was a readback-recording error, not a test run.
The separate 34-case question was then issued once against the immutable
published proposal. All cases remain unrun until its answer; the fourteen sealed
inputs remain unchanged by this result-only publication follow-up.

The full vAFS and portfolio goal remain unfinished. Hosted Auth/persistence,
integration activation, real QMD and wider architecture decisions remain their
own gates. This local entrypoint needs no Vercel or Supabase provisioning.
