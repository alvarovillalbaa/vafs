# Local AFS retrieval

Status: implementation and focused checks are being prepared. No functional
check, personal-corpus scan, QMD invocation or provider call has run for this
increment. The new Node modules form a file-based bridge over a deliberately
selected local checkout. They do not create a new filesystem or move AFS truth
away from its existing Markdown files and owning repository.

## Commands

```sh
node bin/vafs.mjs local index --root /path/to/agents-fs
node bin/vafs.mjs local search "release decisions" --root /path/to/agents-fs
node bin/vafs.mjs local get knowledge/release-decisions.md --root /path/to/agents-fs
node bin/vafs.mjs local search "release decisions" --root /path/to/agents-fs --qmd-collection personal
node bin/vafs.mjs local index --root /path/to/agents-fs --output /separate/export/local-index.json
```

`--root` is required. No command substitutes the current directory, home,
another workspace or a fixture catalogue. `--include-raw` explicitly includes
raw intake; its default is exclusion. Search accepts `--limit` from 1 to 100.
Local commands produce JSON without reading the hosted API URL or token.
They do not require a Next server, Supabase, AWS or an HTTP connection.

The index is derived metadata, not another source of truth. It contains paths,
file/folder titles, descriptions, dates, hashes and byte counts, without body
text. `--output` must resolve outside the selected root. New exports use private
0600 permissions and atomic no-clobber publication. Identical existing bytes
return `unchanged`; different files and symlinks are preserved. Existing file
permissions are not rewritten, parents are not created and there is no force
option. A page read returns its exact decoded text and hash from a fresh bounded
read. Neither index export nor retrieval changes the checkout.

Page reads use the same full bounded inventory as indexing so `.gitignore`,
raw eligibility and vetted folder metadata stay consistent. A page in an
over-budget corpus therefore requires selecting a smaller explicit root.

## Corpus and metadata

The reader uses actual `rg --files` enumeration with its config disabled and
normal ignore behavior. It filters Markdown, MDX and text files; hidden files,
dependency/build/cache directories and descendant symlinks are excluded. File
reads additionally validate the canonical-root boundary and regular file type,
use non-following/nonblocking opens, and check for changes while reading.
Absolute or traversing page paths are rejected. An explicitly supplied root
can itself resolve to its canonical directory.

Limits are 1,000 documents, 512 KiB per file and 16 MiB total. Strict UTF-8 text
and original-byte SHA256 keep excerpts tied to what was actually read. Skipped
files have explicit reasons; limits and failures do not silently become a
successful empty result.

Files are captured and validated individually. The result is not an atomic
snapshot of every file in a concurrently edited checkout. The process runner
uses owned process groups on the supported POSIX target, bounded output and
referenced deadlines; cancellation also closes inherited pipes. Child tools
receive an allowlisted filesystem/runtime environment without application
tokens, preload hooks or config-trust overrides.
Path inspection and export-parent resolution are separate filesystem operations;
the operator-trusted local filesystem boundary does not establish an atomic
read/write transaction against hostile directory replacement.

Conservative scalar frontmatter supplies title, description and date metadata.
A heading/paragraph can supply missing descriptive fields; vetted README/INDEX
files supply folder context. Unsupported YAML is not executed or treated as a
general YAML parser. Filesystem modification time is explicitly attributed as
filesystem metadata rather than a human-authored date. Existing AFS paths are
read as found; this bridge does not migrate a workspace or certify its standard
version.

## Retrieval signals and provenance

Metadata matches and actual fixed-string, case-insensitive `rg` matches are
separate retrieval legs. Grep runs on the already-vetted bytes through stdin;
it does not reopen result paths. Line and byte offsets are checked against
those bytes. Result excerpts and match counts are bounded. Reciprocal-rank
fusion combines leg rankings; deterministic path ordering resolves display
ties. Scores are retrieval scores, not probabilities or evaluation results.

The optional QMD leg invokes a pre-existing named collection using `qmd search`
with JSON and full-path output. That is QMD's keyword search interface, as
described by its [official CLI documentation](https://github.com/tobi/qmd).
This bridge does not install QMD, create/update its index, generate embeddings,
download models or invoke semantic generation/reranking. It runs from the
operator's home with a bounded environment, without adopting checkout trust
overrides. Requested but unavailable QMD fails explicitly. Without a collection
option, the result records that leg as disabled.

Only QMD paths that reconcile to the selected, vetted inventory may contribute
a candidate rank. Missing/stale/foreign paths are reported and excluded. QMD
titles or snippets never replace current local bytes. Its indexed ranking may
still be stale; the returned local hash and match offsets describe current
content, not the contents of an independently maintained QMD index.

QMD's full-path renderer may emit `./` paths for files below its working
directory. The bridge resolves only that explicit form against the exact
canonical operator-home cwd used for the subprocess, then applies the same
root/inventory checks as for absolute paths. Bare relative identifiers and
`qmd://` fallbacks are excluded. This follows the inspected [QMD producer](https://github.com/tobi/qmd/blob/86d2365/src/cli/qmd.ts),
not an assumption that full-path JSON always contains absolute strings.

Local envelopes use their own versioned schemas:

- `vafs-local-index-v1`: metadata-only document index and explicit skipped paths.
- `vafs-local-page-v1`: a freshly read local document.
- `vafs-local-search-v1`: the query, root fingerprint, ranked results, per-leg
  status and bounded provenance.

They do not claim a hosted workspace membership, Git commit identity, OAuth
scope, vector score or verified official QMD/AFS integration. Local permission
comes from the operator's selected checkout. Hosted route/worker and MCP
contracts retain their separate ownership and acceptance requirements.

## Runtime and proof boundary

The executable uses existing Node facilities and installed `rg`; package and
lockfile changes are unnecessary. QMD is optional and was not found on the
implementation host. No QMD index/model acceptance can be inferred from an
authored protocol fixture. Backend/domain checks require the owner's separate
approval under supplied AGENTS.md §7. Source syntax, import and whitespace
checks do not establish functional or hosted acceptance.
