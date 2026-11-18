# Local MCP focused checks — pending approval

30 October 2026. **34 authored cases; all unrun.** This is a new scope under
the supplied AGENTS.md section 7. The separately pending 63-case local reader
proposal and other projects' approvals do not authorize it.

## Exact execution

Use the existing Node and ripgrep installations, with no installation, build,
server, real client configuration or CI. Run exactly one file, no glob:

```sh
node --test --test-reporter=tap --test-concurrency=1 --test-timeout=10000 tests/unit/local-mcp.test.mjs
```

The preparation environment reports Node 22.23.3 and ripgrep 15.2.0. Recheck
runtime/binary identity in the same execution shell before running. The runner
has a separate 120-second process cap; Node's ten-second case timeout is not a
global process deadline. Expected discovery is exactly 34 unique passing names,
with zero failure, cancellation, skip or TODO outcomes. Preserve failures.

The [source seal](../results/2026/10-30/local-mcp-source.json) owns every full
case name and selected source/input fingerprint. Verify those before and after.
Use the exact approved published source, not an unrelated later main or the
old 63-case reader snapshot. Preserve all unrelated working files.

## What the cases exercise

The one T2 test file exercises the actual local MCP module with modern and
legacy protocol messages. Actual reader cases use temporary authored Markdown,
real existing `rg`, independent content digests and returned-byte-range comparisons.
Controlled JS reader seams hold/reject work to inspect root ownership,
cancellation, busy handling and finite errors; they are not actual inference.

Protocol cases cover discovery, capabilities, legacy initialization, malformed
notifications and partial modern metadata, ping, IDs/shape, method/version errors,
and refusal of root/raw/QMD/export/hosted overrides. Reader cases cover exact
BOM/CRLF/Unicode content, metadata-only index, fixed-string matches, fresh reads,
path/ignore/symlink boundaries and unchanged authored source bytes. Ownership
cases cover pre/post-read root replacement, busy/cancel/stale cancel/close and
complete-response size failure. Stream cases cover stdio-only responses,
malformed JSON/UTF-8 recovery, oversized/incomplete frames, EOF, four outstanding
writes, startup argument refusal and write failure.

Streams are authored in-memory Node streams, not a registered MCP client. The
EOF case establishes suppression of a buffered result; actual OS-child shutdown
and the thirty-second retrieval/five-second write deadline durations are not
measured by these cases. No full MCP conformance or native-client claim follows.

Only this Node test runner and bounded existing `rg` child processes are needed.
No shell command supplied by a tool caller, HTTP request, app server, browser,
QMD index/model, provider/model call, private corpus, account, database, schema,
Auth/configuration change, dependency, CI, deployment or paid action is included.

## Evidence and cleanup

Temporary fixtures contain independently authored text and directories only.
Each test verifies its created parent directory's device/inode before removing
that owned tree. Recursive cleanup does not follow symlink entries; created
fixture targets stay inside that identity-checked owned tree. Cleanup never
deletes a personal checkout or resolves a conflict by deleting unknown files.
The large-response case uses an in-memory string, not a large on-disk corpus.

Record approval, exact source/arguments, Node and rg identities, timestamps,
exit/signal, TAP/stdout/stderr hashes and actual names/counts in owning results.
Remove only identity-checked operation-owned temporary copies after recording.
On a failure, retain evidence; a bounded repair may rerun the same approved cases
with updated source hashes. New cases or broader execution require new approval.

A pass would establish this focused protocol/reader/stream contract only.
Hosted identity/integrations, real QMD, native client interoperability, actual
child-process termination under transport failure and the wider vAFS/portfolio
remain separate unfinished acceptance. No local storage policy is bypassed.
