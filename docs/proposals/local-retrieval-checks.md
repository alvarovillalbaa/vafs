# Local file retrieval checks

Status: concrete source and authored checks prepared; execution requires explicit
owner approval under supplied AGENTS.md §7. Earlier projects' approvals do not
apply. No CI, dependency, provider configuration or database change is proposed.

## Scope for approval

Run the four explicitly listed Node test files against the published candidate,
using the already installed Node and `rg` binaries. All fixtures are authored
T2 data in uniquely named temporary directories. The reader never receives a
personal/company corpus for these checks. Every fixture has task-owned cleanup;
no pre-existing database, checkout, index or data file is changed.

Expected scope is **63 cases**:

| File | Cases | Meaningful boundary |
| --- | ---: | --- |
| `tests/unit/local-corpus.test.mjs` | 17 | Explicit root, normal ignore behavior, raw opt-in, metadata, exact bytes/hash, symlinks and corpus/file limits |
| `tests/unit/local-retrieval.test.mjs` | 16 | Real `rg`, literal queries, byte/line provenance, metadata/folder ranking, QMD protocol fixtures and root reconciliation |
| `tests/unit/local-cli.test.mjs` | 17 | Actual command integration, offline configuration, safe export/get/search, native entry and mocked remote compatibility |
| `tests/unit/local-process.test.mjs` | 13 | Literal stdin/argv, environment isolation, deadlines/cancellation, owned descendants, private atomic/no-clobber exports |

The exact command is:

```sh
node --test --test-concurrency=1 --test-reporter=tap \
  tests/unit/local-corpus.test.mjs \
  tests/unit/local-retrieval.test.mjs \
  tests/unit/local-cli.test.mjs \
  tests/unit/local-process.test.mjs
```

The existing runtime was attributed in the same authoring shell as Node
22.23.3. No package installation or build is required. This is a new functional
check scope, separate from the repository's existing surface-presence validator.
All 63 cases must pass without skips/TODOs; failures remain visible and must not
be hidden by retries or removed assertions.

## Resources and proof limits

Corpora contain bounded local Markdown/text fixtures. Limit cases use roughly
17 MiB of disposable content and at most 1,001 tiny files. Actual child processes
are existing `rg`/Node plus a scripted QMD protocol fixture. The descendant
deadline fixture is finite, records its owned PID and cleans it on failure.
Remote API cases mock fetch and never contact an HTTP server. Tests remove only
their own temporary directories/processes.

No browser, server, database, CI job, real QMD index, model download/inference,
provider call, package installation, production configuration, secret, personal
corpus, writeback, payment or paid plan is involved. Scripted QMD output does
not establish acceptance against a real installed QMD version/collection.
Passing local checks cannot establish hosted Auth, GitHub/Supabase/AWS/OpenAI,
MCP local-tool integration or the complete product's end-to-end readiness.

After approval, retain exact source hashes, runtime attribution, case totals and
bounded failure/pass evidence in the owning `docs/results/` folder. Keep the
full all-project goal active while its other requirements remain unfinished.
