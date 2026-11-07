# First real QMD keyword journey

Status: authored preparation, unrun. Published-package and native-binding gates
remain separate from the accepted Inspector and earlier reader/MCP receipts.

Q01 runs the actual `qmd collection add`, direct keyword `qmd search` controls
and `node bin/vafs.mjs local search` against six small authored Markdown files.
The collection spans an explicit selected root plus a foreign sibling. It
includes a live eligible page, a page edited after indexing, a removed page and
raw intake. Titles and paths do not accidentally supply the rare query token.

The first direct control must establish that QMD actually indexed and returns
the intended candidates. After the first vAFS search, edit one eligible page's
title/body and remove another without updating QMD's index. A second direct
control establishes the stale candidates actually returned by the producer.
Then vAFS must retain current-file metadata, bytes and hashes; the edited page
may legitimately rank through QMD with no current literal matches. Raw, foreign
and missing candidates must not become eligible result rows.

Observe the producer's actual full-path representation. vAFS supports absolute
paths and explicit `./` paths relative to its exact canonical operator-home
cwd. Missing documents may instead become `qmd://` fallbacks; reject them and
report that observed branch rather than claiming an unobserved filesystem-error
path. Do not normalize unsupported identifiers to make the journey pass.

Use the existing runtime unchanged. The new driver belongs at
`tests/integration/local-qmd-keyword.mjs`; operational supervision belongs under
`tests/scripts/`. Fixtures are disposable authored data with real CLI,
filesystem and SQLite boundaries; no fake own services or provider outputs.

`tests/scripts/run-local-qmd-checks.mjs` owns one public Ubuntu 24.04 job,
capped at ten minutes with Node 26.13.0. Work is limited to 420 seconds and
clamped by the earliest job-step clock, reserving 90 seconds for cleanup and
30 seconds for startup/output margin. Its inactive workflow example is
`local-qmd-keyword.workflow.yml.example`. Four exact required tool roots are
QMD 2.8.3, better-sqlite3 13.0.3, sqlite-vec 0.1.9 and its Linux x64 package
0.1.9; transitive node-llama-cpp stays at 3.20.0. All five integrity pins come
from the separately accepted published-package receipt.

The supervisor must first verify the official published package provenance,
freeze an isolated tool-only lock and admit working SQLite/vector bindings.
Disable lifecycle scripts and omit optional llama packages; explicitly preserve
the required vector platform package only after its metadata is reviewed. Keep
original HOME, owned XDG config/data/cache and bounded scratch/temp paths. Fail
if a discoverable ancestor `.qmd` config could shadow isolation.

The pinned producer stores [collection config](https://github.com/tobi/qmd/blob/86d2365d17fc682e491c2c53d1e4a884aee8682a/src/collections.ts)
under owned XDG config and its [SQLite index](https://github.com/tobi/qmd/blob/86d2365d17fc682e491c2c53d1e4a884aee8682a/src/store.ts)
under owned XDG cache. Its [model runtime](https://github.com/tobi/qmd/blob/86d2365d17fc682e491c2c53d1e4a884aee8682a/src/llm.ts)
is lazy for these keyword commands. This source inspection does not attest
installed archive contents or host-wide writes/network behavior.

Retain original command bytes before assertions, source identities, fixture
snapshots before and after intentional edits, child closure observations and
owned teardown. An external service kill does not establish cleanup. A failing
first execution remains a failure and requires a concrete source-supported
repair before any further attempt.

This journey does not invoke embeddings, semantic query, reranking, models,
private files, hosted APIs, MCP/Inspector, browser/UI or existing suites. No
application dependency or lock changes, account or paid service is proposed.
Standing owner approval covers the focused checks and temporary free CI; local
Storage Guard continues to prohibit local installations and runtime tests.
