# Published QMD package metadata inspection

Status: preparation only. No job or QMD integration result is claimed.

The next local-retrieval gap is actual QMD keyword-search interoperability.
The [vAFS baseline](https://github.com/alvarovillalbaa/vafs/tree/f1d8515ac18d128af2b622ae2a76ef1b09d2af07)
already invokes `qmd search` and reconciles its paths to current local bytes.
The accepted Inspector journey does not exercise this optional leg.

The pinned [QMD source manifest](https://github.com/tobi/qmd/blob/86d2365d17fc682e491c2c53d1e4a884aee8682a/package.json)
declares `@tobilu/qmd` 2.8.3 and Node >=22. Its committed lock differs from
that manifest. A source tag alone cannot attest the published tarball integrity,
transformed release scripts or a resolved installed dependency tree. Local
registry reads failed DNS; no permission boundary was bypassed and no package
archive, native binary or model was downloaded.

## Concrete inspection scope

One temporary public Ubuntu job, capped at five minutes, will inspect only the
official registry's exact-version JSON metadata for QMD 2.8.3 and its declared
SQLite/vector/llama dependency version anchors. A range anchor is not a resolved
dependency version. Preserve the original declared range and report that limit.

The operational script is `tests/scripts/inspect-qmd-package-metadata.py`.
The inactive workflow example is
`qmd-package-metadata.workflow.yml.example`. Review their concrete source before
activating a separate owned QA branch. Retain bounded original response bytes,
hashes and gzip data before parsing or applying success gates, including failed
responses. Validate package names, versions, registry URLs and integrity fields.
Report published scripts, engines, dependencies and optional packages without
executing them. Preserve the runner's original HOME.

This phase does not install packages, execute QMD, compile native bindings,
download archives/binaries/models, call a provider, use application credentials,
touch a private corpus or run existing suites. A successful metadata inspection
is preparation evidence only. Any actual tool installation and first keyword
journey require a separately reviewed script and bounded activation. Existing
owner approval covers both phases; no paid service or account is proposed.

## Runtime gate after inspection

Establish a supported install strategy that enables actual SQLite/vector
bindings while suppressing optional llama binary/model downloads. Generate a
tool-only lock from the verified published package and freeze it before use;
do not modify vAFS's application package or lock. Keyword search uses collection
FTS, with no embedding, semantic query or reranking commands.

The eventual Q01 journey will use an explicitly selected disposable root,
owned XDG config/data/cache directories and the original operator HOME. Check
that no ancestor `.qmd` config can shadow isolation. vAFS preserves those XDG
paths but strips arbitrary `QMD_*` and `INDEX_PATH` overrides. Actual QMD
candidates must be observed before asserting eligible/current-byte provenance
and exclusion of missing, raw and foreign candidates. This is not an Inspector,
GUI, private-corpus, hosted or model-quality check.
